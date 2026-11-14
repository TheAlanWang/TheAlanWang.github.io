// Three interactive figures for the KV cache post. Mounts into [data-kv-cache-demo].
// Reuses the .qkv-demo styles (qd-*) plus a few kvc-* rules in main.css.
// Shapes follow Llama-3-8B: 32 layers, 32 query heads, 8 KV heads, head size 128.
(function () {
  function partHeads(root) {
    const Q = 32, kvCount = { mha: 32, gqa: 8, mqa: 1 };
    const toks = ["Tom", "gave", "Mom", "an", "apple", "she"];
    let mode = "gqa", sel = 0, layer = 0;
    root.innerHTML =
      '<h3 class="qd-title">1. Where Q, K and V heads come from, and who reads what</h3>' +
      '<p class="qd-text">Everything below happens inside <b>one layer</b>. Llama-3-8B has 32, and each layer has its own W_Q, W_K, W_V and its own K/V table in the cache. Same shapes, different numbers. The output of layer 1 becomes the x of layer 2, and so on. Click a layer to switch.</p>' +
      '<div class="kvc-layers" data-layers></div>' +
      '<div class="kvc-seg" role="group" aria-label="Attention design">' +
      '<button type="button" data-mode="mha" aria-pressed="false">MHA: 32 KV heads</button>' +
      '<button type="button" data-mode="gqa" aria-pressed="true">GQA: 8 KV heads (Llama-3)</button>' +
      '<button type="button" data-mode="mqa" aria-pressed="false">MQA: 1 KV head</button></div>' +
      '<p class="qd-text"><b>Step A. Computed, in <span data-ln></span>.</b> The new token "she" arrives as a vector x of 4096 numbers (in layer 1 it comes from the embedding table; in later layers it is the previous layer\'s output). It is multiplied by three separate weight tables learned in training. Q, K and V are computed side by side; none of them comes from another. The number of columns in each table decides how many heads come out.</p>' +
      '<div class="kvc-mul">' +
      '<div class="kvc-x">x<br><span class="qd-mono" data-ln></span><br><span class="qd-mono">"she"<br>4096</span></div>' +
      '<div class="kvc-w"><b>× W_Q</b><span class="qd-mono">4096 × 4096</span></div><div class="kvc-heads" data-q></div>' +
      '<div class="kvc-w"><b>× W_K</b><span class="qd-mono" data-wk></span></div><div class="kvc-heads" data-k></div>' +
      '<div class="kvc-w"><b>× W_V</b><span class="qd-mono" data-wv></span></div><div class="kvc-heads" data-v></div>' +
      '</div>' +
      '<p class="qd-text"><b>Step B. Used, in <span data-ln></span>.</b> All 32 Q heads belong to "she". Each Q head looks up one K head of <b>every</b> token so far (earlier tokens from the cache, plus "she" itself), then reads the paired V head. Click a Q head above to pick it.</p>' +
      '<div class="kvc-label"><span><b class="kvc-k">K heads</b> of every token, <span data-ln></span>\'s table in the KV cache</span></div><div class="kvc-grid" data-ck></div>' +
      '<div class="kvc-label"><span><b class="kvc-v">V heads</b> of every token, <span data-ln></span>\'s table in the KV cache</span></div><div class="kvc-grid" data-cv></div>' +
      '<p class="qd-key" data-take></p>';
    const qEl = root.querySelector("[data-q]"), kEl = root.querySelector("[data-k]"), vEl = root.querySelector("[data-v]");
    const ck = root.querySelector("[data-ck]"), cv = root.querySelector("[data-cv]");
    qEl.style.gridTemplateColumns = "repeat(32, minmax(0, 1fr))";
    for (let i = 0; i < Q; i++) { const d = document.createElement("div"); d.className = "kvc-head q"; d.textContent = i + 1; d.dataset.i = i; d.title = "Q head " + (i + 1); qEl.appendChild(d); }
    const lEl = root.querySelector("[data-layers]");
    for (let i = 0; i < 32; i++) { const d = document.createElement("button"); d.type = "button"; d.className = "kvc-layer"; d.textContent = i + 1; d.dataset.l = i; d.setAttribute("aria-label", "Layer " + (i + 1)); lEl.appendChild(d); }
    lEl.addEventListener("click", (e) => { const t = e.target.closest(".kvc-layer"); if (t) { layer = +t.dataset.l; draw(); } });
    const per = () => Q / kvCount[mode];
    const groupOf = (qi) => Math.floor(qi / per());
    function cacheGrid(el, kind, n, g) {
      el.style.gridTemplateColumns = "64px repeat(" + n + ", minmax(0, 1fr))";
      let h = "";
      toks.forEach((t, r) => {
        h += '<div class="kvc-rowlab">' + t + (r === toks.length - 1 ? " (new)" : "") + "</div>";
        for (let j = 0; j < n; j++) h += '<div class="kvc-head ' + kind + (j === g ? " hi" : " dim") + '">' + (n <= 8 ? kind.toUpperCase() + (j + 1) : "") + "</div>";
      });
      el.innerHTML = h;
    }
    function draw() {
      const n = kvCount[mode], g = groupOf(sel), p = per();
      root.querySelectorAll("[data-ln]").forEach((x) => (x.textContent = "layer " + (layer + 1)));
      lEl.querySelectorAll(".kvc-layer").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.l === layer)));
      root.querySelector("[data-wk]").textContent = "4096 × " + n * 128;
      root.querySelector("[data-wv]").textContent = "4096 × " + n * 128;
      [kEl, vEl].forEach((el, idx) => {
        el.innerHTML = ""; el.style.gridTemplateColumns = "repeat(" + n + ", minmax(0, 1fr))";
        for (let j = 0; j < n; j++) { const d = document.createElement("div"); d.className = "kvc-head " + (idx ? "v" : "k") + (j === g ? " hi" : ""); d.textContent = (idx ? "V" : "K") + (n <= 16 ? j + 1 : ""); el.appendChild(d); }
      });
      qEl.querySelectorAll(".kvc-head").forEach((c) => { const i = +c.dataset.i; c.classList.toggle("hi", groupOf(i) === g); c.classList.toggle("sel", i === sel); });
      cacheGrid(ck, "k", n, g); cacheGrid(cv, "v", n, g);
      const first = g * p + 1, last = (g + 1) * p;
      const who = p === 1 ? "No other Q head shares it." : "Q heads " + first + " to " + last + " all use this same K/V head; they just take turns reading it.";
      root.querySelector("[data-take]").textContent =
        "In layer " + (layer + 1) + ", Q head " + (sel + 1) + " of \"she\" compares with K head " + (g + 1) + " of all 6 tokens, then reads V head " + (g + 1) + " of all 6 tokens. " + who +
        " The same lookup runs in all 32 layers, each on its own table." +
        (mode === "mha" ? " MHA: W_K has 4096 columns, so 32 K heads; 16 KB per token per layer, 512 KB over 32 layers."
          : mode === "gqa" ? " GQA: W_K has only 1024 columns, so only 8 K heads exist from the start; nothing is merged. 4 KB per token per layer, 128 KB over 32 layers."
          : " MQA: W_K has only 128 columns, so a single K head; 0.5 KB per token per layer, 16 KB over 32 layers.");
    }
    qEl.addEventListener("click", (e) => { const t = e.target.closest(".kvc-head"); if (t) { sel = +t.dataset.i; draw(); } });
    root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      root.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    }));
    draw();
  }

  function partGrow(root) {
    const H = 8, START = 5, MAX = 12;
    const words = ["Tom", "gave", "Mom", "an", "apple", ",", "she", "smiled", "and", "said", "thanks", "."];
    root.innerHTML =
      '<h3 class="qd-title">2. Every new token adds one cell per KV head</h3>' +
      '<p class="qd-text">This is the KV cache of <b>one layer</b> (GQA, 8 KV heads). Each column is a token; each cell is that token\'s 128 numbers for one head. Click through one token at your own pace.</p>' +
      '<div class="qd-row"><button type="button" class="qd-btn primary" data-gen>Generate next token</button><button type="button" class="qd-btn" data-reset>Reset</button></div>' +
      '<p class="qd-out" data-step aria-live="polite"></p>' +
      '<div class="qd-scroll"><div class="kvc-cache" data-cache></div></div>' +
      '<p class="qd-key">This is 1 of 32 layers. Every layer has a table like this, all growing to the right together.</p>';
    const cache = root.querySelector("[data-cache]"), step = root.querySelector("[data-step]"), gen = root.querySelector("[data-gen]");
    let n = START, phase = 0, col = -1;
    function render(fresh, reading, limit) {
      cache.style.gridTemplateColumns = "56px repeat(" + MAX + ", minmax(24px, 1fr))";
      let h = "<span></span>";
      for (let c = 0; c < MAX; c++) h += '<span class="kvc-colw">' + (c < n ? words[c] : "") + "</span>";
      ["K", "V"].forEach((kind) => {
        for (let r = 0; r < H; r++) {
          h += '<span class="kvc-rowlab">' + kind + " head " + (r + 1) + "</span>";
          for (let c = 0; c < MAX; c++) {
            let cls = "kvc-cell";
            if (c < n) {
              cls += " " + kind.toLowerCase();
              if (c === fresh) cls += " fresh";
              if (reading === kind && c < limit) cls += " read";
            }
            h += '<span class="' + cls + '"></span>';
          }
        }
      });
      cache.innerHTML = h;
    }
    function label() {
      gen.textContent = phase === 0 ? "Generate next token" : "Next step";
      gen.disabled = phase === 0 && n >= MAX;
    }
    gen.addEventListener("click", () => {
      if (phase === 0) {
        if (n >= MAX) return;
        col = n; n++; phase = 1;
        step.textContent = "Step 1 of 4: the new token \"" + words[col] + "\" computes its own Q, K and V from its own vector, and appends K and V on the right. It looks at nothing else yet.";
        render(col, null, 0);
      } else if (phase === 1) {
        phase = 2;
        step.textContent = "Step 2 of 4: its Q is compared with every K, including the one it just added, to decide how much to attend to each token.";
        render(-1, "K", col + 1);
      } else if (phase === 2) {
        phase = 3;
        step.textContent = "Step 3 of 4: every V is mixed by those scores. The result is this layer's output, passed up to the next layer.";
        render(-1, "V", col + 1);
      } else {
        phase = 0;
        step.textContent = "Step 4 of 4: done. \"" + words[col] + "\"'s K and V stay in the cache, so the next token reads them instead of recomputing.";
        render(-1, null, 0);
      }
      label();
    });
    root.querySelector("[data-reset]").addEventListener("click", () => {
      n = START; phase = 0;
      step.textContent = "Click to step through: store your own K and V, read every K, then read every V.";
      render(-1, null, 0); label();
    });
    step.textContent = "Click to step through: store your own K and V, read every K, then read every V.";
    render(-1, null, 0); label();
  }

  function partCalc(root) {
    root.innerHTML =
      '<h3 class="qd-title">3. How much memory one token takes</h3>' +
      '<p class="qd-text">Drag the sliders. The defaults are Llama-3-8B.</p>' +
      '<div class="kvc-calc">' +
      '<label class="kvc-field"><span>Layers <output data-o="layers"></output></span><input type="range" data-in="layers" min="8" max="80" step="4" value="32"><small>how many layers stack up</small></label>' +
      '<label class="kvc-field"><span>KV heads per layer <output data-o="kvh"></output></span><input type="range" data-in="kvh" min="1" max="64" step="1" value="8"><small>how many K/V pieces each token stores per layer</small></label>' +
      '<label class="kvc-field"><span>Head size <output data-o="hdim"></output></span><input type="range" data-in="hdim" min="64" max="256" step="64" value="128"><small>how many numbers in each head</small></label>' +
      '<label class="kvc-field"><span>Tokens in one request <output data-o="toks"></output></span><input type="range" data-in="toks" min="1000" max="128000" step="1000" value="8000"><small>prompt + output</small></label>' +
      "</div>" +
      '<div class="qd-row"><span class="qd-hint">Bytes per number:</span><div class="kvc-seg" role="group" aria-label="Precision">' +
      '<button type="button" data-bytes="2" aria-pressed="true">FP16 (2 bytes)</button><button type="button" data-bytes="1" aria-pressed="false">FP8 (1 byte)</button></div>' +
      '<button type="button" class="qd-btn" data-preset>Reset to Llama-3-8B</button></div>' +
      '<div class="kvc-math" data-math></div>' +
      '<p class="qd-key">More KV heads, bigger heads, more layers or more bytes per number: each one multiplies the size. That is why GQA and FP8 KV caches both save memory.</p>';
    let bytes = 2;
    const get = (k) => +root.querySelector('[data-in="' + k + '"]').value;
    const fmt = (b) => b >= 1073741824 ? (b / 1073741824).toFixed(2) + " GB" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : b >= 1024 ? (b / 1024).toFixed(0) + " KB" : b + " B";
    function calc() {
      const L = get("layers"), K = get("kvh"), D = get("hdim"), T = get("toks");
      ["layers", "kvh", "hdim", "toks"].forEach((k) => { root.querySelector('[data-o="' + k + '"]').textContent = get(k).toLocaleString(); });
      const perLayer = 2 * K * D * bytes, perTok = perLayer * L, req = perTok * T;
      root.querySelector("[data-math]").innerHTML =
        "<div><span>1 token, 1 layer: 2 (K and V) × " + K + " heads × " + D + " numbers × " + bytes + " bytes</span><b>" + fmt(perLayer) + "</b></div>" +
        "<div><span>1 token, all " + L + " layers</span><b>" + fmt(perTok) + "</b></div>" +
        "<div><span>1 vLLM block (16 tokens)</span><b>" + fmt(perTok * 16) + "</b></div>" +
        '<div class="big"><span>1 request (' + T.toLocaleString() + " tokens)</span><b>" + fmt(req) + "</b></div>" +
        "<div><span>8 such requests at once</span><b>" + fmt(req * 8) + "</b></div>";
    }
    root.querySelectorAll("[data-in]").forEach((el) => el.addEventListener("input", calc));
    root.querySelectorAll("[data-bytes]").forEach((b) => b.addEventListener("click", () => {
      bytes = +b.dataset.bytes;
      root.querySelectorAll("[data-bytes]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      calc();
    }));
    root.querySelector("[data-preset]").addEventListener("click", () => {
      [["layers", 32], ["kvh", 8], ["hdim", 128], ["toks", 8000]].forEach(([k, v]) => { root.querySelector('[data-in="' + k + '"]').value = v; });
      bytes = 2;
      root.querySelectorAll("[data-bytes]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.bytes === "2")));
      calc();
    });
    calc();
  }

  document.querySelectorAll("[data-kv-cache-demo]").forEach((root) => {
    root.innerHTML = '<section class="kvc-part"></section><section class="kvc-part"></section><section class="kvc-part"></section>';
    const parts = root.querySelectorAll(".kvc-part");
    partHeads(parts[0]); partGrow(parts[1]); partCalc(parts[2]);
  });
})();
