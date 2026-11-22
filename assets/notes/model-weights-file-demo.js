// Model file explorer for the Model Weights post. Mounts into [data-mw-file].
// Lists every tensor in the tiny model file (assets/notes/tiny-llama.js) with its name and shape;
// click one to see its numbers as a grid or as circles and lines. "Real size" swaps in Llama-3-8B's shapes.
(function () {
  const T = window.TinyLlama;
  if (!T) return;
  const ZH = (document.documentElement.lang || "").startsWith("zh"); // the .zh.md page sets <html lang="zh-Hans">
  const { esc, fmt2 } = T;
  const n0 = (n) => n.toLocaleString("en-US");
  const shape = (s) => s.join(" × ");
  const nameHtml = (n) => esc(n).replace(/\./g, ".<wbr>"); // break long names only after a dot
  const count = (t) => (t.kind === "norm" ? t.values.length : t.math[0] * t.math[1]);
  const GROUPS = [["embed_tokens", (ZH ? "开头，只有一次" : "Once, at the start")], ["layers.0", (ZH ? "第 0 层" : "Layer 0")], ["layers.1", (ZH ? "第 1 层" : "Layer 1")], ["norm", (ZH ? "结尾，只有一次" : "Once, at the end")], ["lm_head", (ZH ? "结尾，只有一次" : "Once, at the end")]];

  function mount(el) {
    const st = { selected: "model.layers.0.self_attn.q_proj.weight", view: "grid", real: false, cell: null, realSel: 0 };

    function list() {
      let html = "", lastLabel = "";
      GROUPS.forEach(([g, label]) => {
        if (label !== lastLabel) { html += '<div class="mw-gh">' + esc(label) + "</div>"; lastLabel = label; }
        T.tensors.filter((t) => t.group === g).forEach((t) => {
          html += '<button type="button" class="mw-item' + (t.name === st.selected ? " on" : "") + '" data-sel="' + esc(t.name) + '">' +
            '<span class="mw-name">' + nameHtml(t.name) + '</span><span class="mw-shape">' + shape(t.math) + "</span></button>";
        });
      });
      const total = T.tensors.reduce((s, t) => s + count(t), 0);
      return html + (ZH ? '<div class="mw-total">总共：<b>' + n0(total) + "</b> 个数</div>" : '<div class="mw-total">Total: <b>' + n0(total) + "</b> numbers</div>");
    }

    function grid(t) {
      if (t.kind === "norm") {
        return '<div class="qd-scroll"><table class="mw-grid"><tr>' + t.colLabels.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr><tr>" +
          t.values.map((v) => "<td>" + v.toFixed(1) + "</td>").join("") + "</tr></table></div>";
      }
      const head = "<tr><th></th>" + t.colLabels.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>";
      const rows = t.values.map((row, r) => "<tr><th>" + esc(t.rowLabels[r]) + "</th>" + row.map((v, c) => {
        const on = st.cell && st.cell[0] === r && st.cell[1] === c;
        return '<td data-r="' + r + '" data-c="' + c + '" class="' + (v < 0 ? "neg" : "") + (on ? " on" : "") + '">' + v.toFixed(1) + "</td>";
      }).join("") + "</tr>").join("");
      return '<div class="qd-scroll"><table class="mw-grid">' + head + rows + "</table></div>";
    }

    function about(t) {
      const n = count(t);
      // up_proj / down_proj: say what h means before the usual shape note.
      const hNote = /mlp\.(up|down)_proj/.test(t.name)
        ? (ZH ? "h 是 hidden（中间层）的意思：feed-forward 先把 x 变宽成 8 个数（h₁ … h₈），再缩回 4 个数，也就是 F（feed-forward 的输出）。" : "h stands for hidden (the middle layer): the feed-forward widens x into 8 numbers (h₁ … h₈), then shrinks back to 4: F, the feed-forward output. ")
        : /o_proj/.test(t.name)
        ? (ZH ? "A 是 attention 混合 V 得到的结果，O 是 attention 的输出（output），之后加回 x。" : "A is the result of attention mixing the V's; O is the attention output, added back to x afterwards. ")
        : "";
      if (t.kind === "embed") return (ZH ? "这是一张查找表：每个词一行，每行 " + t.math[1] + " 个数。文件里的形状是 [" + t.file.join(", ") + "]，跟显示的一样。文件里存的是一长串 " + n + " 个数，再加上这个形状。" : "A lookup table: one row per word, " + t.math[1] + " numbers each. File shape [" + t.file.join(", ") + "], same as shown. In the file: " + n + " numbers in a row, plus that shape.");
      if (t.kind === "norm") return (ZH ? t.values.length + " 个数，每个维度一个。它的作用是：先把 x 缩放到统一的大小，再把每个维度乘上这里对应的数，让数值保持在稳定的范围。" : t.values.length + " numbers, one per dimension. It scales x to a standard size, then multiplies each dimension by its number here, so the values stay in a steady range.");
      return hNote + (ZH ? "这里显示成 " + t.math[0] + " × " + t.math[1] + "（输入 × 输出），这样 out = x × W 可以从左往右读。文件里的形状是 [" + t.file.join(", ") + "]（输出 × 输入），这里是翻转后显示的。文件里存的是一长串 " + n + " 个数，再加上这个形状。" : "Shown as " + t.math[0] + " × " + t.math[1] + " (input × output), so out = x × W reads left to right. File shape [" + t.file.join(", ") + "] (output × input); shown flipped here. In the file: " + n + " numbers in a row, plus that shape.");
    }

    function readout(t) {
      if (t.kind === "norm") return "";
      if (!st.cell) return (ZH ? '<p class="qd-hint">点一个数字或一条线，看它连接的是哪个输入和哪个输出。</p>' : '<p class="qd-hint">Tap a number or a line to see which input it connects to which output.</p>');
      const [r, c] = st.cell, v = t.values[r][c];
      if (ZH) return '<p class="mw-read">第 <b>' + esc(t.rowLabels[r]) + "</b> 行 → 第 <b>" + esc(t.colLabels[c]) + "</b> 列：权重 <b>" + v.toFixed(1) + "</b>" +
        (t.kind === "embed" ? "（词 “" + esc(t.rowLabels[r]) + "” 的第 " + esc(t.colLabels[c]) + " 个数）" : "（输入 " + esc(t.rowLabels[r]) + " 对输出 " + esc(t.colLabels[c]) + " 贡献多少）") + "</p>";
      return '<p class="mw-read">Row <b>' + esc(t.rowLabels[r]) + "</b> → column <b>" + esc(t.colLabels[c]) + "</b>: weight <b>" + v.toFixed(1) + "</b>" +
        (t.kind === "embed" ? " (number " + esc(t.colLabels[c]) + " of the word “" + esc(t.rowLabels[r]) + "”)" : " (how much input " + esc(t.rowLabels[r]) + " adds to output " + esc(t.colLabels[c]) + ")") + "</p>";
    }

    function detail() {
      const t = T.tensor(st.selected);
      const canLines = t.kind !== "norm";
      const view = canLines ? st.view : "grid";
      const tabs = canLines
        ? '<div class="qd-row"><button type="button" class="qd-btn" data-view="grid" aria-pressed="' + (view === "grid") + (ZH ? '">数字表格</button>' : '">Numbers</button>') +
          '<button type="button" class="qd-btn" data-view="lines" aria-pressed="' + (view === "lines") + (ZH ? '">圆圈连线</button></div>' : '">Circles and lines</button></div>')
        : "";
      const body = view === "lines" ? '<div class="mw-svgwrap">' + T.linesSvg(t, { highlight: st.cell }) + "</div>" : grid(t);
      return '<div class="mw-dh"><span class="mw-name">' + nameHtml(t.name) + "</span><span class=\"mw-shape\">" + shape(t.math) + "</span></div>" +
        tabs + body + readout(t) + '<p class="mw-about">' + esc(about(t)) + "</p>";
    }

    // A schematic of the same tensor as a grid: first rows/columns, the last one, and dots in between.
    // Cells are blank boxes (one box = one stored number); no real values are shown.
    function schematic(r, rows, cols, label) {
      const isEmbed = label === "embed_tokens", isHead = label === "lm_head", vec = r.math.length === 1;
      // Rows are the input, columns the output (same letters as the tiny model).
      const IO = { q_proj: ["x", "Q"], k_proj: ["x", "K"], v_proj: ["x", "V"], o_proj: ["A", "O"], gate_proj: ["x", "g"], up_proj: ["x", "h"], down_proj: ["h", "F"], lm_head: ["x", ""], embed_tokens: ["", "x"] }[label] || ["", "x"];
      const colName = (i) => (isHead ? (ZH ? "词 " : "word ") + n0(i) : IO[1] + T.sub(i + 1));
      const rowName = (i) => (isEmbed ? (ZH ? "词 " : "word ") + n0(i) : IO[0] + T.sub(i + 1));
      const cIdx = vec ? [0, 1, 2, "…", cols - 1] : [0, 1, 2, "…", cols - 1];
      const rIdx = vec ? [0] : isEmbed ? [0, 1, 2, "⋮", "pick", "⋮", rows - 1] : [0, 1, 2, "⋮", rows - 1];
      const head = "<tr><th></th>" + cIdx.map((c) => "<th>" + (c === "…" ? "…" : esc(colName(c))) + "</th>").join("") + "</tr>";
      const body = rIdx.map((ri) => {
        if (ri === "⋮") return '<tr class="gap"><th>⋮</th>' + cIdx.map((c) => "<td>" + (c === "…" ? "⋱" : "⋮") + "</td>").join("") + "</tr>";
        const pick = ri === "pick";
        const name = vec ? "" : pick ? "cats" : rowName(ri);
        return '<tr class="' + (pick ? "pick" : "") + '"><th>' + esc(name) + "</th>" + cIdx.map((c) => (c === "…" ? "<td>…</td>" : '<td><i></i></td>')).join("") + "</tr>";
      }).join("");
      let note;
      if (isEmbed) note = ZH ? "每一行是一个词的向量，4,096 个数横着排。查表时只拿出一行，比如 cats 那一行，就是 cats 的 x（横着的一行）。竖着很长，是因为词表有 128,256 个词。"
                               : "Each row is one word's vector: 4,096 numbers side by side. A lookup takes out one row, e.g. the cats row, and that row is cats's x (a horizontal row). It is tall because the vocabulary has 128,256 words.";
      else if (vec) note = ZH ? "只有一行：每个维度一个数。" : "Just one row: one number per dimension.";
      else if (isHead) note = ZH ? "每一列对应一个词。最后的向量 x（1 行 × 4,096）乘上它，得到 1 行 × 128,256：每个词一个分数。"
                                 : "Each column is one word. The final x (1 row × 4,096) times this gives 1 row × 128,256: one score per word.";
      else note = ZH ? "x 是横着的 1 行 × " + n0(rows) + " 个数，乘上这个矩阵，得到 1 行 × " + n0(cols) + " 个数。每一列算出输出里的一个数。"
                     : "x is one row of " + n0(rows) + " numbers; times this matrix it becomes one row of " + n0(cols) + ". Each column makes one output number.";
      return '<div class="mw-schem-h">' + (ZH ? "示意图（每个小格 = 一个数，中间省略）" : "Schematic (each box = one number; the middle is left out)") + "</div>" +
        '<div class="qd-scroll"><table class="mw-schem">' + head + body + "</table></div>" + '<p class="mw-about">' + note + "</p>";
    }

    // Draw one real tensor to scale next to a 4096 × 4096 square (q_proj) for reference.
    function realSketch() {
      const r = T.REAL[st.realSel];
      const rows = r.math.length === 2 ? r.math[0] : 1, cols = r.math.length === 2 ? r.math[1] : r.math[0];
      const ref = 4096, box = 220, sc = box / Math.max(rows, cols, ref);
      const w = Math.max(cols * sc, 1.5), h = Math.max(rows * sc, 1.5), rw = ref * sc;
      const L0 = 76, W = L0 + w + 60 + rw + 20, H = 30 + Math.max(h, rw) + 10;
      const perPx = Math.round(1 / sc);
      const label = (r.name.split(".").slice(-2, -1)[0] || r.name);
      const svg = '<svg viewBox="0 0 ' + W.toFixed(0) + " " + H.toFixed(0) + '" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '" class="mw-sketch" role="img" aria-label="' + esc(label) + ' drawn to scale">' +
        '<rect x="' + L0 + '" y="30" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" class="mw-sk-main"></rect>' +
        '<text x="' + (L0 + w / 2).toFixed(1) + '" y="20" text-anchor="middle" class="mw-sk-t">' + n0(cols) + "</text>" +
        '<text x="' + (L0 - 8) + '" y="' + (30 + h / 2 + 4).toFixed(1) + '" text-anchor="end" class="mw-sk-t">' + n0(rows) + "</text>" +
        '<rect x="' + (L0 + w + 60).toFixed(1) + '" y="30" width="' + rw.toFixed(1) + '" height="' + rw.toFixed(1) + '" class="mw-sk-ref"></rect>' +
        '<text x="' + (L0 + w + 60 + rw / 2).toFixed(1) + '" y="20" text-anchor="middle" class="mw-sk-t">q_proj</text></svg>';
      const cap = ZH
        ? "按比例画的：<b>" + esc(label) + "</b> 是 " + n0(rows) + " 行 × " + n0(cols) + " 列" + (label === "embed_tokens" ? "（每个词一行）" : "（输入 × 输出）") + "，右边的方块是 4,096 × 4,096 的 q_proj。这张图里 1 个像素大约代表 " + n0(perPx) + " × " + n0(perPx) + " 个数。"
        : "Drawn to scale: <b>" + esc(label) + "</b> is " + n0(rows) + " rows × " + n0(cols) + " columns" + (label === "embed_tokens" ? " (one row per word)" : " (input × output)") + "; the square on the right is q_proj, 4,096 × 4,096. One pixel here stands for about " + n0(perPx) + " × " + n0(perPx) + " numbers.";
      return '<div class="mw-skwrap">' + svg + '<p class="mw-about">' + cap + "</p>" + schematic(r, rows, cols, label) + "</div>";
    }

    function realView() {
      const row = (r) => "<tr class=\"mw-rrow" + (T.REAL.indexOf(r) === st.realSel ? " on" : "") + "\" data-realsel=\"" + T.REAL.indexOf(r) + "\"><td class=\"mw-rn\">" + nameHtml(r.name) + "</td><td>" + shape(r.math) + "</td><td>[" + r.file.join(", ") + "]</td><td>" + n0(r.count) + "</td></tr>";
      const per = T.REAL.filter((r) => r.perLayer), once = T.REAL.filter((r) => !r.perLayer);
      const tot = T.REAL_TOTALS;
      return '<div class="qd-scroll"><table class="mw-real"><tr><th>Tensor</th><th>' + (ZH ? "显示的形状</th><th>文件里的形状</th><th>数字个数" : "Shown as</th><th>File shape</th><th>Numbers") + '</th></tr>' +
        row(once[0]) +
        (ZH ? '<tr class="mw-sub"><td colspan="4">每一层（N = 0 到 31）：</td></tr>' : '<tr class="mw-sub"><td colspan="4">Every layer (N = 0 to 31):</td></tr>') + per.map(row).join("") +
        (ZH ? '<tr class="mw-sum"><td colspan="3">一层</td><td>' : '<tr class="mw-sum"><td colspan="3">One layer</td><td>') + n0(tot.perLayer) + "</td></tr>" +
        (ZH ? '<tr class="mw-sum"><td colspan="3">× 32 层</td><td>' : '<tr class="mw-sum"><td colspan="3">× 32 layers</td><td>') + n0(tot.layers) + "</td></tr>" +
        once.slice(1).map(row).join("") +
        (ZH ? '<tr class="mw-sum big"><td colspan="3">总共</td><td>' : '<tr class="mw-sum big"><td colspan="3">Total</td><td>') + n0(tot.total) + "</td></tr>" +
        (ZH ? '<tr class="mw-sum big"><td colspan="3">× 每个 2 bytes（bfloat16）</td><td>≈ ' : '<tr class="mw-sum big"><td colspan="3">× 2 bytes each (bfloat16)</td><td>≈ ') + tot.gb + " GB</td></tr></table></div>" +
        '<p class="qd-hint">' + (ZH ? "点表格里的一行，下面按比例画出这个矩阵。" : "Click a row to draw that matrix to scale below.") + "</p>" + realSketch() +
        (ZH ? '<p class="mw-about">名字和结构跟小模型一样，只是大得多：每个向量 4,096 个数、32 层。Llama 的 feed-forward 还多一个矩阵 gate_proj。' +
        'k_proj 和 v_proj 只有 1,024 宽，是因为 32 个 Q head 共用 8 个 K/V head，每个 128 个数（GQA，见 <a href="/posts/qkv-attention-basics/">Q, K, V: Attention Basics</a>）。</p>' : '<p class="mw-about">Same names, same pattern as the tiny model, just bigger: 4,096 numbers per vector and 32 layers. Llama adds a third feed-forward matrix, gate_proj. ' +
        'k_proj and v_proj are only 1,024 wide because 8 K/V heads of 128 numbers are shared by 32 Q heads (GQA; see <a href="/posts/qkv-attention-basics/">Q, K, V: Attention Basics</a>).</p>');
    }

    function render() {
      el.innerHTML =
        '<div class="qd-row"><button type="button" class="qd-btn" data-real="0" aria-pressed="' + !st.real + (ZH ? '">小模型</button>' : '">Tiny model</button>') +
        '<button type="button" class="qd-btn" data-real="1" aria-pressed="' + st.real + (ZH ? '">真实尺寸：Llama-3-8B</button></div>' : '">Real size: Llama-3-8B</button></div>') +
        (st.real ? realView() : '<div class="mw-file"><div class="mw-list">' + list() + '</div><div class="mw-detail">' + detail() + "</div></div>");
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sel],[data-view],[data-real],[data-realsel],td[data-r],line[data-r]");
      if (!b) return;
      if (b.dataset.sel) { if (b.dataset.sel !== st.selected) st.cell = null; st.selected = b.dataset.sel; }
      else if (b.dataset.view) st.view = b.dataset.view;
      else if (b.dataset.realsel) st.realSel = +b.dataset.realsel;
      else if (b.dataset.real) st.real = b.dataset.real === "1";
      else st.cell = [+b.dataset.r, +b.dataset.c];
      render();
    });
    render();
  }

  document.querySelectorAll("[data-mw-file]").forEach(mount);
})();
