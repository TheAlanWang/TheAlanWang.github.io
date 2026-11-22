// Multi-head attention for the Forward Pass post. Mounts into [data-mh-demo].
// Takes layer 0's Q, K and V from the tiny model (assets/notes/tiny-llama.js) and runs attention two ways:
// as 1 head over all 4 numbers, and as 2 heads that each use their own 2 of the 4 numbers.
(function () {
  const T = window.TinyLlama;
  if (!T) return;
  const ZH = (document.documentElement.lang || "").startsWith("zh");
  const { esc, fmt2 } = T;
  const TOKENS = ["I", "like", "cats"];
  const L = T.forward(TOKENS).layers[0];
  const sub = T.sub;
  const softmax = (s) => { const m = Math.max(...s), e = s.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / z); };
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

  // One head over the numbers in `cols`: scores for token i against every earlier token, shares, and the mixed V.
  function head(i, cols) {
    const pick = (v) => cols.map((c) => v[c]);
    const q = pick(L.Q[i]);
    const scores = TOKENS.slice(0, i + 1).map((_, j) => dot(q, pick(L.K[j])) / Math.sqrt(cols.length));
    const shares = softmax(scores);
    const mixed = cols.map((c) => shares.reduce((s, p, j) => s + p * L.V[j][c], 0));
    return { cols, q, scores, shares, mixed };
  }

  function mount(el) {
    let heads = 2, sel = 2, size = "demo";

    const vecRow = (label, v, cls) => '<tr><th>' + label + "</th>" + v.map((x, c) => '<td class="' + cls(c) + '">' + fmt2(x) + "</td>").join("") + "</tr>";
    const colCls = (c) => (heads === 2 ? (c < 2 ? "mh-h1" : "mh-h2") : "");

    // A matrix drawn as a small grid of cells, labelled "name rows×cols". cls colours it by head.
    const box = (name, r, c, cls, hiRow) => {
      let cells = "";
      for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) cells += '<i class="' + (hiRow === i ? "hi" : "") + '"></i>';
      return '<span class="mh-box ' + (cls || "") + '"><span class="mh-m" style="grid-template-columns:repeat(' + c + ', 8px)">' + cells + "</span><b>" + name + "</b><em>" + r + "×" + c + "</em></span>";
    };
    const op = (t) => '<span class="mh-op">' + t + "</span>";
    // The shapes, step by step. Rows are tokens (3), columns are numbers per vector (4) or per head (2).
    function shapeFlow() {
      const n = TOKENS.length, hi = sel;
      const sm = ZH ? "softmax" : "softmax";
      const line = (cls, q, k, v, a, w) => '<div class="mh-line">' +
        box(q, n, w, cls, hi) + op("·") + box(k + "ᵀ", w, n, cls) + op("=") + box(ZH ? "分数" : "scores", n, n, cls, hi) +
        op("→ " + sm + " →") + box(ZH ? "比例" : "shares", n, n, cls, hi) + op("×") + box(v, n, w, cls) + op("=") + box(a, n, w, cls, hi) + "</div>";
      const legend = '<p class="qd-hint">' + (ZH ? "行 = token（I、like、cats，3 行）；列 = 每个向量的数（4 个）" + (heads === 2 ? "，每个 head 只拿其中 2 个" : "") + "。高亮的那一行是 " + esc(TOKENS[sel]) + "，下面的表就是这一行的计算。Kᵀ 是 K 的转置（行变成列），这样 Q 的一行乘 Kᵀ 的一列就是两个 token 的点积。"
        : "Rows = tokens (I, like, cats: 3 rows); columns = numbers per vector (4)" + (heads === 2 ? ", each head takes 2 of them" : "") + ". The highlighted row is " + esc(TOKENS[sel]) + "; the tables below compute that row. Kᵀ is K transposed (rows become columns), so a row of Q times a column of Kᵀ is two tokens' dot product.") + "</p>";
      if (heads === 1) return '<div class="mh-flow">' + line("", "Q", "K", "V", "A", 4) + "</div>" + legend;
      return '<div class="mh-flow">' +
        '<div class="mh-tag mh-h1">head 1</div>' + line("c1", "Q₁Q₂", "K₁K₂", "V₁V₂", "A₁A₂", 2) +
        '<div class="mh-tag mh-h2">head 2</div>' + line("c2", "Q₃Q₄", "K₃K₄", "V₃V₄", "A₃A₄", 2) +
        '<div class="mh-tag">' + (ZH ? "拼起来" : "join") + "</div>" + '<div class="mh-line">' + box("A₁A₂", n, 2, "c1", hi) + op("+") + box("A₃A₄", n, 2, "c2", hi) + op("=") +
        box("A", n, 4, "", hi) + op("×") + box("o_proj", 4, 4, "") + op("=") + box("O", n, 4, "", hi) + "</div></div>" + legend;
    }

    // A big matrix drawn with ellipses: vr × vc visual cells, the second-to-last row and column stand for "many more".
    const ebox = (name, dimsText, vr, vc, cls) => {
      let cells = "";
      for (let i = 0; i < vr; i++) for (let j = 0; j < vc; j++) {
        const er = i === vr - 2, ec = j === vc - 2;
        cells += er || ec ? '<i class="dots">' + (er && ec ? "⋱" : er ? "⋮" : "⋯") + "</i>" : "<i></i>";
      }
      return '<span class="mh-box ' + (cls || "") + '"><span class="mh-m" style="grid-template-columns:repeat(' + vc + ', 8px)">' + cells + "</span><b>" + name + "</b><em>" + dimsText + "</em></span>";
    };
    // Llama-3-8B: 4096 = 32 Q heads × 128; K and V 1024 = 8 heads × 128; every 4 Q heads share one K/V head.
    function realFlow() {
      const N = "n";
      const head = (k, g, cls) => '<div class="mh-tag ' + (cls === "c1" ? "mh-h1" : cls === "c2" ? "mh-h2" : "") + '">head ' + k + (ZH ? "（用第 " + g + " 组 K、V）" : " (uses K/V group " + g + ")") + "</div>" +
        '<div class="mh-line">' + ebox("Q" + sub(k), N + "×128", 4, 3, cls) + op("·") + ebox("K" + sub(g) + "ᵀ", "128×" + N, 3, 4, cls) + op("=") + ebox(ZH ? "分数" : "scores", N + "×" + N, 4, 4, cls) +
        op("→ softmax →") + ebox(ZH ? "比例" : "shares", N + "×" + N, 4, 4, cls) + op("×") + ebox("V" + sub(g), N + "×128", 4, 3, cls) + op("=") + ebox("A" + sub(k), N + "×128", 4, 3, cls) + "</div>";
      return '<div class="mh-flow">' +
        '<div class="mh-tag">' + (ZH ? "① 乘矩阵，再切成 head" : "① Multiply, then cut into heads") + "</div>" +
        '<div class="mh-line">' + ebox("x̂", N + "×4096", 4, 6) + op("×") + ebox("q_proj", "4096×4096", 6, 6) + op("=") + ebox("Q", N + "×4096", 4, 6) +
        op(ZH ? "→ 切成 32 份，每份 " + N + "×128" : "→ 32 pieces of " + N + "×128") + "</div>" +
        '<div class="mh-line">' + ebox("x̂", N + "×4096", 4, 6) + op("×") + ebox("k_proj", "4096×1024", 6, 4) + op("=") + ebox("K", N + "×1024", 4, 4) +
        op(ZH ? "→ 切成 8 份，每份 " + N + "×128（V 一样）" : "→ 8 pieces of " + N + "×128 (V the same)") + "</div>" +
        '<div class="mh-tag">' + (ZH ? "② 每个 Q head 各算一遍（共 32 个）" : "② Each Q head on its own (32 of them)") + "</div>" +
        head(1, 1, "c1") + head(2, 1, "c1") + '<div class="mh-tag">⋮ ' + (ZH ? "head 3、4 也用第 1 组；head 5～8 用第 2 组……" : "heads 3, 4 also use group 1; heads 5-8 use group 2 …") + "</div>" + head(32, 8, "c2") +
        '<div class="mh-tag">' + (ZH ? "③ 拼起来" : "③ Join") + "</div>" +
        '<div class="mh-line">' + ebox("A" + sub(1), N + "×128", 4, 3, "c1") + op("+ … +") + ebox("A" + sub(32), N + "×128", 4, 3, "c2") + op("=") + ebox("A", N + "×4096", 4, 6) + op("×") +
        ebox("o_proj", "4096×4096", 6, 6) + op("=") + ebox("O", N + "×4096", 4, 6) + "</div></div>" +
        '<p class="qd-hint">' + (ZH ? "n = token 数（prompt 有多少个 token）。4096 ÷ 128 = 32 个 Q head；1024 ÷ 128 = 8 组 K、V；32 ÷ 8 = 每 4 个 Q head 共用一组（GQA）。每个 head 的分数表都是 n × n，一共 32 张。"
          : "n = number of tokens in the prompt. 4096 ÷ 128 = 32 Q heads; 1024 ÷ 128 = 8 K/V heads; 32 ÷ 8 = every 4 Q heads share one (GQA). Every head's score table is n × n: 32 of them.") + "</p>";
    }

    function card(h, k) {
      const i = sel, t = TOKENS[i];
      const name = heads === 1 ? (ZH ? "1 个 head：用全部 4 个数" : "1 head: all 4 numbers") : "head " + (k + 1) + (ZH ? "：只用 " : ": only ") + h.cols.map((c) => "Q" + sub(c + 1)).join("") + (ZH ? " 和 " : " and ") + h.cols.map((c) => "K" + sub(c + 1)).join("");
      const rows = TOKENS.slice(0, i + 1).map((u, j) =>
        "<tr><th>K<sub>" + esc(u) + "</sub></th><td>" + fmt2(h.scores[j]) + "</td><td><b>" + Math.round(h.shares[j] * 100) + '%</b></td><td class="mw-barcell"><span class="mw-bar"><i style="width:' + (h.shares[j] * 100).toFixed(1) + '%"></i></span></td></tr>').join("");
      const aLab = h.cols.map((c) => "A" + sub(c + 1)).join("");
      return '<div class="mh-card' + (heads === 2 ? " mh-c" + (k + 1) : "") + '"><div class="pf-mh">' + name + "</div>" +
        '<div class="qd-scroll"><table class="mw-dot mh-score"><tr><th></th><th>' + (ZH ? "分数" : "score") + "</th><th>" + (ZH ? "比例" : "share") + "</th><th></th></tr>" + rows + "</table></div>" +
        '<p class="pf-work">' + (ZH ? "分数 = " : "score = ") + h.cols.map((c) => "Q" + sub(c + 1)).join("") + " · " + h.cols.map((c) => "K" + sub(c + 1)).join("") + " ÷ √" + h.cols.length +
        "<br>" + aLab + " = " + (ZH ? "按比例混合 " : "mix ") + h.cols.map((c) => "V" + sub(c + 1)).join("") + " = <b>[" + h.mixed.map(fmt2).join(", ") + "]</b></p></div>";
    }

    function render() {
      const i = sel, t = TOKENS[i];
      const hs = heads === 1 ? [head(i, [0, 1, 2, 3])] : [head(i, [0, 1]), head(i, [2, 3])];
      const A = hs.reduce((a, h) => a.concat(h.mixed), []);
      const dimsHead = "<tr><th></th>" + [0, 1, 2, 3].map((c) => '<th class="' + colCls(c) + '">' + (ZH ? "第 " + (c + 1) + " 个数" : "#" + (c + 1)) + "</th>").join("") + "</tr>";
      const btn = (attr, val, cur, lab) => '<button type="button" class="qd-btn" data-' + attr + '="' + val + '" aria-pressed="' + (cur === val) + '">' + lab + "</button>";

      const sizeRow = '<div class="qd-row">' + btn("size", "demo", size, ZH ? "demo 尺寸（4 个数）" : "Demo size (4 numbers)") + btn("size", "real", size, ZH ? "Llama-3-8B 真实尺寸" : "Llama-3-8B real size") + "</div>";
      if (size === "real") { el.innerHTML = sizeRow + realFlow(); return; }
      el.innerHTML = sizeRow +
        '<div class="qd-row">' + btn("heads", 1, heads, ZH ? "1 个 head" : "1 head") + btn("heads", 2, heads, ZH ? "2 个 head" : "2 heads") + "</div>" +
        '<div class="qd-row pf-pick"><span class="qd-hint">' + (ZH ? "看哪个 token：" : "Token:") + "</span>" + TOKENS.map((u, j) => btn("pick", j, sel, esc(u))).join("") + "</div>" +
        '<p class="qd-text pf-note">' + (heads === 1
          ? (ZH ? t + " 只问一个问题：用 Q 的全部 4 个数跟每个 K 打分，得到一组比例，按这组比例混合 V。（跟上面 demo 第 0 层是同一个计算。）"
                : t + " asks one question: all 4 numbers of Q are scored against each K, giving one set of shares, and V is mixed by them. (The same as layer 0 in the demo above.)")
          : (ZH ? "同样的 Q、K、V，切成两半。" + t + " 同时问两个问题：head 1 只用前两个数（蓝色），head 2 只用后两个数（橙色），各自打分、各自算比例、各自混合 V。两组比例不一样，最后把两个结果拼起来。"
                : "The same Q, K and V, cut in half. " + t + " asks two questions at once: head 1 uses only the first two numbers (blue), head 2 only the last two (orange). Each scores, takes shares and mixes V on its own. The two sets of shares differ; the two results are joined at the end.")) + "</p>" +
        shapeFlow() +
        '<div class="qd-scroll"><table class="mw-dot mh-vecs">' + dimsHead +
        vecRow("Q<sub>" + esc(t) + "</sub>", L.Q[i], colCls) +
        TOKENS.slice(0, i + 1).map((u, j) => vecRow("K<sub>" + esc(u) + "</sub>", L.K[j], colCls)).join("") +
        TOKENS.slice(0, i + 1).map((u, j) => vecRow("V<sub>" + esc(u) + "</sub>", L.V[j], colCls)).join("") +
        "</table></div>" +
        '<div class="pf-mats">' + hs.map(card).join("") + "</div>" +
        '<div class="mw-formula"><div class="mw-feq">A<sub>' + esc(t) + "</sub> = [" + A.map((v, c) => '<span class="' + colCls(c) + '">' + fmt2(v) + "</span>").join(", ") + "]</div>" +
        '<div class="mw-fsteps">' + (heads === 1
          ? (ZH ? "一组比例混合出 4 个数。" : "One set of shares mixes all 4 numbers.")
          : (ZH ? "A₁A₂ 来自 head 1，A₃A₄ 来自 head 2，首尾拼起来还是 4 个数，再交给 o_proj 混合。" : "A₁A₂ from head 1, A₃A₄ from head 2: joined, still 4 numbers, then o_proj mixes them.")) + "</div></div>" +
        '<p class="qd-hint">' + (ZH ? "Llama-3-8B 有 32 个 head，每个用 128 个数。它还用了 GQA：K、V 只有 8 组 head，每 4 个 Q head 共用一组。这个 demo 里每个 head 都有自己的那一半 K、V。"
                                 : "Llama-3-8B has 32 heads of 128 numbers each. It also uses GQA: K and V have only 8 heads, each shared by 4 Q heads. In this demo each head has its own half of K and V.") + "</p>";
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.size) size = b.dataset.size;
      else if (b.dataset.heads) heads = +b.dataset.heads;
      else if (b.dataset.pick) sel = +b.dataset.pick;
      render();
    });
    render();
  }

  document.querySelectorAll("[data-mh-demo]").forEach(mount);
})();
