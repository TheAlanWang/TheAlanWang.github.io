// Step-through figure for the Prefill and Decode post. Mounts into [data-pf-demo].
// A scaled-down but real transformer forward pass: 4-number vectors, 3 layers, each layer with its own
// random W_Q, W_K, W_V and its own KV cache. Per layer: Q, K, V = x × W; scores = Q·K / sqrt(d) with
// causal masking; softmax; mix the V's; x_next = x + attention. Feed-forward and normalization are left out.
// Prefill runs all prompt tokens at once; decode runs only the new token and reads earlier K, V from each layer's cache.
(function () {
  const ZH = document.documentElement.lang.startsWith("zh");
  const T = (zh, en) => (ZH ? zh : en);
  const D = 4, LAYERS = 3, WORDS = ["I", "like", "cats", "too"];

  // Fixed pseudo-random numbers so the figure is the same on every load.
  let seed = 20261119;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const r1 = (a) => Math.round((rand() * 2 - 1) * a * 10) / 10;
  const EMB = {}; WORDS.forEach((w) => { EMB[w] = Array.from({ length: D }, () => r1(1)); });
  const mat = () => Array.from({ length: D }, () => Array.from({ length: D }, () => r1(0.8)));
  const W = Array.from({ length: LAYERS }, () => ({ q: mat(), k: mat(), v: mat() }));
  // Layer 1 uses hand-picked vectors and Q/K weights so the attention shares are clear
  // (like -> mostly I, cats -> mostly like, too -> mostly cats). Layer 1's V and layers 2-3 stay random.
  Object.assign(EMB, { I: [0.9, 0.1, -0.2, 0.3], like: [0.1, 0.8, 0.3, -0.2], cats: [-0.2, 0.2, 0.9, 0.1], too: [0.3, -0.1, 0.2, 0.9] });
  W[0].q = [[0.2, 0, -0.2, 3.2], [3.4, 0.2, 0, 0], [0, 3.6, 0.2, -0.2], [-0.2, 0, 3.4, 0.2]];
  W[0].k = [[1.5, 0.1, 0, -0.1], [0, 1.6, 0.1, 0], [0.1, 0, 1.5, 0.1], [0, -0.1, 0.1, 1.6]];

  const mul = (x, M) => M[0].map((_, c) => x.reduce((s, xi, r) => s + xi * M[r][c], 0));
  const dot = (a, b) => a.reduce((s, ai, i) => s + ai * b[i], 0);
  const f2 = (v) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
  const vec = (v) => "[" + v.map(f2).join(", ") + "]";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Full causal forward pass. Rows for earlier tokens equal what prefill computed, so decode can read them as "cache".
  function forward(tokens) {
    const xs = [tokens.map((t) => EMB[t].slice())], L = [];
    for (let l = 0; l < LAYERS; l++) {
      const x = xs[l];
      const Q = x.map((v) => mul(v, W[l].q)), K = x.map((v) => mul(v, W[l].k)), V = x.map((v) => mul(v, W[l].v));
      const S = Q.map((q, i) => K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(D) : null)));
      const P = S.map((row) => {
        const m = Math.max(...row.filter((s) => s !== null));
        const e = row.map((s) => (s === null ? 0 : Math.exp(s - m)));
        const z = e.reduce((a, b) => a + b, 0);
        return e.map((v) => v / z);
      });
      const O = P.map((p) => V[0].map((_, c) => p.reduce((s, pj, j) => s + pj * V[j][c], 0)));
      L.push({ Q, K, V, S, P, O });
      xs.push(x.map((v, i) => v.map((vi, c) => vi + O[i][c])));
    }
    return { xs, L };
  }

  const MODES = {
    prefill: { label: T('Prefill："I like cats"', 'Prefill: "I like cats"'), tokens: ["I", "like", "cats"], live: [0, 1, 2], next: "too" },
    decode: { label: T('Decode："too" 之后的 token', 'Decode: the token after "too"'), tokens: ["I", "like", "cats", "too"], live: [3], next: "!" },
  };
  Object.values(MODES).forEach((m) => { m.run = forward(m.tokens); });

  const KINDS = ["qkv", "score", "softmax", "mix", "add"];
  const STEPS = [{ kind: "input", l: 0 }];
  for (let l = 0; l < LAYERS; l++) KINDS.forEach((k) => STEPS.push({ kind: k, l }));
  STEPS.push({ kind: "out", l: LAYERS - 1 });
  const sup = (n) => String(n).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("");

  function mount(el) {
    let mode = "prefill", step = 0, pick = null;

    // Table of one vector per token. dimRows: tokens shown as cached (not computed in this pass).
    function vecTable(title, cls, m, rows, opt) {
      opt = opt || {};
      const live = new Set(m.live);
      const head = "<tr><th></th>" + Array.from({ length: D }, (_, c) => "<th>d" + (c + 1) + "</th>").join("") + "</tr>";
      const body = m.tokens.map((t, i) => {
        const cached = !live.has(i);
        if (cached && opt.hideCached) return "";
        if (cached && opt.cachedNote) return '<tr class="cached"><th>' + esc(t) + '</th><td colspan="' + D + '" class="pf-na">' + opt.cachedNote + "</td></tr>";
        return '<tr class="' + (cached ? "cached" : "now") + '"><th>' + esc(t) + (cached ? '<span class="pf-src">' + T("来自 cache", "from cache") + '</span>' : "") + "</th>" +
          rows[i].map((v) => "<td>" + f2(v) + "</td>").join("") + "</tr>";
      }).join("");
      return '<div class="pf-mat ' + cls + '"><div class="pf-mh">' + title + '</div><div class="qd-scroll"><table class="pf-table pf-nums">' + head + body + "</table></div></div>";
    }

    function scoreTable(m, Lr, asProb, sel) {
      const head = "<tr><th></th>" + m.tokens.map((t) => "<th>K<sub>" + esc(t) + "</sub></th>").join("") + "</tr>";
      const body = m.live.map((i) => "<tr" + (i === sel ? ' class="sel"' : "") + "><th>Q<sub>" + esc(m.tokens[i]) + "</sub></th>" +
        m.tokens.map((_, j) => {
          if (j > i) return '<td class="mask">·</td>';
          if (!asProb) return "<td>" + f2(Lr.S[i][j]) + "</td>";
          const p = Lr.P[i][j];
          return '<td class="heat" style="--a:' + p.toFixed(3) + '">' + Math.round(p * 100) + "%</td>";
        }).join("") + "</tr>").join("");
      return '<div class="qd-scroll"><table class="pf-table pf-attn pf-grid">' + head + body + "</table></div>";
    }

    function picker(m, sel) {
      if (m.live.length < 2) return "";
      return '<div class="qd-row pf-pick"><span class="qd-hint">' + T("算式示例：", "Worked example for:") + '</span>' + m.live.map((j) =>
        '<button type="button" class="qd-btn" data-pick="' + j + '" aria-pressed="' + (j === sel) + '">' + esc(m.tokens[j]) + "</button>").join("") + "</div>";
    }

    function render() {
      const m = MODES[mode], s = STEPS[step], l = s.l, run = m.run, Lr = run.L[l];
      const sel = pick !== null && m.live.includes(pick) ? pick : m.live[m.live.length - 1];
      const tSel = m.tokens[sel], n = l + 1;
      let body = "", note = "";

      if (s.kind === "input") {
        body = vecTable("x" + sup(0) + T("：每个 token 查表得到一个向量", ": each token looked up as a vector"), "x", m, run.xs[0], { cachedNote: T("已经处理过，它的 K 和 V 在每一层的 cache 里", "already processed; its K and V are in every layer's cache") });
        note = mode === "prefill"
          ? T("模型开始之前，prompt 的三个 token 就都已知了。每个 token 查表得到一个 4 个数的向量（Llama-3-8B 里是 4,096 个）。", "All three prompt tokens are known before the model starts. Each is looked up as a vector of 4 numbers (4,096 in Llama-3-8B).")
          : T('Decode 从刚生成的 token "too" 开始。前面的 token 不再重新输入：每一层的 cache 里已经有它们的 K 和 V。', 'Decode starts from the token just generated, "too". The earlier tokens are not fed in again: every layer already has their K and V in its cache.');
      } else if (s.kind === "qkv") {
        body = (l > 0 ? vecTable(T("第 " + n + " 层的输入：x" + sup(l) + "（第 " + l + " 层的输出）", "Input to layer " + n + ": x" + sup(l) + " (the output of layer " + l + ")"), "x", m, run.xs[l], { cachedNote: T("不需要：K 和 V 从这一层的 cache 读", "not needed: K and V come from this layer's cache") }) : "") +
          '<div class="pf-mats">' +
          vecTable("Q = x" + sup(l) + " × W_Q" + sup(n), "q", m, Lr.Q, { cachedNote: T("不需要 Q", "Q not needed") }) +
          vecTable("K = x" + sup(l) + " × W_K" + sup(n), "k", m, Lr.K) +
          vecTable("V = x" + sup(l) + " × W_V" + sup(n), "v", m, Lr.V) + "</div>";
        note = ZH
          ? (l === 0 ? "第 1 层第 1 步：" : "第 " + n + " 层又从第 1 步开始，用新的输入和它自己的权重：") +
            "每个 token 的向量乘以这一层的 W_Q、W_K、W_V。这一步每个 token 不需要别的 token，所以" +
            (mode === "prefill" ? "所有行就是一次矩阵乘法。" : '只算 "too" 这一行；前面的 K、V 行从第 ' + n + " 层的 cache 读。") +
            "新的 K 和 V 存进第 " + n + " 层的 cache。"
          : (l === 0 ? "Step 1 of layer 1: " : "Layer " + n + " starts again from step 1, with new inputs and its own weights: ") +
            "each token's vector is multiplied by this layer's W_Q, W_K and W_V. No token needs another token here, so " +
            (mode === "prefill" ? "all rows are one matrix multiply." : 'only the "too" row is computed; the earlier K and V rows are read from layer ' + n + "'s cache.") +
            " The new K and V are stored in layer " + n + "'s cache.";
      } else if (s.kind === "score") {
        const q = Lr.Q[sel], j0 = 0, k = Lr.K[j0];
        body = picker(m, sel) + scoreTable(m, Lr, false, sel) +
          '<p class="pf-work">score(Q<sub>' + esc(tSel) + "</sub>, K<sub>" + esc(m.tokens[j0]) + "</sub>) = (" +
          q.map((qi, c) => f2(qi) + "×" + f2(k[c])).join(" + ") + ") / √4 = <b>" + f2(Lr.S[sel][j0]) + "</b></p>";
        note = T("第 2 步，attention。① 打分：每个 Q 跟它自己以及它前面每个 token 的 K 比较（点积，再除以 √d = 2，免得数字太大）。表里的「·」表示后面的 token，看不到。Q 不重新算：第 2 步只用第 1 步算好的东西。", "Step 2, attention. ① Score: each Q is compared with every K at or before its position (dot product, divided by √d = 2 so the numbers do not get too big). A “·” in the table = a later token, not visible. Q is not recomputed: step 2 only uses what step 1 made.");
      } else if (s.kind === "softmax") {
        const sc = Lr.S[sel].slice(0, sel + 1), st = sc.map((v) => (Math.abs(v) < 0.0005 ? "0.000" : v.toFixed(3))), ex = st.map((v) => Number(Math.exp(parseFloat(v)).toFixed(2))), z = ex.reduce((a, b) => a + b, 0);
        const names = m.tokens.slice(0, sel + 1);
        body = picker(m, sel) + scoreTable(m, Lr, true, sel) +
          '<p class="pf-work">' + esc(tSel) + T(" 的分数：", "'s scores: ") + st.map((v, j) => esc(names[j]) + " " + v).join(", ") + "<br>" +
          T("a. 每个分数取 e 的次方：", "a. e to the power of each score: ") + st.map((v, j) => "e<sup>" + v + "</sup> = " + ex[j].toFixed(2)).join(", ") + "<br>" +
          T("b. 加起来：", "b. add them up: ") + ex.map((v) => v.toFixed(2)).join(" + ") + " = " + z.toFixed(2) + "<br>" +
          T("c. 每个除以总和：", "c. divide each by the total: ") + ex.map((v, j) => esc(names[j]) + " " + v.toFixed(2) + " / " + z.toFixed(2) + " = <b>" + Math.round(Lr.P[sel][j] * 100) + "%</b>").join(", ") + "</p>";
        note = T("② Softmax：每一行分数变成加起来等于 100% 的比例。取 e 的次方让每个分数都变成正数，分数越高分到的比例越大；除以总和让比例加起来是 100%。颜色越深，表示这个 token 从那个 token 拿得越多。", "② Softmax: each row of scores becomes shares that add up to 100%. e to the power makes every score positive and makes a higher score win a bigger share; dividing by the total makes the shares add up to 100%. A darker cell means this token takes more from that token.");
      } else if (s.kind === "mix") {
        const p = Lr.P[sel];
        const terms = m.tokens.slice(0, sel + 1).map((t, j) => p[j].toFixed(2) + " × V<sub>" + esc(t) + "</sub>").join(" + ");
        body = picker(m, sel) + vecTable(T("Attention 结果（每个 token 一个向量）", "Attention result (one vector per token)"), "o", m, Lr.O, { cachedNote: T("不重新算", "not recomputed") }) +
          '<p class="pf-work">' + esc(tSel) + ": " + terms + " = <b>" + vec(Lr.O[sel]) + "</b></p>";
        note = T("③ 混合：每个 token 按自己的比例把 V 向量加起来。结果是一个向量，不是一个数：长度跟 V 一样。", "③ Mix: each token adds up the V vectors using its shares. The result is a vector, not a single number: same length as V.");
      } else if (s.kind === "add") {
        const rows = m.live.map((i) => '<tr class="now"><th>' + esc(m.tokens[i]) + "</th><td>" + vec(run.xs[l][i]) + "</td><td>+</td><td>" + vec(Lr.O[i]) + "</td><td>=</td><td><b>" + vec(run.xs[l + 1][i]) + "</b></td></tr>").join("");
        body = '<div class="qd-scroll"><table class="pf-table pf-nums pf-add"><tr><th></th><th>x' + sup(l) + "</th><th></th><th>attention</th><th></th><th>x" + sup(n) + "</th></tr>" + rows + "</table></div>";
        note = ZH
          ? "Attention 结果是加到（不是乘到）每个 token 自己的向量上：x" + sup(n) + " = x" + sup(l) + " + attention。每个 token 还在原来的位置，只是混进了前面 token 的一些信息。" +
            (n < LAYERS ? "第 " + (n + 1) + " 层拿到的就只有 x" + sup(n) + "。这一层的 Q、K、V 用完了。" : "这是这里的最后一层（Llama-3-8B 有 32 层）。")
          : "The attention result is added to (not multiplied with) each token's own vector: x" + sup(n) + " = x" + sup(l) + " + attention. Each token keeps its place, now with some of the earlier tokens mixed in." +
            (n < LAYERS ? " x" + sup(n) + " is everything layer " + (n + 1) + " gets. This layer's Q, K and V are finished." : " That was the last layer here (Llama-3-8B has 32).");
      } else {
        const last = m.live[m.live.length - 1];
        body = '<p class="pf-work">x' + sup(LAYERS) + " of \"" + esc(m.tokens[last]) + "\" = <b>" + vec(run.xs[LAYERS][last]) + '</b></p><div class="pf-out on">' + T("下一个 token：", "Next token: ") + '<span class="pf-tok hot">' + esc(m.next) + "</span></div>";
        note = ZH
          ? "最后一层之后，只用最后一个位置的向量。模型把它变成词表里每个词的概率，然后挑出下一个词。（这里的权重是随机的，所以只有计算的流程是真的；真正挑出 \"" + m.next + "\" 的是训练过的模型。）" +
            (mode === "decode" ? "这个 token 出来之前，下一步没法开始，所以 decode 每步只出一个 token。" : "")
          : "After the last layer, only the vector at the last position is used. The model turns it into a probability for every word in its vocabulary and picks the next one. (The weights here are random, so only the shape of the computation is real; a trained model is what picks \"" + m.next + "\".)" +
            (mode === "decode" ? " The next step cannot start until this token exists, so decode makes one token per step." : "");
      }

      // One KV cache per layer; it fills as each layer's step 1 runs.
      const caches = Array.from({ length: LAYERS }, (_, k) => {
        const done = k < l || (k === l && s.kind !== "input");
        const toks = m.tokens.filter((_, i) => !m.live.includes(i) || done);
        return '<div class="pf-crow"><span>' + T("第 " + (k + 1) + " 层", "Layer " + (k + 1)) + "</span>" + (toks.length ? toks.map((t) => {
          const fresh = k === l && s.kind === "qkv" && m.live.includes(m.tokens.indexOf(t));
          return '<span class="pf-chip' + (fresh ? " fresh" : "") + '">' + esc(t) + "</span>";
        }).join("") : '<span class="qd-hint">' + T("空", "empty") + '</span>') + "</div>";
      }).join("");

      const title = s.kind === "input" ? T("输入", "Input") : s.kind === "out" ? T("下一个 token", "Next token") :
        T("第 " + n + " 层", "Layer " + n) + " · " + (ZH
          ? { qkv: "第 1 步：Q、K、V", score: "第 2 步 ① 打分", softmax: "第 2 步 ② softmax", mix: "第 2 步 ③ 混合 V", add: "新向量" }
          : { qkv: "Step 1: Q, K, V", score: "Step 2 ① score", softmax: "Step 2 ② softmax", mix: "Step 2 ③ mix V", add: "New vector" })[s.kind];
      const modes = Object.keys(MODES).map((k) =>
        '<button type="button" class="qd-btn" data-mode="' + k + '" aria-pressed="' + (k === mode) + '">' + esc(MODES[k].label) + "</button>").join("");
      const layerTabs = Array.from({ length: LAYERS }, (_, k) =>
        '<button type="button" class="qd-btn" data-layer="' + k + '" aria-pressed="' + (s.kind !== "input" && s.kind !== "out" && k === l) + '">' + T("第 " + (k + 1) + " 层", "Layer " + (k + 1)) + "</button>").join("");

      el.innerHTML =
        '<div class="qd-row">' + modes + "</div>" +
        '<div class="qd-nav"><span class="qd-hint">' + T("第 " + (step + 1) + " / " + STEPS.length + " 步", "Step " + (step + 1) + " of " + STEPS.length) + '</span><div class="qd-row">' +
        '<button type="button" class="qd-btn" data-go="-1"' + (step === 0 ? " disabled" : "") + ">" + T("上一步", "Back") + "</button>" +
        '<button type="button" class="qd-btn primary" data-go="1"' + (step === STEPS.length - 1 ? " disabled" : "") + ">" + T("下一步", "Next") + "</button></div></div>" +
        '<div class="pf-top"><div class="qd-row pf-layers">' + layerTabs + '</div><div class="pf-caches"><div class="pf-mh">' + T("KV cache（每层一个）", "KV cache (one per layer)") + '</div>' + caches + "</div></div>" +
        '<div class="pf-panel on"><div class="pf-h">' + title + "</div>" + body + "</div>" +
        '<p class="' + (s.kind === "out" ? "qd-key" : "qd-text") + ' pf-note">' + note + "</p>" +
        '<p class="qd-hint">' + T("缩小版：每个向量 4 个数（不是 4,096），3 层（不是 32 层）。第 1 层用手选的权重，让比例更清楚；其余是随机的。省略了 feed-forward 和归一化。", "Scaled down: 4 numbers per vector instead of 4,096, 3 layers instead of 32. Layer 1 uses hand-picked weights so the shares are clear; the rest are random. Feed-forward and normalization are left out.") + '</p>';
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.mode) { mode = b.dataset.mode; step = 0; pick = null; }
      else if (b.dataset.pick) pick = +b.dataset.pick;
      else if (b.dataset.layer) step = 1 + +b.dataset.layer * KINDS.length;
      else if (b.dataset.go) step = Math.max(0, Math.min(STEPS.length - 1, step + +b.dataset.go));
      render();
    });
    render();
  }

  document.querySelectorAll("[data-pf-demo]").forEach(mount);
})();
