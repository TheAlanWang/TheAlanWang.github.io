// Forward pass for the Forward Pass post. Mounts into [data-mw-forward].
// Runs the tiny model (assets/notes/tiny-llama.js) on "I like cats" step by step. Every step names
// the stored tensor it uses, so it lines up with the Model File demo in the Model Weights post.
(function () {
  const T = window.TinyLlama;
  if (!T) return;
  const ZH = (document.documentElement.lang || "").startsWith("zh"); // the .zh.md page sets <html lang="zh-Hans">
  const { esc, fmt2 } = T;
  const TOKENS = ["I", "like", "cats"];
  const run = T.forward(TOKENS);
  const dims = (p, n) => Array.from({ length: n }, (_, i) => p + T.sub(i + 1));
  const KINDS = ["norm1", "qkv", "score", "softmax", "mix", "oproj", "norm2", "ffn"];
  const STEPS = [{ kind: "lookup" }];
  // Layer 0 is shown step by step; every later layer repeats the same six steps with its own weights, so it gets one summary step.
  KINDS.forEach((k) => STEPS.push({ kind: k, l: 0 }));
  for (let l = 1; l < T.LAYERS; l++) STEPS.push({ kind: "layer", l });
  STEPS.push({ kind: "output" });
  const tn = (l, n) => "model.layers." + l + "." + n + ".weight";

  function mount(el) {
    let step = 0, sel = 2, view = "grid", mat = "q", col = 0, kSel = 0, size = "demo";

    // "← where this comes from" line under a table title.
    const S = (zh, en) => '<div class="mw-srcline">\u2190 ' + (ZH ? zh : en) + "</div>";
    const vecTable = (title, cls, rows, cols, opt) => {
      opt = opt || {};
      const head = "<tr><th></th>" + cols.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>";
      const body = rows.map((r, i) => '<tr class="' + (i === sel ? "sel" : "") + '"><th>' + esc(TOKENS[i]) + "</th>" + r.map((v, c) => {
        const z = opt.zeroed && opt.zeroed[i][c];
        return '<td class="' + (z ? "zero" : opt.neg && v < 0 ? "neg" : "") + '">' + fmt2(v) + "</td>";
      }).join("") + "</tr>").join("");
      return '<div class="pf-mat ' + cls + '"><div class="pf-mh">' + title + "</div>" + (opt.src || "") + '<div class="qd-scroll"><table class="pf-table pf-nums">' + head + body + "</table></div></div>";
    };
    const weight = (name, label) => {
      const t = T.tensor(name);
      const body = view === "lines" ? '<div class="mw-svgwrap">' + T.linesSvg(t, {}) + "</div>" :
        '<div class="qd-scroll"><table class="mw-grid"><tr><th></th>' + t.colLabels.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>" +
        t.values.map((row, r) => "<tr><th>" + esc(t.rowLabels[r]) + "</th>" + row.map((v) => '<td class="' + (v < 0 ? "neg" : "") + '">' + v.toFixed(1) + "</td>").join("") + "</tr>").join("") + "</table></div>";
      return '<div class="pf-mat"><div class="pf-mh">' + label + " (" + t.math.join(" × ") + ")</div>" + body + "</div>";
    };
    // "out[c] = x1×w1 + x2×w2 + … = result" for one cell of x × W.
    const cell = (label, x, name, c, result) => {
      const W = T.tensor(name).values;
      return '<p class="pf-work">' + label + " = " + x.map((xi, r) => fmt2(xi) + "×" + W[r][c].toFixed(1)).join(" + ") + " = <b>" + fmt2(result) + "</b></p>";
    };
    const picker = () => '<div class="qd-row pf-pick"><span class="qd-hint">' + (ZH ? "算式示例：" : "Worked example for:") + '</span>' + TOKENS.map((t, j) =>
      '<button type="button" class="qd-btn" data-pick="' + j + '" aria-pressed="' + (j === sel) + '">' + esc(t) + "</button>").join("") + "</div>";
    // The full attention formula, with the part the current step computes highlighted (1 score, 2 softmax, 3 mix).
    const formula = (part) => {
      const on = (k) => ' class="mw-f' + k + (k === part ? " on" : "") + '"';
      const steps = ZH ? ["① 打分", "② softmax：变成比例", "③ × V：按比例混合 V"] : ["① score", "② softmax: turn into shares", "③ × V: mix the V's by those shares"];
      return '<div class="mw-formula"><div class="mw-feq">A = <span' + on(2) + ">softmax(</span><span" + on(1) + ">Q·K<sup>T</sup> / √d</span><span" + on(2) + ">)</span> <span" + on(3) + ">× V</span></div>" +
        '<div class="mw-fsteps">' + steps.map((t, i) => "<span" + on(i + 1) + ">" + t + "</span>").join(" → ") + "</div></div>";
    };
    // Dimension-by-dimension mix: each visible V row, that row times its share, then the column sums = A.
    const mixTable = (p) => {
      const r3 = (v) => String(Math.round(v * 1000) / 1000);
      const L = run.layers[STEPS[step].l], t = TOKENS[sel];
      const rows = [], sums = [0, 0, 0, 0];
      TOKENS.slice(0, sel + 1).forEach((u, j) => {
        const pj = Number(p[j].toFixed(2)), v = L.V[j].map((x) => Number(fmt2(x)));
        const prod = v.map((x) => x * pj);
        prod.forEach((x, c) => { sums[c] += x; });
        rows.push('<tr class="v"><th>V<sub>' + esc(u) + "</sub></th>" + v.map((x) => "<td>" + fmt2(x) + "</td>").join("") +
          '<td class="mw-src">' + (ZH ? "← 左边 V 表里 " + esc(u) + " 那一行" : "← " + esc(u) + "'s row in the V table") + "</td></tr>");
        rows.push('<tr class="p"><th>× ' + pj.toFixed(2) + "</th>" + prod.map((x) => "<td>" + r3(x) + "</td>").join("") +
          '<td class="mw-src">' + (ZH ? "← 每个数乘上 " + esc(u) + " 的比例 " + pj.toFixed(2) + "（② softmax）" : "← each number times " + esc(u) + "'s share " + pj.toFixed(2) + " (② softmax)") + "</td></tr>");
      });
      rows.push('<tr class="p sum"><th>' + (ZH ? "相加" : "add up") + "</th>" + sums.map((x) => "<td>" + r3(x) + "</td>").join("") +
        '<td class="mw-src">' + (ZH ? "每一列上下加起来 = A<sub>" + esc(t) + "</sub> ≈ " : "each column added up = A<sub>" + esc(t) + "</sub> ≈ ") + "<b>[" + L.A[sel].map(fmt2).join(", ") + "]</b></td></tr>");
      return '<div class="qd-scroll"><table class="mw-dot">' + rows.join("") + "</table></div>";
    };
    // Residual add, dimension by dimension, for the picked token: its own x row + its own O row = new x.
    const addTable = (xv, ov, out, xSrc, oSrc, outName) => {
      const t = TOKENS[sel], xs = xv.map((v) => Number(fmt2(v))), os = ov.map((v) => Number(fmt2(v)));
      const row = (lab, v, cls, src) => '<tr class="' + cls + '"><th>' + lab + "</th>" + v.map((x) => "<td>" + fmt2(x) + "</td>").join("") + '<td class="mw-src">' + src + "</td></tr>";
      return '<div class="qd-scroll"><table class="mw-dot">' +
        row("x<sub>" + esc(t) + "</sub>", xs, "q", xSrc) +
        row(" + " + outName + "<sub>" + esc(t) + "</sub>", os, "k", oSrc) +
        row(ZH ? "相加" : "add up", xs.map((x, c) => x + os[c]), "p sum", (ZH ? "每一列上下加起来 = 新的 x<sub>" : "each column added up = new x<sub>") + esc(t) + "</sub> ≈ <b>[" + out.map(fmt2).join(", ") + "]</b>") +
        "</table></div>";
    };
    // Softmax over the 8 word scores, written out: score, e^score, the total, then each e^score / total.
    const softmaxTable = () => {
      const w = T.softmaxWorking(run.logits);
      const order = T.VOCAB.map((_, i) => i).sort((a, b) => run.probs[b] - run.probs[a]);
      const head = "<tr><th>" + (ZH ? "词" : "word") + "</th><th>" + (ZH ? "分数" : "score") + "</th><th>e<sup>" + (ZH ? "分数" : "score") + "</sup></th><th>÷ " + w.totalText + "</th><th></th></tr>";
      const rows = order.map((i) => '<tr class="' + (T.VOCAB[i] === run.next ? "win" : "") + '"><th>' + esc(T.VOCAB[i]) + "</th><td>" + w.scoreText[i] + "</td><td>" + w.expText[i] + "</td><td><b>≈ " + w.shares[i] + '%</b></td><td class="mw-barcell"><span class="mw-bar"><i style="width:' + (run.probs[i] * 100).toFixed(1) + '%"></i></span></td></tr>').join("");
      const total = '<tr class="p sum"><th>' + (ZH ? "总和" : "total") + "</th><td></td><td>" + w.totalText + "</td><td>100%</td><td></td></tr>";
      return '<div class="mw-formula"><div class="mw-feq">' + (ZH ? "概率 = e<sup>分数</sup> ÷ 所有 e<sup>分数</sup> 的总和" : "probability = e<sup>score</sup> ÷ the total of all e<sup>score</sup>") + "</div></div>" +
        S("分数来自上面的 x × lm_head；跟 attention 的 ② softmax 是同一种算法", "the scores come from x × lm_head above; the same softmax as attention step ②") +
        '<div class="qd-scroll"><table class="mw-dot mw-soft">' + head + rows + total + "</table></div>";
    };
    // RMSNorm written out for one vector: x, x squared, their mean, the RMS, x / RMS, times the stored weight.
    const normWork = (x, g, out, xName) => {
      const r3 = (v) => String(Math.round(v * 1000) / 1000);
      const xs = x.map((v) => Number(fmt2(v))), sq = xs.map((v) => v * v), mean = sq.reduce((a, b) => a + b, 0) / xs.length, rms = Math.sqrt(mean + T.EPS);
      const row = (lab, v, cls, src) => '<tr class="' + cls + '"><th>' + lab + "</th>" + v.map((c) => "<td>" + c + "</td>").join("") + '<td class="mw-src">' + src + "</td></tr>";
      return '<div class="qd-scroll"><table class="mw-dot">' +
        row(xName, xs.map(fmt2), "q", ZH ? "← 归一化之前的 x" : "← x before normalizing") +
        row("x²", sq.map(r3), "", ZH ? "← 每个数自己乘自己" : "← each number times itself") +
        '<tr class="p"><th>RMS</th><td colspan="4" class="mw-rms">√((' + sq.map(r3).join(" + ") + ") ÷ 4 + ε) = √" + r3(mean) + " = <b>" + r3(rms) + "</b></td>" +
        '<td class="mw-src">' + (ZH ? "← 均方根：平方的平均数，再开根号（ε = 0.00001，防止除以 0）" : "← root mean square: the mean of the squares, then the square root (ε = 0.00001 avoids dividing by 0)") + "</td></tr>" +
        row("÷ " + r3(rms), xs.map((v) => r3(v / rms)), "p", ZH ? "← 每个数除以 RMS：整个向量的 RMS 变成 1（单个数可以大于或小于 1）" : "← each number divided by the RMS: the whole vector's RMS becomes 1 (single numbers can be above or below 1)") +
        row("× w", g.map((v) => v.toFixed(1)), "k", ZH ? "← 文件里存的 norm 权重，每个维度一个数" : "← the stored norm weight, one number per dimension") +
        row(ZH ? "结果" : "result", out.map(fmt2), "p sum", ZH ? "上面两行逐个相乘" : "the two rows above, multiplied number by number") +
        "</table></div>";
    };
    const normStep = (l, which) => {
      const L = run.layers[l], t = TOKENS[sel], first = which === 1;
      const name = tn(l, first ? "input_layernorm" : "post_attention_layernorm");
      const xIn = first ? L.xIn : L.xMid, out = first ? L.xNorm1 : L.xNorm2;
      const X4 = dims("x", T.D);
      return '<div class="mw-formula"><div class="mw-feq">x̂ = x ÷ RMS(x) × w</div><div class="mw-fsteps">' +
        (ZH ? "RMS 是 root mean square（均方根）：先平方（去掉负号）→ 求平均（mean）→ 开根号（root），得到这组数的「典型大小」。除以它，典型大小就变成 1；再乘上存储的权重 w。" : "RMS is the root mean square: square each number (drops the sign) → take the mean → take the square root, giving the numbers' typical size. Dividing by it makes the typical size 1; then times the stored weight w.") +
        "</div></div>" + uses([name]) + picker() +
        normWork(xIn[sel], T.tensor(name).values, out[sel], "x<sub>" + esc(t) + "</sub>") +
        '<div class="pf-mats">' +
        vecTable(first ? (ZH ? "输入 x（" + (l === 0 ? "来自查表" : "第 " + (l - 1) + " 层的输出") + "）" : "Input x (" + (l === 0 ? "from the lookup" : "output of layer " + (l - 1)) + ")") : "x + O", "x", xIn, X4,
          { src: first ? (l === 0 ? S("查表得到的 x⁰", "x⁰ from the lookup step") : S("第 " + (l - 1) + " 层最后的「新的 x」", "the \"new x\" at the end of layer " + (l - 1))) : S("o_proj 那一步算出的 x + O", "x + O from the o_proj step") }) +
        vecTable(ZH ? "归一化后的 x̂" : "Normalized x̂", "x", out, X4, { src: S("左边每一行各做一遍上面的计算", "the working above, done for every row on the left") }) + "</div>";
    };
    // The step's explanation goes above the tables: right after the formula bar when the step has one, else first.
    const withNote = (body, note, key, extra) => {
      const p = '<p class="' + (key ? "qd-key" : "qd-text") + ' pf-note">' + note + "</p>" + (extra || "");
      const bar = '<div class="mw-formula">';
      if (!body.startsWith(bar)) return p + body;
      const end = body.indexOf("</div></div>") + "</div></div>".length;
      return body.slice(0, end) + p + body.slice(end);
    };
    const uses = (names) => (ZH ? '<p class="mw-uses">用到：' : '<p class="mw-uses">uses: ') + names.map((n) => "<code>" + esc(n) + "</code>").join(" ") + "</p>";
    const viewTabs = () => '<div class="qd-row"><button type="button" class="qd-btn" data-view="grid" aria-pressed="' + (view === "grid") + (ZH ? '">数字表格</button>' : '">Numbers</button>') +
      '<button type="button" class="qd-btn" data-view="lines" aria-pressed="' + (view === "lines") + (ZH ? '">圆圈连线</button></div>' : '">Circles and lines</button></div>');
    // Row times column: x stands next to the matrix (x's i-th number lines up with row i);
    // the chosen output column lights up, each cell shows x_i × w, and the column sum is that output number.
    const mulView = (x, name, out, outName, src) => {
      const t = T.tensor(name), W = t.values, c = Math.min(col, t.math[1] - 1);
      const r3 = (v) => String(Math.round(v * 1000) / 1000);
      const head = '<tr><th></th><th></th>' + t.colLabels.map((lab, j) => '<th class="' + (j === c ? "on" : "") + '"><button type="button" data-col="' + j + '">' + esc(lab) + "</button></th>").join("") + "</tr>";
      const rows = W.map((row, i) => '<tr><th>' + esc(t.rowLabels[i]) + '</th><td class="mw-xv">' + fmt2(x[i]) + " \u00d7</td>" + row.map((w, j) => {
        if (j !== c) return '<td class="' + (w < 0 ? "neg" : "") + '">' + w.toFixed(1) + "</td>";
        return '<td class="on"><span class="' + (w < 0 ? "neg" : "") + '">' + w.toFixed(1) + '</span><em>' + r3(Number(fmt2(x[i])) * w) + "</em></td>";
      }).join("") + "</tr>").join("");
      const sumRow = '<tr class="mw-sumrow"><th></th><td>' + (ZH ? "加起来" : "add up") + "</td>" + t.colLabels.map((_, j) => (j === c ? '<td class="on"><b>' + fmt2(out[j]) + "</b></td>" : "<td></td>")).join("") + "</tr>";
      const outRow = '<div class="mw-outvec">' + outName + " = [ " + out.map((v, j) => '<button type="button" data-col="' + j + '" class="' + (j === c ? "on" : "") + '">' + fmt2(v) + "</button>").join(" , ") + " ]</div>";
      return (src || "") + '<div class="qd-scroll"><table class="mw-mul">' + head + rows + sumRow + "</table></div>" + outRow +
        '<p class="qd-hint">' + (ZH ? "点上面的列名或下面的数字，换一个输出来算。x 本来是横着的一行，这里竖着贴在左边，只是为了跟矩阵的每一行对齐。"
                                 : "Click a column name or an output number to compute a different one. x is really one row; it stands on the left here only so each number lines up with its row.") + "</p>";
    };
    const matTabs = (l) => '<div class="qd-row">' + [["q", "q_proj \u2192 Q"], ["k", "k_proj \u2192 K"], ["v", "v_proj \u2192 V"]].map(([k, lab]) =>
      '<button type="button" class="qd-btn" data-mat="' + k + '" aria-pressed="' + (mat === k) + '">' + lab + "</button>").join("") + "</div>";

    const scoreGrid = (L, prob) => {
      const S = L.S, P = L.P;
      const head = "<tr><th></th>" + TOKENS.map((t) => "<th>K<sub>" + esc(t) + "</sub></th>").join("") + "</tr>";
      const body = TOKENS.map((t, i) => '<tr class="' + (i === sel ? "sel" : "") + '"><th>Q<sub>' + esc(t) + "</sub></th>" + TOKENS.map((_, j) => {
        if (j > i) return '<td class="mask">·</td>';
        return prob ? '<td class="heat" style="--a:' + P[i][j].toFixed(3) + '">' + Math.round(P[i][j] * 100) + "%</td>" :
          '<td class="' + (i === sel && j === kSel ? "pick" : "") + '"><button type="button" class="mw-cellbtn" data-qk="' + i + "," + j + '">' + fmt2(S[i][j]) + "</button></td>";
      }).join("") + "</tr>").join("");
      return '<div class="qd-scroll"><table class="pf-table pf-attn pf-grid">' + head + body + "</table></div>";
    };

    // Matrix shapes for each step, drawn as small grids. Demo size draws every cell; real size (Llama-3-8B)
    // keeps a few cells and puts ⋯ ⋮ ⋱ in the second-to-last row and column. hi = highlighted (picked token's) row.
    const VIS = { n: 4, 1: 1, 128: 3, 1024: 4, 4096: 6, 14336: 8, 128256: 10 };
    const B = (name, r, c, R, C, hi) => ({ name, r, c, R, C, hi });
    const shapeBox = (b) => {
      const real = size === "real", rr = real ? String(b.R) : String(b.r), cc = real ? String(b.C) : String(b.c);
      const vr = real ? VIS[b.R] : b.r, vc = real ? VIS[b.C] : b.c;
      let cells = "";
      for (let i = 0; i < vr; i++) for (let j = 0; j < vc; j++) {
        const er = real && vr > 2 && i === vr - 2, ec = real && vc > 2 && j === vc - 2;
        if (er || ec) cells += '<i class="dots">' + (er && ec ? "⋱" : er ? "⋮" : "⋯") + "</i>";
        else cells += '<i class="' + (!real && b.hi && i === sel ? "hi" : "") + '"></i>';
      }
      return '<span class="mh-box"><span class="mh-m" style="grid-template-columns:repeat(' + vc + ', 8px)">' + cells + "</span><b>" + b.name + "</b><em>" + rr + "×" + cc + "</em></span>";
    };
    const O_ = (t) => ({ op: t });
    // One entry per step kind: lines of boxes and operators.
    function shapeSpec(kind) {
      const L3 = 3, d = T.D, ff = T.FF, v = T.VOCAB.length, Z = ZH;
      const x = (nm) => B(nm, L3, d, "n", 4096, true);
      switch (kind) {
        case "lookup": return [[B("embed_tokens", v, d, 128256, 4096), O_(Z ? "取出 prompt 那几行" : "take the prompt's rows"), x("x⁰")]];
        case "norm1": case "norm2": return [[x("x"), O_("÷ RMS ×"), B("w", 1, d, 1, 4096), O_("="), x("x̂")]];
        case "qkv": return [[x("x̂"), O_("×"), B("q_proj", d, d, 4096, 4096), O_("="), x("Q")],
          [x("x̂"), O_("×"), B("k_proj", d, d, 4096, 1024), O_("="), B("K", L3, d, "n", 1024, true)],
          [x("x̂"), O_("×"), B("v_proj", d, d, 4096, 1024), O_("="), B("V", L3, d, "n", 1024, true)]];
        case "score": return size === "real"
          ? [[B("K head", L3, 2, "n", 128), O_(Z ? "→ 转置（行变成列）→" : "→ transpose (rows become columns) →"), B("K headᵀ", 2, L3, 128, "n")],
             [B("Q head", L3, 2, "n", 128), O_("·"), B("K headᵀ", 2, L3, 128, "n"), O_("="), B(Z ? "分数" : "scores", L3, L3, "n", "n"), O_(Z ? "× 32 个 head" : "× 32 heads")]]
          : [[B("K", L3, d, "n", 128), O_(Z ? "→ 转置（行变成列）→" : "→ transpose (rows become columns) →"), B("Kᵀ", d, L3, 128, "n")],
             [B("Q", L3, d, "n", 128, true), O_("·"), B("Kᵀ", d, L3, 128, "n"), O_("="), B(Z ? "分数" : "scores", L3, L3, "n", "n", true)]];
        case "softmax": return [[B(Z ? "分数" : "scores", L3, L3, "n", "n", true), O_("→ softmax →"), B(Z ? "比例" : "shares", L3, L3, "n", "n", true)].concat(size === "real" ? [O_(Z ? "× 32 个 head" : "× 32 heads")] : [])];
        case "mix": return size === "real"
          ? [[B(Z ? "比例" : "shares", L3, L3, "n", "n"), O_("×"), B("V head", L3, 2, "n", 128), O_("="), B("A head", L3, 2, "n", 128), O_(Z ? "32 个拼起来 →" : "32 joined →"), B("A", L3, d, "n", 4096)]]
          : [[B(Z ? "比例" : "shares", L3, L3, "n", "n", true), O_("×"), B("V", L3, d, "n", 128), O_("="), B("A", L3, d, "n", 4096, true)]];
        case "oproj": return [[B("A", L3, d, "n", 4096, true), O_("×"), B("o_proj", d, d, 4096, 4096), O_("="), x("O")], [x("x"), O_("+"), x("O"), O_("="), x(Z ? "新的 x" : "new x")]];
        case "ffn": return [[x("x̂"), O_("×"), B("up_proj", d, ff, 4096, 14336), O_("="), B("h", L3, ff, "n", 14336, true), O_("→ ReLU →"), B("h", L3, ff, "n", 14336, true)],
          [B("h", L3, ff, "n", 14336, true), O_("×"), B("down_proj", ff, d, 14336, 4096), O_("="), x("F"), O_(Z ? "；x + F = 新的 x" : "; x + F = new x")]];
        case "layer": return [[x("x"), O_(Z ? "→ 8 步 →" : "→ 8 steps →"), x(Z ? "新的 x" : "new x")]];
        default: return [[B("x_cats", 1, d, 1, 4096), O_(Z ? "→ 归一化 →" : "→ normalize →"), B("x̂_cats", 1, d, 1, 4096), O_("×"), B("lm_head", d, v, 4096, 128256), O_("="), B(Z ? "分数" : "scores", 1, v, 1, 128256), O_("→ softmax →"), B(Z ? "概率" : "probs", 1, v, 1, 128256)]];
      }
    }
    function shapeStrip(kind) {
      const btn = (val, lab) => '<button type="button" class="qd-btn" data-size="' + val + '" aria-pressed="' + (size === val) + '">' + lab + "</button>";
      const lines = shapeSpec(kind).map((ln) => '<div class="mh-line">' + ln.map((it) => (it.op ? '<span class="mh-op">' + it.op + "</span>" : shapeBox(it))).join("") + "</div>").join("");
      const tHint = kind === "score" ? (ZH ? "ᵀ = transpose（转置）：K 是每个 token 一行（3×4），竖过来变成每个 token 一列（4×3），数字不变。这样「左边的列数 = 右边的行数」（4 = 4），Q 的一行乘 Kᵀ 的一列，正好是两个 token 的点积。"
        : "ᵀ = transpose: K has one row per token (3×4); flipped, it has one column per token (4×3), same numbers. Now the left's columns match the right's rows (4 = 4), and a row of Q times a column of Kᵀ is exactly two tokens' dot product.") + " " : "";
      const hint = tHint + (size === "real"
        ? (ZH ? "n = token 数。" + (["score", "softmax", "mix"].includes(kind) ? "真实模型有 32 个 head，每个 head 用 128 个数，各算一张 n×n 的表（见下面的 Multi-Head demo）。" : "") : "n = number of tokens." + (["score", "softmax", "mix"].includes(kind) ? " The real model has 32 heads of 128 numbers, each with its own n×n table (see the Multi-Head demo below)." : ""))
        : (ZH ? "行 = token，列 = 每个向量的数。" + (kind === "output" ? "" : "红色那一行是你选的 token。") : "Rows = tokens, columns = numbers per vector." + (kind === "output" ? "" : " The red row is the token you picked.")));
      return '<div class="mh-flow mw-shapes"><div class="qd-row"><span class="mh-tag">' + (ZH ? "矩阵形状" : "Matrix shapes") + "</span>" + btn("demo", ZH ? "demo 尺寸" : "demo size") + btn("real", ZH ? "Llama-3-8B 真实尺寸" : "Llama-3-8B real size") + "</div>" + lines +
        '<p class="qd-hint">' + hint + "</p></div>";
    }

    function render() {
      const s = STEPS[step], l = s.l, L = l !== undefined ? run.layers[l] : null, t = TOKENS[sel];
      const X4 = dims("x", T.D), Q4 = dims("Q", T.D), K4 = dims("K", T.D), V4 = dims("V", T.D), A4 = dims("A", T.D), O4 = dims("O", T.D), H8 = dims("h", T.FF), F4 = dims("F", T.D);
      let title, body, note;

      if (s.kind === "lookup") {
        const E = T.tensor("model.embed_tokens.weight");
        title = (ZH ? "查词表" : "Look up each word");
        body = uses(["model.embed_tokens.weight"]) +
          '<div class="qd-scroll"><table class="mw-grid"><tr><th></th>' + E.colLabels.map((c) => "<th>" + c + "</th>").join("") + "</tr>" +
          E.values.map((row, r) => '<tr class="' + (TOKENS.includes(E.rowLabels[r]) ? "hit" : "") + '"><th>' + esc(E.rowLabels[r]) + "</th>" + row.map((v) => "<td>" + v.toFixed(1) + "</td>").join("") + "</tr>").join("") + "</table></div>" +
          vecTable((ZH ? "x⁰：I、like、cats 这三行" : "x⁰: the rows for I, like, cats"), "x", run.x0, X4, { src: S("embed_tokens 里 I、like、cats 那三行，原样复制出来", "the I, like and cats rows of embed_tokens, copied as is") });
        note = (ZH ? "把每个词那一行从 embed_tokens 里复制出来。这里还没有乘法，只是查表。标出来的三行就是 x⁰，每个 token 一个向量。" : "Each word's row is copied out of embed_tokens. No multiplying yet: it is a lookup. The highlighted rows become x⁰, one vector per token.");
      } else if (s.kind === "norm1" || s.kind === "norm2") {
        const first = s.kind === "norm1";
        title = ZH ? "第 " + l + " 层 · 归一化（" + (first ? "attention" : "feed-forward") + " 之前）" : "Layer " + l + " · normalize (before " + (first ? "attention" : "the feed-forward") + ")";
        body = normStep(l, first ? 1 : 2);
        note = ZH ? "RMSNorm：每个 token 各算各的。经过很多层以后，x 的数值可能越来越大或越来越小；先缩放到差不多的大小，再送进" + (first ? " attention" : " feed-forward") + "，训练和计算都更稳定。归一化只改送进去的那份；后面加回去用的还是归一化之前的 x。"
          : "RMSNorm, each token on its own. After many layers, x can drift bigger or smaller; scaling it to about the same size before " + (first ? "attention" : "the feed-forward") + " keeps training and computing stable. Only the copy going in is normalized; the add-back later uses the x from before normalizing.";
      } else if (s.kind === "qkv") {
        title = (ZH ? "第 " + l + " 层 · Q、K、V" : "Layer " + l + " · Q, K, V");
        const mName = tn(l, "self_attn." + mat + "_proj"), mOut = { q: L.Q, k: L.K, v: L.V }[mat][sel], mLetter = mat.toUpperCase();
        body = uses([tn(l, "self_attn.q_proj"), tn(l, "self_attn.k_proj"), tn(l, "self_attn.v_proj")]) + picker() +
          vecTable((ZH ? "输入：归一化后的 x̂" : "Input: the normalized x̂"), "x", L.xNorm1, X4, { src: S("上一步归一化的结果", "the result of the normalize step") }) +
          matTabs(l) + viewTabs() +
          (view === "lines" ? weight(mName, mat + "_proj") : mulView(L.xNorm1[sel], mName, mOut, mLetter + "<sub>" + esc(t) + "</sub>", S("左边竖着的是 " + esc(t) + " 归一化后的 x̂（上面输入表里 " + esc(t) + " 那一行）；矩阵是模型文件里存的 " + mat + "_proj", "on the left: " + esc(t) + "'s x (its row in the input table above); the matrix is " + mat + "_proj from the model file")));
        note = (ZH ? "Q 的每一个数 = x 的 4 个数分别乘上 q_proj 某一列的 4 个数，再加起来。K、V 也一样，只是换成 k_proj、v_proj 的数字。" + (l > 0 ? "第 1 层用的是自己的矩阵，不是第 0 层的。" : "") : "Each number of Q = x's 4 numbers times one column of q_proj, added up. K and V are the same with k_proj's and v_proj's numbers." + (l > 0 ? " Layer 1 uses its own matrices, not layer 0's." : ""));
      } else if (s.kind === "score") {
        const kj = Math.min(kSel, sel), q = L.Q[sel], k = L.K[kj], ku = TOKENS[kj];
        const r3 = (v) => String(Math.round(v * 1000) / 1000);
        const prods = q.map((qi, c) => Number(fmt2(qi)) * Number(fmt2(k[c]))), psum = prods.reduce((a, b) => a + b, 0);
        const src = (name, who, mx) => (ZH ? "← 第 " + l + " 层 Q、K、V 那一步：" + who + " 的 x × " + mx : "← from the Q, K, V step: " + who + "'s x × " + mx);
        const rowv = (lab, v, cls, note) => '<tr class="' + cls + '"><th>' + lab + "</th>" + v.map((x) => "<td>" + x + "</td>").join("") + '<td class="mw-src">' + note + "</td></tr>";
        title = (ZH ? "第 " + l + " 层 · attention ① 打分" : "Layer " + l + " · attention ① score");
        body = formula(1) + (ZH ? '<p class="mw-uses">用到：不用存储的权重，只用上一步的 Q 和 K</p>' : '<p class="mw-uses">uses: no stored weights, only Q and K from the last step</p>') + picker() + S("每一格 = Q \u00b7 K \u00f7 \u221a4，Q 和 K 都来自 Q、K、V 那一步", "each cell = Q \u00b7 K \u00f7 \u221a4; Q and K come from the Q, K, V step") + scoreGrid(L, false) +
          '<p class="qd-hint">' + (ZH ? "点表里的任一个分数，下面写出它是怎么算的。" : "Click any score to see how it is computed below.") + "</p>" +
          '<div class="qd-scroll"><table class="mw-dot">' +
          rowv("Q<sub>" + esc(t) + "</sub>", q.map(fmt2), "q", src("Q", esc(t), "q_proj")) +
          rowv("K<sub>" + esc(ku) + "</sub>", k.map(fmt2), "k", src("K", esc(ku), "k_proj")) +
          rowv(ZH ? "相乘" : "multiply", prods.map(r3), "p", (ZH ? "加起来 = " : "add up = ") + r3(psum) + " ; \u00f7 \u221a4 = <b>" + fmt2(L.S[sel][kj]) + "</b>") +
          "</table></div>";
        note = (ZH ? "每个 Q 跟它自己和它前面的每个 K 比较：点积，再除以 √4 = 2。表里的「·」表示后面的 token，看不到。为什么除以 √d：d 越大，点积加的项越多，分数就越大；分数太大，softmax 会变成几乎 100% 给一个 token，其他都是 0，模型也很难学。点积的大小大约跟 √d 成正比，所以除以 √d 把分数拉回差不多的范围。" : "Each Q is compared with every K at or before its position: dot product, divided by √4 = 2. A “·” in the table = a later token, not visible. Why divide by √d: the bigger d is, the more terms the dot product adds up, so the scores get bigger; with big scores, softmax gives almost 100% to one token and 0 to the rest, and the model learns poorly. The dot product grows roughly with √d, so dividing by √d keeps the scores in a similar range.");
      } else if (s.kind === "softmax") {
        const w = T.softmaxWorking(L.S[sel].slice(0, sel + 1)), nm = TOKENS.slice(0, sel + 1);
        title = (ZH ? "第 " + l + " 层 · attention ② softmax" : "Layer " + l + " · attention ② softmax");
        body = formula(2) + (ZH ? '<p class="mw-uses">用到：不用存储的权重</p>' : '<p class="mw-uses">uses: no stored weights</p>') + picker() + S("分数来自上一步 ① 打分（同一张表）", "the scores come from step \u2460 score (same table)") + scoreGrid(L, true) +
          '<p class="pf-work">' + esc(t) + ": " + w.scoreText.map((st, j) => "e<sup>" + st + "</sup> = " + w.expText[j]).join(", ") + (ZH ? "；总和 " : "; total ") + w.totalText + (ZH ? "；比例 = " : "; shares = ") +
          w.shares.map((v, j) => esc(nm[j]) + " <b>≈ " + v + "%</b>").join(", ") + "</p>";
        note = (ZH ? "每一行分数变成加起来 100% 的比例：每个分数取 e 的次方，再除以这一行的总和。为什么取 e 的次方：分数可能是负数，直接除以总和会得到负的比例；e 的次方把任何数都变成正数，而且分数越大，结果越大。" : "Each row of scores becomes shares that add up to 100%: e to the power of each score, then divide by the row total. Why e to the power: scores can be negative, and dividing by the total would give negative shares; e to the power turns any number positive, and a bigger score still gives a bigger result.");
      } else if (s.kind === "mix") {
        const p = L.P[sel];
        title = (ZH ? "第 " + l + " 层 · attention ③ 混合 V" : "Layer " + l + " · attention ③ mix V");
        body = formula(3) + (ZH ? '<p class="mw-uses">用到：不用存储的权重，只用 V 和比例</p>' : '<p class="mw-uses">uses: no stored weights, only V and the shares</p>') + picker() +
          '<div class="pf-mats">' + vecTable("V", "v", L.V, V4, { src: S("Q、K、V 那一步：x \u00d7 v_proj", "from the Q, K, V step: x \u00d7 v_proj") }) + vecTable((ZH ? "混合后的 V = A（A 是 attention 的意思；每个 token 一个向量，跟 x 一样宽）" : "Mixed V = A (A for attention; one vector per token, as wide as x)"), "o", L.A, A4, { src: S("每一行 = 用 \u2461 softmax 的比例，把左边的 V 加起来", "each row = the V rows on the left, added up with the shares from \u2461 softmax") }) + "</div>" +
          '<p class="pf-work">' + esc(t) + ": " + TOKENS.slice(0, sel + 1).map((u, j) => p[j].toFixed(2) + " × V<sub>" + esc(u) + "</sub>").join(" + ") + "</p>" + mixTable(p);
        note = (ZH ? "每个 token 按自己的比例把各行 V 加起来，结果是一个 4 个数的向量。" : "Each token adds up the V rows by its shares. The result is a vector of 4 numbers.");
      } else if (s.kind === "oproj") {
        title = (ZH ? "第 " + l + " 层 · o_proj，再加回去" : "Layer " + l + " · o_proj, then add");
        body = uses([tn(l, "self_attn.o_proj")]) + picker() + viewTabs() +
          (view === "lines" ? weight(tn(l, "self_attn.o_proj"), "o_proj") : mulView(L.A[sel], tn(l, "self_attn.o_proj"), L.O[sel], "O<sub>" + esc(t) + "</sub>", S("左边竖着的是 " + esc(t) + " 的 A（\u2462 混合 V 那一步的结果）；矩阵是 o_proj", "on the left: " + esc(t) + "'s A (the result of step \u2462 mix V); the matrix is o_proj"))) +
          addTable(L.xIn[sel], L.O[sel], L.xMid[sel], ZH ? "← 这一层的输入 x（归一化之前的，见归一化那一步）" : "← this layer's input x (before normalizing; see the normalize step)", ZH ? "← 上面算出来的 O = A × o_proj" : "← the O just computed above: A × o_proj", "O") +
          '<div class="pf-mats">' + vecTable((ZH ? "O = A × o_proj（O 是 attention 的输出，output）" : "O = A × o_proj (O for output: the attention output)"), "o", L.O, O4, { src: S("上面这个乘法，每个 token 各做一遍", "the multiplication above, done for every token") }) + vecTable((ZH ? "x + O" : "x + O"), "x", L.xMid, X4, { src: S("x 是这一层归一化之前的输入，O 是左边这张表", "x is this layer's input before normalizing; O is the table on the left") }) + "</div>";
        note = (ZH ? "A 只是把 V 按比例加起来；再乘上 o_proj，才是 attention 这一块的最终输出（output），所以叫 O。真实模型有 32 个 head，A 是 32 个 head 的结果拼起来，o_proj 把它们混合成一个向量。O 跟 x 一样宽，所以能加到（不是乘到）这个 token 的向量 x 上。" : "A is only the V's added up by their shares; times o_proj, it becomes the final output of the attention block, so it is called O. A real model has 32 heads: A is their results joined end to end, and o_proj mixes them into one vector. O is as wide as x, so it can be added to (not multiplied with) the token's vector x.");
      } else if (s.kind === "layer") {
        const flow = ZH ? ["归一化", "Q、K、V", "① 打分", "② softmax", "③ 混合 V", "o_proj，加回去", "归一化", "feed-forward，加回去"] : ["normalize", "Q, K, V", "① score", "② softmax", "③ mix V", "o_proj, add", "normalize", "feed-forward, add"];
        title = (ZH ? "第 " + l + " 层：同样的 8 步，换一套权重" : "Layer " + l + ": the same eight steps, different weights");
        body = '<div class="mw-formula"><div class="mw-fsteps">' + flow.map((f) => "<span>" + f + "</span>").join(" → ") + "</div></div>" +
          uses(["input_layernorm", "self_attn.q_proj", "self_attn.k_proj", "self_attn.v_proj", "self_attn.o_proj", "post_attention_layernorm", "mlp.up_proj", "mlp.down_proj"].map((n) => tn(l, n))) +
          '<div class="pf-mats">' +
          vecTable((ZH ? "输入 x（第 " + (l - 1) + " 层的输出）" : "Input x (output of layer " + (l - 1) + ")"), "x", L.xIn, X4, { src: S("第 " + (l - 1) + " 层 feed-forward 那一步最后的「新的 x」", "the \"new x\" at the end of layer " + (l - 1) + "'s feed-forward step") }) +
          vecTable((ZH ? "输出：新的 x" : "Output: new x"), "x", L.xOut, X4, { src: S("左边的 x 走完上面 8 步", "the x on the left after the eight steps above") }) + "</div>" +
          '<div class="pf-mh">' + (ZH ? "这一层的 attention 比例" : "This layer's attention shares") + "</div>" +
          S("这一层自己的 Q、K 算出来的，跟第 " + (l - 1) + " 层不一样", "from this layer's own Q and K, so different from layer " + (l - 1) + "'s") + scoreGrid(L, true);
        note = (ZH ? "第 " + l + " 层把第 " + (l - 1) + " 层的 8 步原样重复一遍，算法完全一样，只有两点不同：输入换成第 " + (l - 1) + " 层的输出，权重换成 model.layers." + l + ".* 这一套（形状一样，数字不一样）。这一层的 K 和 V 存进它自己的 KV cache。真实的 Llama-3-8B 把这 8 步重复 32 层。"
          : "Layer " + l + " repeats layer " + (l - 1) + "'s eight steps exactly. Only two things change: the input is layer " + (l - 1) + "'s output, and the weights are the model.layers." + l + ".* set (same shapes, different numbers). This layer's K and V go into its own KV cache. Llama-3-8B repeats these eight steps for 32 layers.");
      } else if (s.kind === "ffn") {
        const zeroed = L.up.map((r) => r.map((v) => v < 0));
        title = (ZH ? "第 " + l + " 层 · feed-forward，再加回去" : "Layer " + l + " · feed-forward, then add");
        body = '<div class="mw-formula"><div class="mw-feq">F = ReLU(x × <span class="mw-f1 on">up_proj</span>) × <span class="mw-f2 on">down_proj</span></div><div class="mw-fsteps">' +
          (ZH ? "先 up 再 down：<b>up_proj</b> 把 x 从 4 个数变宽到 8 个数（h），给每个 token 更多空间组合特征；ReLU 把负数关成 0，只留下有用的；<b>down_proj</b> 再压回 4 个数，跟 x 一样宽，才能加回 x。"
              : "Up, then down: <b>up_proj</b> widens x from 4 to 8 numbers (h), giving each token more room to combine features; ReLU turns the negatives off; <b>down_proj</b> shrinks it back to 4, as wide as x, so it can be added to x.") +
          "</div></div>" + uses([tn(l, "mlp.up_proj"), tn(l, "mlp.down_proj")]) + picker() +
          mulView(L.xNorm2[sel], tn(l, "mlp.up_proj"), L.up[sel], "h<sub>" + esc(t) + "</sub>", S("左边竖着的是 " + esc(t) + " 归一化后的 x̂（上一步的结果）；矩阵是 up_proj", "on the left: " + esc(t) + "'s normalized x̂ (the last step's result); the matrix is up_proj")) +
          vecTable((ZH ? "h = x × up_proj（4 → 8 个数；h 是 hidden，中间层的意思）" : "h = x × up_proj (4 → 8 numbers; h stands for hidden, the middle layer)"), "q", L.up, H8, { neg: true, src: S("上面这个乘法，每个 token 各做一遍", "the multiplication above, done for every token") }) +
          vecTable((ZH ? "ReLU：负数变成 0" : "ReLU: negatives become 0"), "q", L.act, H8, { zeroed, src: S("就是上面的 h，把负数改成 0", "the h above, with negatives set to 0") }) +
          '<div class="pf-mats">' + vecTable((ZH ? "F = ReLU(h) × down_proj（8 → 4 个数；F 是 feed-forward 的输出）" : "F = ReLU(h) × down_proj (8 → 4 numbers; F for feed-forward output)"), "v", L.down, F4, { src: S("ReLU 之后的 h \u00d7 down_proj", "h after ReLU \u00d7 down_proj") }) + vecTable((ZH ? "新的 x = x + F" : "New x = x + F"), "x", L.xOut, X4, { src: S("x + O（o_proj 那一步）再加上左边的 F", "x + O (from the o_proj step) plus F on the left") }) + "</div>";
        note = (ZH ? "每个 token 各算各的，不看别的 token：变宽成 8 个数（叫 h，hidden 的意思，也就是中间层），负数变成 0，再缩回 4 个数，加到 x 上。Llama 这里还有一个 gate_proj，这里省略了。" : "Each token on its own, no looking at other tokens: widen to 8 numbers (called h, for hidden: the middle layer), zero out the negatives, shrink back to 4, add to x. Llama also has a gate_proj here; skipped.") +
          (l < T.LAYERS - 1 ? (ZH ? "第 " + (l + 1) + " 层拿到的就只有这个新的 x。" : " This new x is all that layer " + (l + 1) + " gets.") : (ZH ? "这是最后一层。" : " That was the last layer."));
      } else {
        const LM = T.tensor("lm_head.weight"), too = T.VOCAB.indexOf("too");
        title = (ZH ? "选出下一个词" : "Pick the next word");
        body = uses(["model.norm.weight", "lm_head.weight"]) +
          '<div class="pf-mh">' + (ZH ? "① 最后再归一化一次（model.norm）" : "① Normalize once more (model.norm)") + "</div>" +
          S("cats 那一行：第 1 层最后的「新的 x」", "the cats row of layer 1's final \"new x\"") +
          normWork(run.finalRaw, T.tensor("model.norm.weight").values, run.final, "x<sub>cats</sub>") +
          '<div class="pf-mh">' + (ZH ? "② 乘 lm_head，每个词得到一个分数" : "② Times lm_head: one score per word") + "</div>" +
          mulView(run.final, "lm_head.weight", run.logits, ZH ? "每个词的分数" : "score per word", S("左边竖着的是上面归一化的结果；矩阵是 lm_head，每一列对应一个词", "on the left: the normalized result above; the matrix is lm_head, one column per word")) +
          '<div class="pf-mh">' + (ZH ? "③ softmax，变成概率" : "③ Softmax into probabilities") + "</div>" + softmaxTable() +
          (ZH ? '<div class="pf-out on">下一个词：<span class="pf-tok hot">' : '<div class="pf-out on">Next word: <span class="pf-tok hot">') + esc(run.next) + "</span></div>";
        note = (ZH ? "只用最后一个位置的向量。lm_head 的列是整个词表，每个词一列（这里 8 个词，真实 Llama 有 128,256 列），不是只从原句里挑。向量 × lm_head 得到每个词一个分数，softmax 把分数变成概率，最高的那个胜出。" : "Only the last position's vector is used. lm_head has one column for every word in the vocabulary (8 here, 128,256 in Llama), not just the words in the prompt. vector × lm_head gives one score per word, softmax turns the scores into probabilities, and the highest wins.");
      }

      el.innerHTML =
        // Step counter and Back/Next sit on top so they stay put while the content below changes height.
        '<div class="qd-nav"><span class="qd-hint">' + (ZH ? "第 " + (step + 1) + " / " + STEPS.length + " 步" : "Step " + (step + 1) + " of " + STEPS.length) + '</span><div class="qd-row">' +
        '<button type="button" class="qd-btn" data-go="-1"' + (step === 0 ? " disabled" : "") + ">" + (ZH ? "上一步" : "Back") + "</button>" +
        '<button type="button" class="qd-btn primary" data-go="1"' + (step === STEPS.length - 1 ? " disabled" : "") + ">" + (ZH ? "下一步" : "Next") + "</button></div></div>" +
        '<div class="pf-panel on"><div class="pf-h">' + title + "</div>" + withNote(body, note, s.kind === "output", shapeStrip(s.kind)) + "</div>";
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.size) size = b.dataset.size;
      else if (b.dataset.pick) sel = +b.dataset.pick;
      else if (b.dataset.mat) { mat = b.dataset.mat; col = 0; }
      else if (b.dataset.col) col = +b.dataset.col;
      else if (b.dataset.qk) { const [qi, kj] = b.dataset.qk.split(",").map(Number); sel = qi; kSel = kj; }
      else if (b.dataset.view) view = b.dataset.view;
      else if (b.dataset.go) { step = Math.max(0, Math.min(STEPS.length - 1, step + +b.dataset.go)); col = STEPS[step].kind === "output" ? T.VOCAB.indexOf("too") : 0; }
      render();
    });
    render();
  }

  document.querySelectorAll("[data-mw-forward]").forEach(mount);
})();
