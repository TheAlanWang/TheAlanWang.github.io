// Interactive figure for the Prefill and Decode post. Mounts into [data-pd-demo].
// One forward step = read all weights from GPU memory + do the math for N tokens.
// Rough H100 numbers, 8B model in FP16. Reading and math overlap, so the step takes
// whichever is longer. The KV cache read is left out to keep the picture simple.
(function () {
  const ZH = document.documentElement.lang.startsWith("zh");
  const T = (zh, en) => (ZH ? zh : en);
  const WEIGHT_GB = 16, BW_TBS = 3.35, TFLOPS = 990;
  const READ_MS = (WEIGHT_GB / (BW_TBS * 1000)) * 1000;          // ~4.8 ms, fixed per step
  const MATH_MS_PER_TOKEN = ((2 * 8e9) / (TFLOPS * 1e12)) * 1000; // ~0.016 ms per token
  const PRESETS = [
    { n: 1, label: T("Decode，1 个请求", "Decode, 1 request") },
    { n: 8, label: T("Decode，8 个请求", "Decode, 8 requests") },
    { n: 64, label: T("Decode，64 个请求", "Decode, 64 requests") },
    { n: 1000, label: T("Prefill，1,000 个 token 的 prompt", "Prefill, 1,000-token prompt") },
  ];
  const MAX_N = 4096;
  const fmt = (ms) => (ms >= 10 ? ms.toFixed(0) : ms >= 1 ? ms.toFixed(1) : ms >= 0.1 ? ms.toFixed(2) : ms.toFixed(3)) + " ms";

  function mount(el) {
    let n = 1;
    el.innerHTML =
      '<div class="qd-row pd-presets"></div>' +
      '<label class="pd-slider"><span>' + T("这一步的 token 数：", "Tokens in this step: ") + '<b class="pd-n"></b></span>' +
      '<input type="range" min="0" max="' + Math.log2(MAX_N) * 10 + '" step="1" aria-label="' + T("这一步的 token 数", "Tokens in this step") + '"></label>' +
      '<div class="pd-bars">' +
      '<div class="pd-bar"><span>' + T("读权重", "Read weights") + '</span><div class="pd-track"><i class="pd-read"></i></div><b class="pd-read-t"></b></div>' +
      '<div class="pd-bar"><span>' + T("计算", "Math") + '</span><div class="pd-track"><i class="pd-math"></i></div><b class="pd-math-t"></b></div>' +
      "</div>" +
      '<div class="pd-stats">' +
      '<div><span>' + T("这一步耗时", "Step time") + '</span><b class="pd-step"></b></div>' +
      '<div><span>' + T("每个 token 耗时", "Time per token") + '</span><b class="pd-per"></b></div>' +
      '<div><span>' + T("计算单元忙碌", "Math units busy") + '</span><b class="pd-busy"></b></div>' +
      '<div><span>' + T("瓶颈", "Bottleneck") + '</span><b class="pd-bn"></b></div>' +
      "</div>" +
      '<p class="qd-key pd-note"></p>' +
      '<p class="qd-hint">' + T("H100 的大致数字：8B 模型、FP16（权重 16 GB），显存带宽约 3.35 TB/s，算力约 990 TFLOPS。读取和计算同时进行，所以一步的耗时取两者中较长的那个。这里没算读 KV cache 的时间。", "Rough H100 numbers: 8B model in FP16 (16 GB of weights), about 3.35 TB/s memory bandwidth and 990 TFLOPS. Reading and math overlap, so a step takes whichever is longer. The KV cache read is left out.") + '</p>';

    const $ = (s) => el.querySelector(s);
    const slider = $("input");
    const presets = $(".pd-presets");
    PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "qd-btn"; b.textContent = p.label; b.dataset.n = p.n;
      presets.appendChild(b);
    });

    function render() {
      const math = n * MATH_MS_PER_TOKEN, step = Math.max(READ_MS, math);
      const memBound = READ_MS >= math;
      $(".pd-n").textContent = n.toLocaleString();
      $(".pd-read").style.width = (READ_MS / step) * 100 + "%";
      $(".pd-math").style.width = Math.max((math / step) * 100, 0.6) + "%";
      $(".pd-read-t").textContent = fmt(READ_MS);
      $(".pd-math-t").textContent = fmt(math);
      $(".pd-step").textContent = fmt(step);
      $(".pd-per").textContent = fmt(step / n);
      const busy = (math / step) * 100; $(".pd-busy").textContent = busy < 1 ? "<1%" : Math.round(busy) + "%";
      $(".pd-bn").textContent = memBound ? T("显存带宽", "Memory") : T("算力", "Compute");
      el.classList.toggle("pd-mem", memBound);
      $(".pd-note").textContent = memBound
        ? T("GPU 读了全部 16 GB 权重，只为算 " + n.toLocaleString() + " 个 token。计算 " + fmt(math) + " 就做完了，之后计算单元闲着等显存。Memory-bound。" +
            (n > 1 ? "不过每个 token 现在只花 " + fmt(step / n) + "，而不是 " + fmt(READ_MS) + "：batching 让大家共用一次读取。" : ""),
          "The GPU reads all 16 GB of weights to compute just " + n.toLocaleString() + " token" + (n === 1 ? "" : "s") +
            ". The math is done in " + fmt(math) + ", then the math units sit idle waiting for memory. Memory-bound." +
            (n > 1 ? " Still, each token now costs " + fmt(step / n) + " instead of " + fmt(READ_MS) + ": batching shares one read." : ""))
        : T("这 16 GB 的读取由 " + n.toLocaleString() + " 个 token 共用。现在计算比读取更久，计算单元成了瓶颈。Compute-bound。",
          "The 16 GB read is shared by " + n.toLocaleString() + " tokens. Now the math takes longer than the read, so the math units are the limit. Compute-bound.");
      slider.value = Math.round(Math.log2(n) * 10);
      presets.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.n === n)));
    }

    presets.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { n = +b.dataset.n; render(); }
    });
    slider.addEventListener("input", () => { n = Math.max(1, Math.round(Math.pow(2, slider.value / 10))); render(); });
    render();
  }

  document.querySelectorAll("[data-pd-demo]").forEach(mount);
})();
