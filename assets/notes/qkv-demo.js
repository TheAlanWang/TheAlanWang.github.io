// Step-by-step attention (Q, K, V) walkthrough for the QKV post.
// Mounts into every element with [data-qkv-demo]. Numbers are picked for clarity,
// not taken from a real model.
(function () {
  const words = ["Tom", "gave", "Mom", "an apple", "she"];
  const ME = 4;
  const scores = [2, 0, 4, 0, 1];
  const exps = scores.map(Math.exp);
  const sum = exps.reduce((a, b) => a + b, 0);
  const pct = exps.map((e) => (e / sum) * 100);
  const vtxt = ["boy", "action: give", "woman, parent", "fruit", "pronoun"];
  const vecs = ["[0.2, 0.9, …]", "[0.7, 0.1, …]", "[0.8, 0.3, …]", "[0.1, 0.5, …]", "[0.6, 0.4, …]"];

  function sentence(o = {}) {
    return '<div class="qd-sent">' + words.map((w, i) => {
      const tags = o.tags
        ? '<div class="qd-tags"><span class="qd-tag q' + (o.dimOtherQ && i !== ME ? " dim" : "") + '">Q</span><span class="qd-tag k">K</span><span class="qd-tag v">V</span></div>'
        : "";
      return '<div class="qd-tok"><span class="qd-chip' + (o.me && i === ME ? " me" : "") + '">' + w + "</span>" +
        (o.vec ? '<span class="qd-vec">' + vecs[i] + "</span>" : "") + tags + "</div>";
    }).join("") + "</div>";
  }
  function bars(values, fmt, cls, max, labels = words) {
    return '<div class="qd-bars">' + labels.map((w, i) =>
      '<div class="qd-bar"><span>' + w + '</span><div class="qd-track"><div class="qd-fill ' + cls + '" style="width:' + (values[i] / max) * 100 + '%"></div></div><span class="qd-num">' + fmt(values[i]) + "</span></div>"
    ).join("") + "</div>";
  }

  const steps = [
    {
      t: "1. A word needs context",
      x: "In \"Tom gave Mom an apple, and she smiled\", you know \"she\" means Mom because you looked back at the earlier words. A model has to do the same: every token looks at the other tokens and decides which ones matter to it. That is attention.",
      s: () => sentence({ me: true }),
      k: "Attention answers one question: which tokens should this token look at, and how much?",
    },
    {
      t: "2. Every token becomes a list of numbers",
      x: "A model only works with numbers. Each token is looked up in a table and becomes a vector. How long the vector is was decided by the model's designers (4096 numbers in Llama-3-8B); the values in the table were learned in training. Only the first two numbers are shown here.",
      s: () => sentence({ me: true, vec: true }),
      k: "Each token = one vector. Everything after this is math on those vectors.",
    },
    {
      t: "3. Each token makes three cards: Q, K, V",
      x: "From its vector, each token computes three new vectors. Think of a video search:",
      s: () => sentence({ me: true, tags: true }) +
        '<div class="qd-roles">' +
        '<div class="qd-role q"><b>Q asks</b><span>Query: what am I looking for? Like the words you type into the search box.</span></div>' +
        '<div class="qd-role k"><b>K matches</b><span>Key: what am I? Like a video\'s title and tags, used to be matched.</span></div>' +
        '<div class="qd-role v"><b>V gives</b><span>Value: my content. Like the video itself, handed over when picked.</span></div>' +
        "</div>",
      k: "Q asks, K matches, V gives. Every token has all three.",
    },
    {
      t: "4. How Q, K and V are computed",
      x: "This is the usual neural-network picture. On the left is the token's vector (shrunk to 4 numbers). Every line carries a weight; all the weights together form the tables W_Q, W_K and W_V, learned in training. Each circle on the right = every input number times the weight on its line, added up. Click a circle on the right.",
      s: () => '<div class="qd-scroll"><svg class="qd-nn" viewBox="0 0 620 420" role="img" aria-label="Fully connected layer from the input to Q, K and V"></svg></div><div class="qd-out qd-mono" data-nn-formula></div>',
      after: (root) => {
        const x = [1, 2, 0.5, 1];
        const W = {
          Q: [[0.5, 1, 0.2, 0], [1, 0, 0.3, 0.5], [0, 0.4, 1, 0.2], [0.2, 0.1, 0, 1]],
          K: [[0.3, 0.6], [0.4, 0.1], [0.8, 0], [0, 0.5]],
          V: [[0.2, 0.7], [0.5, 0.3], [0, 0.9], [0.6, 0.1]],
        };
        const svg = root.querySelector(".qd-nn"), f = root.querySelector("[data-nn-formula]");
        const inY = [110, 170, 230, 290], inX = 110, outX = 470, outs = [];
        let y = 40;
        ["Q", "K", "V"].forEach((k) => { for (let j = 0; j < W[k][0].length; j++) { outs.push({ k, j, y }); y += 40; } y += 26; });
        const val = (o) => x.reduce((a, xi, i) => a + xi * W[o.k][i][o.j], 0);
        let h = '<text x="' + inX + '" y="70" text-anchor="middle" class="qd-svg-muted">the token\'s numbers</text>' +
          '<text x="' + inX + '" y="88" text-anchor="middle" class="qd-svg-muted qd-svg-small">(4096 in a real model)</text>';
        outs.forEach((o, idx) => inY.forEach((iy) => {
          h += '<line data-o="' + idx + '" x1="' + (inX + 20) + '" y1="' + iy + '" x2="' + (outX - 18) + '" y2="' + o.y + '" class="qd-edge"/>';
        }));
        inY.forEach((iy, i) => {
          h += '<circle cx="' + inX + '" cy="' + iy + '" r="20" class="qd-node in"/>' +
            '<text x="' + inX + '" y="' + (iy + 5) + '" text-anchor="middle" class="qd-svg-num">' + x[i] + "</text>" +
            '<text x="' + (inX - 34) + '" y="' + (iy + 5) + '" text-anchor="end" class="qd-svg-muted qd-svg-small">x' + (i + 1) + "</text>";
        });
        ["Q", "K", "V"].forEach((k) => {
          const ys = outs.filter((o) => o.k === k).map((o) => o.y), mid = (ys[0] + ys[ys.length - 1]) / 2;
          h += '<text x="' + (outX + 40) + '" y="' + (mid + 5) + '" class="qd-svg-label ' + k.toLowerCase() + '">' + k + " (" + ys.length + " numbers)</text>";
        });
        outs.forEach((o, idx) => {
          h += '<g data-node="' + idx + '" tabindex="0" role="button" aria-label="' + o.k + (o.j + 1) + '"><circle cx="' + outX + '" cy="' + o.y + '" r="17" class="qd-node ' + o.k.toLowerCase() + '"/>' +
            '<text x="' + outX + '" y="' + (o.y + 4) + '" text-anchor="middle" class="qd-svg-num qd-svg-small">' + Math.round(val(o) * 100) / 100 + "</text></g>";
        });
        svg.innerHTML = h;
        const pick = (idx) => {
          const o = outs[idx];
          svg.querySelectorAll("line").forEach((l) => l.classList.toggle("on", +l.dataset.o === idx));
          svg.querySelectorAll("line").forEach((l) => l.classList.toggle(o.k.toLowerCase(), +l.dataset.o === idx));
          f.textContent = o.k + (o.j + 1) + " = " + x.map((xi, i) => xi + "×" + W[o.k][i][o.j]).join(" + ") + " = " + Math.round(val(o) * 100) / 100 + "   (the number after each × is a line's weight)";
        };
        svg.querySelectorAll("[data-node]").forEach((g) => {
          g.addEventListener("click", () => pick(+g.dataset.node));
          g.addEventListener("mouseenter", () => pick(+g.dataset.node));
          g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(+g.dataset.node); } });
        });
        pick(4);
      },
      k: "Q, K, V = input numbers × line weights, summed. The number of circles on the right sets the size: Q has more, K and V fewer.",
    },
    {
      t: "5. Real sizes in Llama-3-8B",
      x: "Scale the picture up. Q comes out as 4096 numbers; K and V use smaller weight tables and come out as 1024 numbers each. Nothing is merged: K and V are simply computed smaller. Each vector is then cut into pieces of 128 numbers, and each piece is one head.",
      s: () => {
        const strip = (cls, n, label) => {
          let h = "";
          for (let j = 0; j < n; j++) h += '<span class="qd-box ' + cls + '">' + (j + 1) + "</span>";
          return '<div class="qd-crow"><span class="qd-lab wide">' + label + "</span>" + h + "</div>";
        };
        return '<div class="qd-scroll"><div class="qd-cache">' +
          '<div class="qd-crow"><span class="qd-lab wide">token "she"</span><span class="qd-box me">4096 numbers</span></div>' +
          strip("q", 32, "Q: 4096 = 32 × 128") + strip("k", 8, "K: 1024 = 8 × 128") + strip("v", 8, "V: 1024 = 8 × 128") +
          '</div></div><p class="qd-hint">Every 4 Q heads share 1 K head and 1 V head (Q1–Q4 use K1/V1, and so on). This design is GQA: fewer K and V to store.</p>';
      },
      k: "32 Q heads, but only 8 K heads and 8 V heads. K and V are computed smaller, not merged.",
    },
    {
      t: "6. Compare \"she\"'s Q with every K",
      x: "Now focus on \"she\". Its Q roughly asks \"which woman do I refer to?\" It is compared with every token's K (including its own), and the more alike they are, the higher the score. The real operation is a dot product: multiply the two vectors position by position and add.",
      s: () => sentence({ me: true, tags: true, dimOtherQ: true }) + bars(scores, (v) => v + " pts", "k", 4),
      k: "The closer Q and K are, the higher the score. Mom's K says \"woman, parent\", so it matches best.",
    },
    {
      t: "7. Turn scores into shares that add up to 100%",
      x: "Raw scores are hard to use, so they go through softmax: high scores get bigger, low scores get smaller, and everything adds up to 100%.",
      s: () => bars(pct, (v) => v.toFixed(1) + "%", "hot", 100),
      k: "The shares say how much attention \"she\" gives each token: 82% goes to Mom.",
    },
    {
      t: "8. Mix the V's by those shares",
      x: "Now take the content. Take a portion of each token's V, in proportion to its share, and add them up.",
      s: () => '<div class="qd-mix">' + words.map((w, i) => '<span class="qd-part"><small>' + pct[i].toFixed(0) + "%</small>" + w + " (" + vtxt[i] + ")</span>").join("<span>+</span>") +
        '</div><div class="qd-out">= what "she" means at this layer: mostly "woman, parent", i.e. Mom</div>',
      k: "That is one attention output. \"She\" now carries Mom's information into the next layer.",
    },
    {
      t: "9. Do it several times at once: multi-head",
      x: "One attention pass can track one kind of relation. So each piece of the vector runs steps 6 to 8 on its own, looking for a different relation. Each piece is a head. What a head looks for is learned in training, not assigned by people.",
      s: () => '<div class="qd-heads">' +
        '<div class="qd-head"><h4>Head 1: who is "she"?</h4>' + bars([11, 2, 82, 1, 4], (v) => v + "%", "hot", 100) + "</div>" +
        '<div class="qd-head"><h4>Head 2: what happened?</h4>' + bars([10, 60, 10, 15, 5], (v) => v + "%", "q", 100) + "</div></div>",
      k: "A head = one piece of the vector running its own attention. Llama-3-8B has 32 per layer.",
    },
    {
      t: "10. Why keep K and V: the KV cache",
      x: "The model writes one token at a time. To write the next token, \"smiled\", it uses its own Q and reads every earlier token's K and V. Earlier Q's are never used again, but earlier K's and V's are read at every new step. So K and V are stored instead of recomputed.",
      s: () => {
        const all = words.concat(["smiled"]);
        const row = (kind, label) => '<div class="qd-crow"><span class="qd-lab">' + label + "</span>" + all.map((w, i) => {
          const isNew = i === all.length - 1;
          return '<span class="qd-box ' + kind + (kind === "q" && !isNew ? " gone" : "") + (isNew ? " new" : "") + '">' + w + "</span>";
        }).join("") + "</div>";
        return '<div class="qd-scroll"><div class="qd-cache">' + row("q", "Q (used once)") + row("k", "K (kept)") + row("v", "V (kept)") + "</div></div>";
      },
      k: "Q is thrown away after use; K and V stay for later tokens to read. The stored K and V are the KV cache.",
    },
    {
      t: "11. Layers × tokens: what the KV cache looks like",
      x: "Each row is a layer (4 here; Llama-3-8B has 32). Each column is a token, and each cell holds that token's K and V at that layer. The prompt was processed in one pass, so its columns are already filled. Click Next to watch a new token climb the layers.",
      s: () => '<div class="qd-row"><button type="button" class="qd-btn primary" data-l-step>Next</button><button type="button" class="qd-btn" data-l-reset>Reset</button></div><p class="qd-out" data-l-msg></p><div class="qd-scroll"><div class="qd-lgrid" data-l-grid></div></div>',
      after: (root) => {
        const prompt = ["Tom", "gave", "Mom", "an", "apple"], gen = [",", "she", "smiled"], L = 4;
        const grid = root.querySelector("[data-l-grid]"), msg = root.querySelector("[data-l-msg]"), btn = root.querySelector("[data-l-step]");
        let cols, cur, layer;
        const draw = () => {
          const all = prompt.concat(gen);
          grid.style.gridTemplateColumns = "64px repeat(" + all.length + ", minmax(52px, 1fr))";
          let h = "";
          for (let l = L; l >= 1; l--) {
            h += '<span class="qd-lab">layer ' + l + "</span>";
            for (let c = 0; c < all.length; c++) {
              let cls = "qd-lc", txt = "";
              const isCur = c === cur;
              if (c < cols.length && !isCur) { cls += " done"; txt = "K V"; }
              if (isCur) { if (l < layer) { cls += " done"; txt = "K V"; } else if (l === layer) { cls += " now"; txt = "now"; } }
              if (cur >= 0 && l === layer && c < cur) cls += " read";
              h += '<div class="' + cls + '">' + txt + "</div>";
            }
          }
          h += '<span class="qd-lab"></span>';
          all.forEach((w, c) => { h += '<span class="qd-colw' + (c === cur ? " cur" : c < cols.length ? "" : " future") + '">' + w + "</span>"; });
          grid.innerHTML = h;
        };
        const reset = () => {
          cols = prompt.slice(); cur = -1; layer = 0; btn.disabled = false; draw();
          msg.textContent = "The 5 prompt tokens were processed together: each went through all 4 layers and stored its K and V at every layer.";
        };
        btn.addEventListener("click", () => {
          if (cur < 0 || layer > L) {
            let gi = cols.length - prompt.length;
            if (cur >= 0) { cols.push(gen[gi]); gi++; }
            if (gi >= gen.length) {
              cur = -1; draw(); btn.disabled = true;
              msg.textContent = "Done. No filled cell ever changed: later tokens only read them. That is why the KV cache can be computed once and reused.";
              return;
            }
            cur = cols.length; layer = 1;
            msg.textContent = "New token \"" + gen[gi] + "\" enters layer 1: it computes its own K and V for this layer (red cell), then reads the K and V of every earlier token in layer 1 (outlined).";
          } else {
            layer++;
            const w = gen[cur - prompt.length];
            msg.textContent = layer <= L
              ? "\"" + w + "\" moves up to layer " + layer + " with what it mixed in the layer below. Same again: store its own K and V, then read only layer " + layer + "'s earlier K and V."
              : "\"" + w + "\" has gone through all 4 layers and stored K and V at each. The top layer predicts the next word, which starts again at layer 1.";
          }
          draw();
        });
        root.querySelector("[data-l-reset]").addEventListener("click", reset);
        reset();
      },
      k: "Every new token climbs from layer 1 to the top. At each layer it stores its own K and V, then reads that layer's K and V for all earlier tokens.",
    },
  ];

  function mount(root) {
    root.innerHTML =
      '<nav class="qd-dots" aria-label="Steps"></nav>' +
      '<div class="qd-card" aria-live="polite"><h3 class="qd-title"></h3><p class="qd-text"></p><div class="qd-stage"></div><p class="qd-key"></p></div>' +
      '<div class="qd-nav"><button type="button" class="qd-btn" data-prev>Back</button><button type="button" class="qd-btn primary" data-next>Next</button></div>' +
      '<p class="qd-hint">Numbers are picked to make the idea clear. A real model uses thousands of numbers per token.</p>';
    const dots = root.querySelector(".qd-dots");
    let i = 0;
    steps.forEach((_, n) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = n + 1; b.setAttribute("aria-label", "Step " + (n + 1));
      b.addEventListener("click", () => go(n));
      dots.appendChild(b);
    });
    function go(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      const s = steps[i];
      root.querySelector(".qd-title").textContent = s.t;
      root.querySelector(".qd-text").textContent = s.x;
      root.querySelector(".qd-stage").innerHTML = s.s();
      root.querySelector(".qd-key").textContent = s.k;
      if (s.after) s.after(root.querySelector(".qd-stage"));
      root.querySelector("[data-prev]").disabled = i === 0;
      const next = root.querySelector("[data-next]");
      next.disabled = i === steps.length - 1;
      next.textContent = i === steps.length - 1 ? "Done" : "Next";
      dots.querySelectorAll("button").forEach((b, k) => { if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    }
    root.querySelector("[data-prev]").addEventListener("click", () => go(i - 1));
    root.querySelector("[data-next]").addEventListener("click", () => go(i + 1));
    go(0);
  }

  document.querySelectorAll("[data-qkv-demo]").forEach(mount);
})();
