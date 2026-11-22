// A tiny Llama-shaped model shared by the Model Weights demos.
// 8-word vocabulary, 4 numbers per vector, 2 layers, one attention head, feed-forward hidden size 8.
// Every matrix is named like the real Hugging Face Llama file and stored here in math view
// (x × W, W = input × output). The file stores nn.Linear weights flipped (output × input).
(function () {
  // Word order is arbitrary (like token ids); the prompt words are deliberately not first.
  const VOCAB = ["the", "!", "I", "dogs", "like", "fish", "too", "cats"];
  const D = 4, FF = 8, LAYERS = 2;

  // Deterministic numbers with one decimal, so the page is the same on every load.
  let seed = 7;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const r1 = (a) => Math.round((rand() * 2 - 1) * a * 10) / 10;
  const randMat = (rows, cols, a) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => r1(a)));

  const EMB_BY_WORD = {
    I: [0.9, 0.1, -0.2, 0.3], like: [0.1, 0.8, 0.3, -0.2], cats: [-0.2, 0.2, 0.9, 0.1], too: [0.3, -0.1, 0.2, 0.9],
    "!": [0.2, -0.3, 0.1, 0.8], dogs: [-0.3, 0.2, 0.8, 0.2], the: [0.4, 0.4, 0.0, -0.3],
    fish: [-0.4, 0.3, 0.7, 0.1],
  };
  const EMB = VOCAB.map((w) => EMB_BY_WORD[w]);
  // Layer 0 Q and K are hand-picked so attention is clearly uneven (like -> I, cats -> like).
  const W = [
    {
      q: [[0.1, 0, -0.1, 1.6], [1.7, 0.1, 0, 0], [0, 1.8, 0.1, -0.1], [-0.1, 0, 1.7, 0.1]],
      k: [[0.8, 0.1, 0, 0], [0, 0.8, 0.1, 0], [0.1, 0, 0.8, 0.1], [0, 0, 0.1, 0.8]],
      v: randMat(D, D, 0.8), o: randMat(D, D, 0.8), up: randMat(D, FF, 0.8), down: randMat(FF, D, 0.5),
    },
    { q: randMat(D, D, 0.8), k: randMat(D, D, 0.8), v: randMat(D, D, 0.8), o: randMat(D, D, 0.8), up: randMat(D, FF, 0.8), down: randMat(FF, D, 0.5) },
  ];
  const NORMS = [[1.0, 0.9, 1.1, 1.0], [1.1, 1.0, 0.9, 1.0], [1.0, 1.0, 0.9, 1.1], [0.9, 1.1, 1.0, 1.0], [1.0, 1.1, 1.0, 0.9]];

  const mul = (x, M) => M[0].map((_, c) => x.reduce((s, xi, r) => s + xi * M[r][c], 0));
  const dot = (a, b) => a.reduce((s, ai, i) => s + ai * b[i], 0);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  // RMSNorm, as in Llama: divide by the root-mean-square of the vector, then times the stored weight.
  const EPS = 1e-5;
  // The result is kept to 2 decimals (what the demo prints), so every later step recomputes from the printed numbers.
  const rmsnorm = (v, g) => { const r = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length + EPS); return v.map((x, i) => Math.round((x / r) * g[i] * 100) / 100); };
  const softmax = (s) => { const m = Math.max(...s), e = s.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / z); };

  function runLayers(tokens) {
    const x0 = tokens.map((t) => EMB[VOCAB.indexOf(t)].slice());
    const layers = [];
    let x = x0;
    for (let l = 0; l < LAYERS; l++) {
      const w = W[l];
      const xNorm1 = x.map((v) => rmsnorm(v, NORMS[l * 2]));
      const Q = xNorm1.map((v) => mul(v, w.q)), K = xNorm1.map((v) => mul(v, w.k)), V = xNorm1.map((v) => mul(v, w.v));
      const S = Q.map((q, i) => K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(D) : null)));
      const P = S.map((row) => { const p = softmax(row.filter((s) => s !== null)); return row.map((s, j) => (s === null ? 0 : p[j])); });
      const A = P.map((p) => V[0].map((_, c) => p.reduce((s, pj, j) => s + pj * V[j][c], 0)));
      const O = A.map((a) => mul(a, w.o));
      const xMid = x.map((v, i) => add(v, O[i]));
      const xNorm2 = xMid.map((v) => rmsnorm(v, NORMS[l * 2 + 1]));
      const up = xNorm2.map((v) => mul(v, w.up));
      const act = up.map((row) => row.map((v) => Math.max(0, v)));
      const down = act.map((v) => mul(v, w.down));
      const xOut = xMid.map((v, i) => add(v, down[i]));
      layers.push({ xIn: x, xNorm1, Q, K, V, S, P, A, O, xMid, xNorm2, up, act, down, xOut });
      x = xOut;
    }
    const finalRaw = x[x.length - 1];
    return { x0, layers, finalRaw, final: rmsnorm(finalRaw, NORMS[4]) };
  }

  // lm_head: one column per word. The "too" column points along the prompt's final vector so the
  // tiny model predicts "too" after "I like cats"; the other columns are small random numbers.
  const LM = randMat(D, VOCAB.length, 0.5);
  (function tuneHead() {
    const f = runLayers(["I", "like", "cats"]).final;
    const norm = Math.sqrt(dot(f, f));
    const col = VOCAB.indexOf("too");
    f.forEach((v, r) => { LM[r][col] = Math.round((v / norm) * 0.8 * 10) / 10; });
  })();

  function forward(tokens) {
    const run = runLayers(tokens);
    run.logits = mul(run.final, LM);
    run.probs = softmax(run.logits);
    run.next = VOCAB[run.probs.indexOf(Math.max(...run.probs))];
    return run;
  }

  // Subscript digits: sub(12) -> "₁₂". Labels read "x₁ … x₄" (input) and "Q₁ … Q₄" (output).
  const sub = (n) => String(n).split("").map((c) => "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"[+c]).join("");
  const dims = (p, n) => Array.from({ length: n }, (_, i) => p + sub(i + 1));
  const lin = (name, group, values, rowLabels, colLabels) =>
    ({ name, group, kind: "linear", math: [values.length, values[0].length], file: [values[0].length, values.length], values, rowLabels, colLabels });
  const nrm = (name, group, values) => ({ name, group, kind: "norm", math: [values.length], file: [values.length], values, rowLabels: [], colLabels: dims("x", D) });

  const tensors = [{ name: "model.embed_tokens.weight", group: "embed_tokens", kind: "embed", math: [VOCAB.length, D], file: [VOCAB.length, D], values: EMB, rowLabels: VOCAB, colLabels: dims("x", D) }];
  W.forEach((w, l) => {
    const g = "layers." + l, p = "model.layers." + l + ".";
    tensors.push(
      nrm(p + "input_layernorm.weight", g, NORMS[l * 2]),
      lin(p + "self_attn.q_proj.weight", g, w.q, dims("x", D), dims("Q", D)),
      lin(p + "self_attn.k_proj.weight", g, w.k, dims("x", D), dims("K", D)),
      lin(p + "self_attn.v_proj.weight", g, w.v, dims("x", D), dims("V", D)),
      lin(p + "self_attn.o_proj.weight", g, w.o, dims("A", D), dims("O", D)),
      nrm(p + "post_attention_layernorm.weight", g, NORMS[l * 2 + 1]),
      lin(p + "mlp.up_proj.weight", g, w.up, dims("x", D), dims("h", FF)),
      lin(p + "mlp.down_proj.weight", g, w.down, dims("h", FF), dims("F", D))
    );
  });
  tensors.push(nrm("model.norm.weight", "norm", NORMS[4]), lin("lm_head.weight", "lm_head", LM, dims("x", D), VOCAB));
  const tensor = (name) => tensors.find((t) => t.name === name);

  // Real Llama-3-8B (config.json: hidden 4096, intermediate 14336, 32 layers, 8 KV heads, vocab 128256, bfloat16, untied).
  const H = 4096, I = 14336, KV = 1024, VOC = 128256;
  const real = (name, math, file, perLayer) => ({ name, math, file, count: math.reduce((a, b) => a * b, 1), perLayer });
  const REAL = [
    real("model.embed_tokens.weight", [VOC, H], [VOC, H], false),
    real("model.layers.N.input_layernorm.weight", [H], [H], true),
    real("model.layers.N.self_attn.q_proj.weight", [H, H], [H, H], true),
    real("model.layers.N.self_attn.k_proj.weight", [H, KV], [KV, H], true),
    real("model.layers.N.self_attn.v_proj.weight", [H, KV], [KV, H], true),
    real("model.layers.N.self_attn.o_proj.weight", [H, H], [H, H], true),
    real("model.layers.N.post_attention_layernorm.weight", [H], [H], true),
    real("model.layers.N.mlp.gate_proj.weight", [H, I], [I, H], true),
    real("model.layers.N.mlp.up_proj.weight", [H, I], [I, H], true),
    real("model.layers.N.mlp.down_proj.weight", [I, H], [H, I], true),
    real("model.norm.weight", [H], [H], false),
    real("lm_head.weight", [H, VOC], [VOC, H], false),
  ];
  const REAL_TOTALS = { perLayer: 218112000, layers: 6979584000, total: 8030261248, gb: 16.06 };

  const fmt2 = (v) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));

  // The numbers printed on a softmax working line. Scores get 3 decimals so e^score can be checked
  // on a calculator; the total is the sum of the printed e^ values; shares come from the exact softmax.
  function softmaxWorking(scores) {
    // Same 2 decimals as the score table, so the e^ line reads straight off the table.
    const scoreText = scores.map(fmt2);
    const expText = scoreText.map((t) => Math.exp(parseFloat(t)).toFixed(2));
    const totalText = expText.reduce((a, t) => a + parseFloat(t), 0).toFixed(2);
    const p = softmax(scores);
    return { scoreText, expText, totalText, shares: p.map((v) => Math.round(v * 100)) };
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Circles-and-lines picture of a matrix: inputs (rows) on the left, outputs (columns) on the right,
  // one line per weight. Thicker = bigger magnitude; blue = positive, red = negative.
  function linesSvg(t, opts) {
    opts = opts || {};
    const rows = t.math[0], cols = t.math[1], gap = 24, h = Math.max(rows, cols) * gap + 16, w = 280;
    const xl = 64, xr = w - 64;
    const yOf = (i, n) => 8 + (h - 16) / 2 - ((n - 1) * gap) / 2 + i * gap;
    const max = Math.max(...t.values.flat().map(Math.abs)) || 1;
    let lines = "";
    t.values.forEach((row, r) => row.forEach((v, c) => {
      const on = opts.highlight && opts.highlight[0] === r && opts.highlight[1] === c;
      lines += '<line x1="' + xl + '" y1="' + yOf(r, rows).toFixed(1) + '" x2="' + xr + '" y2="' + yOf(c, cols).toFixed(1) +
        '" data-r="' + r + '" data-c="' + c + '" data-v="' + v + '" class="mw-wl' + (v < 0 ? " neg" : "") + (on ? " on" : "") +
        '" stroke-width="' + (0.6 + (3 * Math.abs(v)) / max).toFixed(2) + '"></line>';
    }));
    const nodes = (n, x, labels, anchor, dx) => labels.slice(0, n).map((lab, i) =>
      '<circle cx="' + x + '" cy="' + yOf(i, n).toFixed(1) + '" r="6" class="mw-node"></circle>' +
      '<text x="' + (x + dx) + '" y="' + (yOf(i, n) + 4).toFixed(1) + '" text-anchor="' + anchor + '" class="mw-nl">' + esc(lab) + "</text>").join("");
    return '<svg viewBox="0 0 ' + w + " " + h + '" class="mw-svg" role="img" aria-label="' + esc(t.name) + ' as circles and lines">' +
      lines + nodes(rows, xl, t.rowLabels, "end", -10) + nodes(cols, xr, t.colLabels, "start", 10) + "</svg>";
  }

  const api = { EPS, VOCAB, D, FF, LAYERS, tensors, tensor, forward, REAL, REAL_TOTALS, fmt2, esc, linesSvg, softmaxWorking, sub };
  if (typeof window !== "undefined") window.TinyLlama = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
