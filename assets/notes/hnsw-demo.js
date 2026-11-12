// Interactive HNSW search demo for the HNSW post.
// Mounts into every element with [data-hnsw-demo].
// Simplified build: each layer links every point to its nearest few points, then
// bridges any disconnected islands. The search itself follows real HNSW:
// greedy (ef = 1) on upper layers, beam search of width ef_search on layer 0.
(function () {
  const N = 220, LAYERS = 3, M_UP = 3, M_0 = 5;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const d2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };

  function build(seed) {
    const r = rng(seed), pts = [];
    const centers = Array.from({ length: 6 }, () => [0.15 + 0.7 * r(), 0.15 + 0.7 * r()]);
    const mL = 1 / Math.log(4);
    for (let i = 0; i < N; i++) {
      let x, y;
      if (r() < 0.75) {
        const c = centers[Math.floor(r() * centers.length)];
        const a = r() * 6.283, d = 0.11 * Math.sqrt(r());
        x = c[0] + d * Math.cos(a); y = c[1] + d * Math.sin(a);
      } else { x = r(); y = r(); }
      x = Math.min(0.97, Math.max(0.03, x)); y = Math.min(0.97, Math.max(0.03, y));
      pts.push({ x, y, level: Math.min(LAYERS - 1, Math.floor(-Math.log(1 - r()) * mL)) });
    }
    if (!pts.some((p) => p.level === LAYERS - 1)) pts[0].level = LAYERS - 1;
    const layers = [], adj = [];
    for (let l = 0; l < LAYERS; l++) {
      const ids = pts.map((p, i) => i).filter((i) => pts[i].level >= l);
      const m = l === 0 ? M_0 : M_UP;
      const nb = new Map(ids.map((i) => [i, new Set()]));
      for (const i of ids) {
        const near = ids.filter((j) => j !== i).sort((a, b) => d2(pts[i], pts[a]) - d2(pts[i], pts[b])).slice(0, m);
        for (const j of near) { nb.get(i).add(j); nb.get(j).add(i); }
      }
      for (;;) { // bridge islands so every layer is connected
        const comp = new Map(); let k = 0;
        for (const s of ids) {
          if (comp.has(s)) continue;
          const st = [s]; comp.set(s, k);
          while (st.length) { const x = st.pop(); for (const y of nb.get(x)) if (!comp.has(y)) { comp.set(y, k); st.push(y); } }
          k++;
        }
        if (k <= 1) break;
        let best = null, bd = Infinity;
        for (const a of ids) if (comp.get(a) === 0) for (const b of ids) if (comp.get(b) !== 0) {
          const d = d2(pts[a], pts[b]); if (d < bd) { bd = d; best = [a, b]; }
        }
        nb.get(best[0]).add(best[1]); nb.get(best[1]).add(best[0]);
      }
      layers.push(ids); adj.push(nb);
    }
    return { pts, layers, adj, entry: pts.findIndex((p) => p.level === LAYERS - 1) };
  }

  function search(G, q, ef) {
    const { pts, adj, entry } = G, ev = []; let count = 0;
    const dist = (i) => { count++; return d2(pts[i], q); };
    let cur = entry, curD = dist(cur);
    ev.push({ l: LAYERS - 1, t: "cur", n: cur });
    for (let l = LAYERS - 1; l >= 1; l--) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const nb of adj[l].get(cur)) {
          const d = dist(nb); ev.push({ l, t: "eval", n: nb });
          if (d < curD) { ev.push({ l, t: "move", a: cur, b: nb }); cur = nb; curD = d; changed = true; }
        }
      }
      ev.push({ l: l - 1, t: "cur", n: cur });
    }
    const seen = new Set([cur]), dd = new Map([[cur, curD]]);
    const cand = [cur], W = [cur];
    while (cand.length) {
      cand.sort((a, b) => dd.get(a) - dd.get(b));
      const c = cand.shift();
      if (W.length >= ef && dd.get(c) > dd.get(W[W.length - 1])) break;
      ev.push({ l: 0, t: "expand", n: c });
      for (const nb of adj[0].get(c)) {
        if (seen.has(nb)) continue;
        seen.add(nb); const d = dist(nb); dd.set(nb, d); ev.push({ l: 0, t: "eval", n: nb });
        if (W.length < ef || d < dd.get(W[W.length - 1])) {
          cand.push(nb); W.push(nb); W.sort((a, b) => dd.get(a) - dd.get(b));
          if (W.length > ef) W.pop();
        }
      }
    }
    let best = 0;
    for (let i = 1; i < N; i++) if (d2(pts[i], q) < d2(pts[best], q)) best = i;
    ev.push({ l: 0, t: "done", found: W[0], best, count });
    return ev;
  }

  function mount(root) {
    root.innerHTML = `
      <div class="hnsw-demo__controls">
        <button type="button" class="hnsw-demo__btn" data-rand>New query</button>
        <button type="button" class="hnsw-demo__btn" data-replay>Replay</button>
        <button type="button" class="hnsw-demo__btn" data-graph>New graph</button>
        <label class="hnsw-demo__ef">ef_search <input type="range" min="1" max="16" value="3" data-ef><output data-ef-out>3</output></label>
      </div>
      <div class="hnsw-demo__layers">
        ${[2, 1, 0].map((l) => `<figure class="hnsw-demo__sheet"><figcaption>Layer ${l}<span data-count="${l}"></span></figcaption><canvas data-layer="${l}" aria-label="Layer ${l}"></canvas></figure>`).join("")}
      </div>
      <p class="hnsw-demo__readout" aria-live="polite">
        <span>Distances computed: <b data-dist>-</b> / 220</span>
        <span>True nearest found: <b data-hit>-</b></span>
      </p>
      <p class="hnsw-demo__legend"><i class="q"></i>query <i class="p"></i>search path <i class="e"></i>checked <i class="h"></i>true nearest. Click any layer to place a query.</p>`;
    const q = (s) => root.querySelector(s);
    const canvases = [...root.querySelectorAll("canvas")];
    const ef = q("[data-ef]"), efOut = q("[data-ef-out]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 7, G, query, events = [], step = 0, timer = null;
    const qr = rng(99);

    function colors() {
      const s = getComputedStyle(root), g = (k) => s.getPropertyValue(k).trim();
      return { bg: g("--hd-surface"), edge: g("--hd-edge"), dot: g("--hd-dot"), fg: g("--hd-fg"),
        accent: g("--hd-accent"), soft: g("--hd-soft"), query: g("--hd-query"), hit: g("--hd-hit") };
    }
    function size() {
      const dpr = window.devicePixelRatio || 1;
      for (const c of canvases) { const w = c.clientWidth; if (w) { c.width = Math.round(w * dpr); c.height = Math.round(w * dpr); } }
    }
    function draw() {
      const C = colors(), { pts, layers, adj, entry } = G;
      const st = [0, 1, 2].map(() => ({ eval: new Set(), expand: new Set(), moves: [], cur: null }));
      let done = null;
      for (let k = 0; k < step && k < events.length; k++) {
        const e = events[k];
        if (e.t === "eval") st[e.l].eval.add(e.n);
        else if (e.t === "expand") { st[0].expand.add(e.n); st[0].cur = e.n; }
        else if (e.t === "move") { st[e.l].moves.push([e.a, e.b]); st[e.l].cur = e.b; }
        else if (e.t === "cur") st[e.l].cur = e.n;
        else if (e.t === "done") done = e;
      }
      for (const c of canvases) {
        const l = +c.dataset.layer, ctx = c.getContext("2d"), W = c.width, H = c.height;
        if (!W) continue;
        const u = W / 300, X = (p) => p.x * W, Y = (p) => p.y * H;
        const dot = (p, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(X(p), Y(p), r * u, 0, 6.283); ctx.fill(); };
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        if (l > 0) for (const p of pts) if (p.level < l) dot(p, 1.2, C.edge);
        ctx.strokeStyle = C.edge; ctx.lineWidth = 1 * u; ctx.beginPath();
        for (const [i, s] of adj[l]) for (const j of s) if (i < j) { ctx.moveTo(X(pts[i]), Y(pts[i])); ctx.lineTo(X(pts[j]), Y(pts[j])); }
        ctx.stroke();
        const S = st[l];
        for (const i of S.eval) dot(pts[i], 6, C.soft);
        for (const i of layers[l]) dot(pts[i], l > 0 ? 3.4 : 2.8, S.expand.has(i) ? C.accent : C.dot);
        ctx.strokeStyle = C.accent; ctx.lineWidth = 3.2 * u; ctx.lineCap = "round";
        for (const [a, b] of S.moves) { ctx.beginPath(); ctx.moveTo(X(pts[a]), Y(pts[a])); ctx.lineTo(X(pts[b]), Y(pts[b])); ctx.stroke(); }
        if (l === LAYERS - 1) { const p = pts[entry]; ctx.fillStyle = C.fg; ctx.font = `${13 * u}px ui-monospace, Menlo, monospace`; ctx.fillText("entry", X(p) + 7 * u, Y(p) - 7 * u); }
        if (S.cur !== null) { ctx.strokeStyle = C.accent; ctx.lineWidth = 2.4 * u; ctx.beginPath(); ctx.arc(X(pts[S.cur]), Y(pts[S.cur]), 7.5 * u, 0, 6.283); ctx.stroke(); }
        if (done && l === 0) { ctx.strokeStyle = C.hit; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(X(pts[done.best]), Y(pts[done.best]), 11 * u, 0, 6.283); ctx.stroke(); }
        if (query) {
          const qx = query.x * W, qy = query.y * H, r = 6.5 * u;
          ctx.strokeStyle = C.query; ctx.lineWidth = 3 * u;
          ctx.beginPath(); ctx.moveTo(qx - r, qy - r); ctx.lineTo(qx + r, qy + r); ctx.moveTo(qx + r, qy - r); ctx.lineTo(qx - r, qy + r); ctx.stroke();
        }
      }
      const hit = q("[data-hit]");
      if (done) {
        q("[data-dist]").textContent = done.count;
        const ok = done.found === done.best;
        hit.textContent = ok ? "yes" : "no, stuck at a local optimum";
        hit.className = ok ? "ok" : "bad";
      } else { q("[data-dist]").textContent = "…"; hit.textContent = "…"; hit.className = ""; }
    }
    function run() {
      clearInterval(timer);
      events = search(G, query, +ef.value);
      if (reduce) { step = events.length; draw(); return; }
      step = 0; draw();
      const delay = Math.max(16, Math.min(80, 3600 / events.length));
      timer = setInterval(() => { step++; draw(); if (step >= events.length) clearInterval(timer); }, delay);
    }
    function rebuild() {
      G = build(seed);
      for (let l = 0; l < LAYERS; l++) q(`[data-count="${l}"]`).textContent = `${G.layers[l].length} points`;
    }

    canvases.forEach((c) => c.addEventListener("click", (ev) => {
      const r = c.getBoundingClientRect();
      query = { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }; run();
    }));
    q("[data-rand]").addEventListener("click", () => { query = { x: 0.06 + 0.88 * qr(), y: 0.06 + 0.88 * qr() }; run(); });
    q("[data-replay]").addEventListener("click", run);
    q("[data-graph]").addEventListener("click", () => { seed += 1; rebuild(); run(); });
    ef.addEventListener("input", () => { efOut.textContent = ef.value; run(); });
    new ResizeObserver(() => { size(); draw(); }).observe(q(".hnsw-demo__layers"));
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    rebuild(); size();
    query = { x: 0.78, y: 0.22 };
    events = search(G, query, +ef.value); step = events.length; draw();
  }

  document.querySelectorAll("[data-hnsw-demo]").forEach(mount);
})();
