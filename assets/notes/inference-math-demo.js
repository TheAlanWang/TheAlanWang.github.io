// Calculator for the Inference Math post. Mounts into [data-im-demo].
// Pick a model, GPU, precision, batch and context; step through the cost model one formula at a time.
// "Hide answers" blurs each result until clicked, so the reader can work it out first.
(function () {
  const ZH = typeof document !== "undefined" && document.documentElement.lang.startsWith("zh");
  const T = (zh, en) => (ZH ? zh : en);

  const MODELS = {
    "8b": { name: "Llama-3-8B", P: 8.03e9, L: 32, qh: 32, kvh: 8, hd: 128 },
    "70b": { name: "Llama-3-70B", P: 70.6e9, L: 80, qh: 64, kvh: 8, hd: 128 },
  };
  // Dense (no sparsity) tensor-core peaks. A100 has no FP8.
  const GPUS = {
    h200: { name: "H200", mem: 141e9, bw: 4.8e12, peak: { 2: 989e12, 1: 1979e12 } },
    h100: { name: "H100", mem: 80e9, bw: 3.35e12, peak: { 2: 989e12, 1: 1979e12 } },
    a100: { name: "A100", mem: 80e9, bw: 2.039e12, peak: { 2: 312e12 } },
  };
  const BATCH_MAX = 512, CTX_MIN = 128, CTX_MAX = 8192;

  // ---- formatting ----
  const n0 = (x) => Math.round(x).toLocaleString("en-US");
  const sig = (x) => (x >= 100 ? n0(x) : String(parseFloat(x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2))));
  const gb = (b) => sig(b / 1e9) + " GB";
  const kb = (b) => sig(b / 1000) + " KB";
  const bil = (p) => sig(p / 1e9) + " B";
  const gf2 = (f) => (f / 1e9).toFixed(2) + " GFLOP"; // two decimals, matching the post (16.06 + 0.54)
  const gflop = (f) => (f >= 1e12 ? sig(f / 1e12) + " TFLOP" : sig(f / 1e9) + " GFLOP");
  const ms = (s) => sig(s * 1000) + " ms";
  const tbs = (b) => sig(b / 1e12) + " TB/s";
  const tf = (f) => n0(f / 1e12) + " TFLOPS";

  function calc(s) {
    const m = MODELS[s.model], g = GPUS[s.gpu], by = s.bytes;
    const peak = g.peak[by];
    const W = m.P * by;
    const kvTok = 2 * m.L * m.kvh * m.hd * by;
    const free = g.mem - W;
    const reqKV = s.ctx * kvTok;
    const dq = m.qh * m.hd;
    // Decode: one token per request, each attending over `ctx` earlier tokens.
    const attnTok = 4 * m.L * s.ctx * dq;
    const decBytes = W + s.batch * reqKV;
    const decFlops = s.batch * (2 * m.P + attnTok);
    const decRead = decBytes / g.bw, decMath = decFlops / peak, decStep = Math.max(decRead, decMath);
    // Prefill: the whole prompt (length = ctx) in one pass; causal attention is about half of n².
    const preFlops = 2 * m.P * s.ctx + 2 * m.L * s.ctx * s.ctx * dq;
    const preBytes = W + reqKV;
    const preRead = preBytes / g.bw, preMath = preFlops / peak;
    return {
      m, g, by, peak, W, kvTok, free, reqKV, dq, attnTok,
      fitTok: free > 0 ? Math.floor(free / kvTok) : 0,
      fitReq: free > 0 ? Math.floor(free / reqKV) : 0,
      decBytes, decFlops, decRead, decMath, decStep,
      decI: decFlops / decBytes,
      limitI: (2 * m.P + attnTok) / reqKV, // intensity as batch → ∞ (KV read grows with batch too)
      balance: peak / g.bw,
      preFlops, preBytes, preRead, preMath, preStep: Math.max(preRead, preMath), preI: preFlops / preBytes,
    };
  }

  // ---- roofline chart (log-log) ----
  function roofline(c) {
    const W = 560, H = 230, l = 54, r = 14, t = 14, b = 40;
    const xMin = -0.5, xMax = 4.3;                       // 10^-0.5 .. 10^4.3 FLOP/byte
    const pT = c.peak / 1e12, yMin = 0, yMax = Math.log10(pT) + 0.45; // 1 .. ~3×peak TFLOPS
    const X = (i) => l + ((Math.log10(i) - xMin) / (xMax - xMin)) * (W - l - r);
    const Y = (tflops) => t + (1 - (Math.log10(tflops) - yMin) / (yMax - yMin)) * (H - t - b);
    const perf = (i) => Math.min(c.peak, c.g.bw * i) / 1e12;
    const iLo = Math.max(Math.pow(10, xMin), 1e12 / c.g.bw); // where the slope enters the chart (1 TFLOPS)
    const pts = [[iLo, perf(iLo)], [c.balance, pT], [Math.pow(10, xMax), pT]];
    const poly = pts.map(([i, p]) => X(i).toFixed(1) + "," + Y(p).toFixed(1)).join(" ");
    const ticks = [1, 10, 100, 1000, 10000].map((i) =>
      `<line class="im-grid" x1="${X(i)}" y1="${t}" x2="${X(i)}" y2="${H - b}"/><text class="im-ax" x="${X(i)}" y="${H - b + 14}" text-anchor="middle">${i.toLocaleString("en-US")}</text>`).join("");
    const yt = [1, 10, 100, 1000].filter((v) => Math.log10(v) <= yMax).map((v) =>
      `<text class="im-ax" x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("");
    const dot = (i, cls, label, dy) => {
      const ic = Math.min(Math.max(i, Math.pow(10, xMin)), Math.pow(10, xMax));
      return `<circle class="im-pt ${cls}" cx="${X(ic)}" cy="${Y(perf(ic))}" r="5"/>` +
        `<text class="im-lbl ${cls}" x="${X(ic) + 8}" y="${Y(perf(ic)) + dy}">${label}</text>`;
    };
    return `<svg class="im-roof" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("屋顶线图", "Roofline chart")}">
      ${ticks}${yt}
      <line class="im-bal" x1="${X(c.balance)}" y1="${t}" x2="${X(c.balance)}" y2="${H - b}"/>
      <text class="im-ax" x="${X(c.balance) + 4}" y="${t + 10}">${T("拐点", "balance")} ≈ ${n0(c.balance)}</text>
      <polyline class="im-line" points="${poly}"/>
      ${dot(c.decI, "dec", "decode", 16)}
      ${dot(c.preI, "pre", "prefill", -8)}
      <text class="im-ax" x="${(l + W - r) / 2}" y="${H - 6}" text-anchor="middle">${T("算术强度：每读 1 字节算几次（FLOP/byte，对数）", "arithmetic intensity: FLOPs per byte read (log)")}</text>
      <text class="im-ax" x="12" y="${(t + H - b) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(t + H - b) / 2})">TFLOPS</text>
    </svg>`;
  }

  // ---- the steps ----
  // Each returns { title, rows: [[label, formulaHtml]], note }. A(id, text) marks an answer.
  function steps(c, s, A) {
    const m = c.m, g = c.g, by = c.by;
    const memBound = (read, math) => read >= math;
    const fits = c.free > 0;
    const batchFits = s.batch * c.reqKV <= c.free;
    return [
      {
        title: T("1. 权重有多大", "1. How big are the weights"),
        rows: [[T("参数量 × 每个数的字节数", "params × bytes per number"), `${bil(m.P)} × ${by} bytes = ${A("w", gb(c.W))}`]],
        note: T("decode 每生成一个 token，都要把这些权重从显存完整读一遍。", "Every decode step reads all of this from GPU memory once."),
      },
      {
        title: T("2. 每个 token 的 KV 有多大", "2. How big is one token's KV"),
        rows: [
          [T("每层 = 2（K 和 V）× KV head 数 × head 维度 × 字节数", "per layer = 2 (K and V) × KV heads × head dim × bytes"),
            `2 × ${m.kvh} × ${m.hd} × ${by} = ${A("kvl", n0(c.kvTok / m.L) + " bytes")}`],
          [T("每个 token = 每层 × 层数", "per token = per layer × layers"),
            `${n0(c.kvTok / m.L)} × ${m.L} = ${A("kv", n0(c.kvTok) + " bytes ≈ " + kb(c.kvTok))}`],
        ],
        note: T(`用了 GQA：只有 ${m.kvh} 个 KV head。如果 ${m.qh} 个 Q head 各有自己的 KV，就是 ${m.qh / m.kvh} 倍：${kb(c.kvTok * m.qh / m.kvh)}。`,
          `This uses GQA: only ${m.kvh} KV heads. If all ${m.qh} Q heads had their own K and V, it would be ${m.qh / m.kvh}× bigger: ${kb(c.kvTok * m.qh / m.kvh)}.`),
      },
      {
        title: T("3. 显存还能放多少 KV", "3. How much KV fits in memory"),
        rows: fits ? [
          [T(`留给 KV 的显存 = ${g.name} 显存 − 模型权重`, `memory left for KV = ${g.name} memory − model weights`), `${gb(g.mem)} − ${gb(c.W)} = ${A("free", gb(c.free))}`],
          [T("能放的 token 数 = 留给 KV 的显存 ÷ 每 token KV", "tokens that fit = memory left ÷ KV per token"), `${gb(c.free)} ÷ ${kb(c.kvTok)} = ${A("fit", n0(c.fitTok) + T(" 个 token", " tokens"))}`],
          [T(`每个请求 ${n0(s.ctx)} 个 token，能同时放几个`, `requests at ${n0(s.ctx)} tokens each`), `${gb(c.free)} ÷ (${n0(s.ctx)} × ${kb(c.kvTok)}) = ${A("req", n0(c.fitReq) + T(" 个请求", " requests"))}`],
        ] : [[T("权重 > 显存", "weights > GPU memory"), `${gb(c.W)} > ${gb(g.mem)}: ${A("free", T("放不下", "does not fit"))}`]],
        note: fits
          ? T("这就是 batch 的上限：KV 放不下，就不能再加请求。这里没算激活值，也没算 vLLM 默认只用 90% 显存。", "This caps the batch: when the KV is full, no more requests can join. Activations and vLLM's default 90% memory cap are left out.")
          : T("一张卡放不下权重：换 FP8，或者把模型切到多张卡上（tensor parallel）。后面几步假设它放得下。", "The weights alone don't fit on one GPU: use FP8, or split the model across GPUs (tensor parallel). The next steps pretend it fits."),
      },
      {
        title: T("4. decode 最快多快", "4. How fast can decode go"),
        rows: [
          [T("每步要读的字节 = 权重 + batch × context × 每 token KV", "bytes per step = weights + batch × context × KV per token"),
            `${gb(c.W)} + ${s.batch} × ${n0(s.ctx)} × ${kb(c.kvTok)} = ${A("db", gb(c.decBytes))}`],
          [T("每步时间 = 字节 ÷ 带宽", "step time = bytes ÷ bandwidth"), `${gb(c.decBytes)} ÷ ${tbs(g.bw)} = ${A("dt", ms(c.decRead))}`],
          [T("每个请求的速度", "speed per request"), `1 token ÷ ${ms(c.decStep)} = 1,000 ms ÷ ${ms(c.decStep)} ≈ ${A("ds", n0(1 / c.decStep) + " tokens/s")}`],
        ].concat(s.batch > 1 ? [[T("整个 batch 的吞吐", "whole batch"), `${s.batch} × ${n0(1 / c.decStep)} = ${A("dtot", n0(s.batch / c.decStep) + " tokens/s")}`]] : []),
        note: (memBound(c.decRead, c.decMath)
          ? T(`计算只要 ${ms(c.decMath)}，比读取快，所以速度由带宽决定。`, `The math takes only ${ms(c.decMath)}, less than the read, so bandwidth sets the speed.`)
          : T(`计算要 ${ms(c.decMath)}，比读取还久，这一步变成算力在限速。`, `The math takes ${ms(c.decMath)}, longer than the read, so compute now sets the speed.`)) +
          (batchFits ? "" : T(` ⚠ 这个 batch 的 KV（${gb(s.batch * c.reqKV)}）超过了第 3 步剩下的显存，实际跑不起来。`, ` ⚠ This batch needs ${gb(s.batch * c.reqKV)} of KV, more than step 3's free memory, so it can't actually run.`)),
      },
      {
        title: T("5. 每个 token 要算多少", "5. How much math per token"),
        rows: [
          [T("权重部分 = 2 × 参数量（x 乘 q_proj、k_proj、v_proj、o_proj、FFN；2 = 每个权重一次 × 加一次 +）", "weights = 2 × params (x × q_proj, k_proj, v_proj, o_proj, FFN; 2 = one × and one + per weight)"),
            `2 × ${bil(m.P)} = ${A("fw", gf2(2 * m.P))}`],
          [T("attention 部分 = 4 × 层数 × context × (Q head 数 × head 维度)（和前面每个 token：4 = Q · K 打分 2 + 分数 × V 2）", "attention = 4 × layers × context × (Q heads × head dim) (with every earlier token; 4 = 2 for Q · K + 2 for score × V)"),
            `4 × ${m.L} × ${n0(s.ctx)} × ${n0(c.dq)} = ${A("fa", gf2(c.attnTok))}`],
          [T("合计 = 权重部分 + attention 部分", "total = weights + attention"),
            `${gf2(2 * m.P).replace(" GFLOP", "")} + ${gf2(c.attnTok).replace(" GFLOP", "")} ≈ ${A("ft", gflop(2 * m.P + c.attnTok))}`],
        ],
        note: T(`所以生成一个 token 要做 ${gflop(2 * m.P + c.attnTok)}：大约 ${n0((2 * m.P + c.attnTok) / 1e8)} 亿次乘法和加法。`, `So one token takes ${gflop(2 * m.P + c.attnTok)}: about ${sig((2 * m.P + c.attnTok) / 1e9)} billion multiplies and adds.`),
      },
      {
        title: T("6. 算术强度和屋顶线", "6. Arithmetic intensity and the roofline"),
        rows: [
          [T("读的时间 = 每步字节 ÷ 带宽", "reading time = bytes per step ÷ bandwidth"),
            `${gb(c.decBytes)} ÷ ${tbs(g.bw)} = ${A("dr", ms(c.decRead))}` + (c.decRead >= c.decMath ? T("  ← 更慢", "  ← slower") : "")],
          [T("算的时间 = 每步计算 ÷ 算力", "math time = FLOPs per step ÷ peak"),
            `${gflop(c.decFlops)} ÷ ${tf(c.peak)} = ${A("dm", ms(c.decMath))}` + (c.decMath > c.decRead ? T("  ← 更慢", "  ← slower") : "")],
          [T("decode 的算术强度 = 每步计算 ÷ 每步字节（任务每读 1 byte 算几次）", "decode intensity = FLOPs per step ÷ bytes per step (math the work does per byte read)"),
            `${gflop(c.decFlops)} ÷ ${gb(c.decBytes)} = ${A("di", sig(c.decI) + " FLOP/byte")}`],
          [T("机器平衡点 = 算力 ÷ 带宽（GPU 读 1 byte 的时间里能算几次）", "machine balance = peak ÷ bandwidth (math the GPU can do while it reads one byte)"),
            `${tf(c.peak)} ÷ ${tbs(g.bw)} = ${A("bal", n0(c.balance) + " FLOP/byte")}`],
          (() => {
            const roof = c.peak / 1e12, slope = (g.bw * c.decI) / 1e12, spd = Math.min(roof, slope);
            const r = roof <= slope ? "<b>" + n0(roof) + "</b>" : n0(roof);
            const sl = slope < roof ? "<b>" + sig(g.bw / 1e12) + " × " + sig(c.decI) + "</b>" : sig(g.bw / 1e12) + " × " + sig(c.decI);
            return [T("速度 = min(算力, 带宽 × 强度)（屋顶线：取小的那个）", "speed = min(peak, bandwidth × intensity) (the roofline: the smaller one wins)"),
              `min(${r}, ${sl}) = ${A("sp", sig(spd) + " TFLOPS")}` + T(`（峰值的 ${sig((spd / roof) * 100)}%）`, ` (${sig((spd / roof) * 100)}% of peak)`)];
          })(),
        ],
        chart: true,
        note: (c.decI < c.balance
          ? T(`decode 在拐点左边，差 ${sig(c.balance / c.decI)} 倍：memory-bound，算力大部分时间在等数据。`, `Decode sits left of the balance point, ${sig(c.balance / c.decI)}× short: memory-bound, the math units mostly wait for data.`)
          : T("decode 已经过了拐点：compute-bound。", "Decode is past the balance point: compute-bound.")) +
          (c.limitI < c.balance
            ? T(` batch 再大也过不去：KV 的读取量也跟着 batch 涨，强度最多到 ${sig(c.limitI)}。在这个 context 长度下，decode 一直是 memory-bound。`, ` No batch size gets it there: the KV read grows with the batch too, so intensity tops out at ${sig(c.limitI)}. At this context length, decode stays memory-bound.`)
            : ""),
      },
      {
        title: T("7. prefill 要多久", "7. How long does prefill take"),
        rows: [
          [T(`计算 = 2 × 参数量 × prompt 长度 + attention（prompt = ${n0(s.ctx)} 个 token）`, `math = 2 × params × prompt length + attention (prompt = ${n0(s.ctx)} tokens)`),
            `2 × ${bil(m.P)} × ${n0(s.ctx)} + ${gflop(c.preFlops - 2 * m.P * s.ctx)} = ${A("pf", gflop(c.preFlops))}`],
          [T("计算时间 = 计算 ÷ 算力", "math time = FLOPs ÷ peak"), `${gflop(c.preFlops)} ÷ ${tf(c.peak)} = ${A("pm", ms(c.preMath))}`],
          [T("读取时间 = 权重 ÷ 带宽", "read time = weights ÷ bandwidth"), `${gb(c.preBytes)} ÷ ${tbs(g.bw)} = ${A("pr", ms(c.preRead))}`],
        ],
        note: memBound(c.preRead, c.preMath)
          ? T(`prompt 太短，读取（${ms(c.preRead)}）比计算久，prefill 也是 memory-bound。`, `The prompt is short, so the read (${ms(c.preRead)}) takes longer than the math: even prefill is memory-bound here.`)
          : T(`计算比读取久，prefill 是 compute-bound。理想的 TTFT ≈ ${ms(c.preStep)}，实际还要加排队时间。`, `The math takes longer than the read, so prefill is compute-bound. Ideal TTFT ≈ ${ms(c.preStep)}, plus any time spent queuing.`),
      },
    ];
  }

  function mount(root) {
    const s = { model: "8b", gpu: "h200", bytes: 2, batch: 1, ctx: 1024, quiz: false, i: 0 };
    let shown = new Set();
    const seg = (key, opts) => `<div class="im-seg" data-key="${key}">` +
      opts.map(([v, label]) => `<button type="button" class="qd-btn" data-v="${v}">${label}</button>`).join("") + "</div>";
    root.innerHTML = `
      <div class="qd-nav">
        <nav class="qd-dots" aria-label="${T("步骤", "Steps")}"></nav>
        <div class="qd-row">
          <button type="button" class="qd-btn" data-prev>${T("上一步", "Back")}</button>
          <button type="button" class="qd-btn primary" data-next>${T("下一步", "Next")}</button>
        </div>
      </div>
      <div class="im-controls">
        <div class="im-field"><span>${T("模型", "Model")}</span>${seg("model", [["8b", "Llama-3-8B"], ["70b", "Llama-3-70B"]])}</div>
        <div class="im-field"><span>GPU</span>${seg("gpu", [["h200", "H200"], ["h100", "H100"], ["a100", "A100"]])}</div>
        <div class="im-field"><span>${T("精度", "Precision")}</span>${seg("bytes", [["2", "BF16"], ["1", "FP8"]])}</div>
        <label class="im-field"><span>Batch: <b class="im-batch"></b></span><input type="range" class="im-r-batch" min="0" max="${Math.log2(BATCH_MAX) * 4}" step="1"></label>
        <label class="im-field"><span>Context: <b class="im-ctx"></b></span><input type="range" class="im-r-ctx" min="${Math.log2(CTX_MIN) * 4}" max="${Math.log2(CTX_MAX) * 4}" step="1"></label>
        <label class="im-quiz"><input type="checkbox" class="im-c-quiz"> ${T("先遮住答案，自己算", "Hide answers, work them out first")}</label>
      </div>
      <div class="qd-card im-card"></div>
      <p class="qd-hint">${T("规格：H200 141 GB、4.8 TB/s；H100 80 GB、3.35 TB/s；两者 FP16 约 989 TFLOPS、FP8 约 1,979 TFLOPS（不算稀疏）。A100 80 GB、2.0 TB/s、312 TFLOPS，没有 FP8。KV cache 和权重用同一种精度。", "Specs: H200 141 GB, 4.8 TB/s; H100 80 GB, 3.35 TB/s; both about 989 TFLOPS in FP16 and 1,979 in FP8 (dense). A100 80 GB, 2.0 TB/s, 312 TFLOPS, no FP8. The KV cache uses the same precision as the weights.")}</p>`;
    const $ = (q) => root.querySelector(q);
    const rB = $(".im-r-batch"), rC = $(".im-r-ctx");
    const N = 7;
    $(".qd-dots").innerHTML = Array.from({ length: N }, (_, k) => `<button type="button" data-i="${k}" aria-label="${T("第", "Step ")}${k + 1}${T(" 步", "")}">${k + 1}</button>`).join("");

    function render() {
      if (s.gpu === "a100" && s.bytes === 1) s.bytes = 2;
      const c = calc(s);
      const A = (id, text) => s.quiz && !shown.has(id)
        ? `<button type="button" class="im-ans hide" data-ans="${id}" aria-label="${T("显示答案", "Show answer")}">${text}</button>`
        : `<b class="im-ans">${text}</b>`;
      const st = steps(c, s, A)[s.i];
      $(".im-card").innerHTML =
        `<h3 class="qd-title">${st.title}</h3>` +
        `<div class="im-rows">${st.rows.map(([lab, f]) => `<div class="im-row"><span>${lab}</span><div class="qd-mono">${f}</div></div>`).join("")}</div>` +
        (st.chart ? `<div class="qd-scroll">${roofline(c)}</div>` : "") +
        `<p class="qd-key">${st.note}</p>`;
      root.querySelectorAll(".im-seg").forEach((g) => g.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", String(String(s[g.dataset.key]) === b.dataset.v));
        if (g.dataset.key === "bytes") b.disabled = b.dataset.v === "1" && s.gpu === "a100";
      }));
      $(".im-batch").textContent = s.batch;
      $(".im-ctx").textContent = n0(s.ctx);
      rB.value = Math.round(Math.log2(s.batch) * 4);
      rC.value = Math.round(Math.log2(s.ctx) * 4);
      root.querySelectorAll(".qd-dots button").forEach((b) => { if (+b.dataset.i === s.i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      $("[data-prev]").disabled = s.i === 0;
      $("[data-next]").disabled = s.i === N - 1;
    }
    const change = () => { shown = new Set(); render(); };

    root.addEventListener("click", (e) => {
      const ans = e.target.closest(".im-ans.hide");
      if (ans) { shown.add(ans.dataset.ans); render(); return; }
      const b = e.target.closest(".im-seg button");
      if (b) { const k = b.closest(".im-seg").dataset.key; s[k] = k === "bytes" ? +b.dataset.v : b.dataset.v; change(); return; }
      const d = e.target.closest(".qd-dots button");
      if (d) { s.i = +d.dataset.i; render(); return; }
      if (e.target.closest("[data-prev]") && s.i > 0) { s.i--; render(); }
      if (e.target.closest("[data-next]") && s.i < N - 1) { s.i++; render(); }
    });
    rB.addEventListener("input", () => { s.batch = Math.round(Math.pow(2, rB.value / 4)); change(); });
    rC.addEventListener("input", () => { s.ctx = Math.round(Math.pow(2, rC.value / 4) / 64) * 64 || 64; change(); });
    $(".im-c-quiz").addEventListener("change", (e) => { s.quiz = e.target.checked; change(); });
    render();
  }

  if (typeof document !== "undefined") document.querySelectorAll("[data-im-demo]").forEach(mount);
  if (typeof module !== "undefined") module.exports = { calc };
})();
