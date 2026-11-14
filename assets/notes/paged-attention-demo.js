// Two interactive figures for the PagedAttention post. Mounts into [data-paged-demo].
// Reuses .qkv-demo / .kv-cache-demo styles plus pa-* rules in main.css.
// Toy scale: blocks of 4 tokens, 24 or 12 blocks of memory, max length 32 tokens, one token per step.
(function () {
  const BLOCK = 4, MAX = 32, STEP = 1, PROMPT = 0;
  const REQS = [{ id: "A", len: 10 }, { id: "B", len: 12 }, { id: "C", len: 11 }, { id: "D", len: 15 }, { id: "E", len: 13 }];
  const COLOR = { A: "pa-a", B: "pa-b", C: "pa-c", D: "pa-d", E: "pa-e" };

  // One side of the comparison. paged=false reserves MAX tokens of contiguous blocks up front.
  // mem = number of blocks in the pool.
  function makeSim(paged, mem) {
    const owner = new Array(mem).fill(null);
    // Paged: free blocks are handed out in a scattered order, like a real free list after some churn.
    let free = [];
    for (let i = 0; i < mem; i++) free.push((i * 7) % mem);
    const reqs = REQS.map((r) => ({ id: r.id, len: r.len, tok: 0, status: "wait", blocks: [], order: 0, paused: 0 }));
    const queue = reqs.slice(); // waiting line, first come first served
    let started = 0;
    const sim = { paged, mem, owner, reqs, step: 0, log: [], recomputed: 0 };
    const span = (bs) => bs.length > 1 && !paged ? "#" + bs[0] + " to #" + bs[bs.length - 1] : bs.map((b) => "#" + b).join(", ");
    const need = (tok) => Math.max(1, Math.ceil(tok / BLOCK));
    function take(r) {
      if (paged) {
        const b = free.shift(); if (b === undefined) return false;
        owner[b] = r.id; r.blocks.push(b); return true;
      }
      const n = MAX / BLOCK;
      for (let s = 0; s + n <= mem; s++) {
        let ok = true;
        for (let j = s; j < s + n; j++) if (owner[j]) { ok = false; break; }
        if (ok) { for (let j = s; j < s + n; j++) { owner[j] = r.id; r.blocks.push(j); } return true; }
      }
      return false;
    }
    function release(r) {
      r.blocks.forEach((b) => { owner[b] = null; if (paged) free.unshift(b); });
      r.blocks = [];
    }
    function admit() {
      while (queue.length) {
        const r = queue[0];
        if (paged) {
          // A paused request comes back with the tokens it already generated, so it needs room for all of them at once.
          const n = r.paused ? need(r.tok) : 1;
          if (free.length < n) break;
          for (let i = 0; i < n; i++) take(r);
        } else if (!take(r)) break;
        queue.shift();
        r.status = "run"; r.order = ++started;
        if (r.paused) {
          sim.recomputed += r.tok;
          sim.log.push(r.id + " comes back: recomputes K and V for its " + r.tok + " tokens and takes " + r.blocks.length + " blocks (" + span(r.blocks) + ").");
        } else {
          r.tok = PROMPT;
          sim.log.push(paged ? r.id + " starts and gets 1 block (" + span(r.blocks) + ")." : r.id + " starts and holds 8 blocks (" + span(r.blocks) + "), room for 32 tokens.");
        }
      }
    }
    // Out of blocks: pause the request that started last, drop its K/V, and put it at the front of the line.
    function preempt(forWhom) {
      const victim = reqs.filter((x) => x.status === "run").sort((x, y) => y.order - x.order)[0];
      const n = victim.blocks.length;
      release(victim);
      victim.status = "wait"; victim.paused++;
      queue.unshift(victim);
      sim.log.push("No free block for " + forWhom.id + ". " + (victim === forWhom ? forWhom.id + " started last, so it pauses itself" : victim.id + " started last, so it is paused") + ": its " + n + " blocks are freed and its K/V is thrown away.");
      return victim;
    }
    sim.next = function () {
      if (sim.done()) return;
      sim.step++; sim.log = [];
      const grew = [], fin = [];
      for (const r of reqs) {
        if (r.status !== "run") continue;
        const want = Math.min(r.len, r.tok + STEP);
        // Paged: grab a new block only when the current one is full.
        let stopped = false;
        while (paged && want > r.blocks.length * BLOCK) {
          if (take(r)) { grew.push(r.id + " → #" + r.blocks[r.blocks.length - 1]); continue; }
          if (preempt(r) === r) { stopped = true; break; }
        }
        if (stopped) continue;
        r.tok = want;
        if (r.tok >= r.len) fin.push(r);
      }
      fin.forEach((r) => { sim.log.push(r.id + " finishes at " + r.len + " tokens and frees its " + r.blocks.length + " blocks."); r.status = "done"; release(r); });
      if (grew.length) sim.log.unshift("Last block full, one more each: " + grew.join(", ") + ".");
      admit();
      if (!sim.log.length) sim.log.push(sim.done() ? "All done." : "Every running request writes 1 more token into a block it already holds. Nothing else changes.");
    };
    sim.done = () => reqs.every((r) => r.status === "done");
    sim.filled = function (b) {
      const r = reqs.find((x) => x.id === owner[b]); if (!r) return 0;
      const idx = r.blocks.indexOf(b);
      return Math.max(0, Math.min(BLOCK, r.tok - idx * BLOCK));
    };
    admit();
    return sim;
  }

  function partCompare(root) {
    root.innerHTML =
      '<h3 class="qd-title">Reserve up front vs. hand out blocks on demand</h3>' +
      '<ul class="pa-setup">' +
      '<li><b>5 requests arrive at the same time.</b> Each will stop at a different length: A 10, B 12, C 11, D 15, E 13 tokens. Nobody knows these lengths in advance.</li>' +
      '<li><b>Both sides have the same memory:</b> <span data-memtxt>24</span> blocks, each holds 4 tokens\' K and V (real vLLM uses 16; scaled down so you can follow every token). A request may grow to at most 32 tokens (8 blocks).</li>' +
      '<li><b>Left</b> holds the maximum, 8 blocks, for every request from the start. <b>Right</b> gives one block at a time.</li>' +
      '<li>A cell like <span class="qd-mono">A #3</span> means block #3 is held by A. <b>Dark bar</b> = tokens written. <b>Light</b> = held but still empty.</li>' +
      '</ul>' +
      '<div class="kvc-seg" role="group" aria-label="Memory size"><button type="button" data-mem="24" aria-pressed="true">Memory: 24 blocks</button><button type="button" data-mem="12" aria-pressed="false">Memory: 12 blocks (runs out)</button></div>' +
      '<p class="qd-text">Press <b>Next step</b>: every running request generates 1 more token. A request frees its blocks only when it reaches its own final length.</p>' +
      '<div class="qd-row"><button type="button" class="qd-btn" data-prev>Previous step</button><button type="button" class="qd-btn primary" data-next>Next step</button><button type="button" class="qd-btn" data-run>Run to end</button><button type="button" class="qd-btn" data-reset>Reset</button><span class="qd-mono" data-step></span></div>' +
      '<div class="pa-sides">' +
      '<div class="pa-side" data-side="0"><h4 class="pa-h">Traditional: hold max length</h4><div class="pa-log"></div><div class="pa-mem"></div><div class="pa-stats"></div></div>' +
      '<div class="pa-side" data-side="1"><h4 class="pa-h">PagedAttention: blocks on demand</h4><div class="pa-log"></div><div class="pa-mem"></div><div class="pa-stats"></div></div>' +
      '</div>' +
      '<div class="qd-row"><span class="qd-hint">Click a request to see its block table:</span><div class="pa-chips"></div></div>' +
      '<div class="pa-tables"></div>' +
      '<p class="qd-key" data-take></p>';
    let sims, sel = "B", mem = 24;
    const chips = root.querySelector(".pa-chips");
    REQS.forEach((r) => { const b = document.createElement("button"); b.type = "button"; b.className = "pa-chip " + COLOR[r.id]; b.dataset.id = r.id; b.textContent = r.id; chips.appendChild(b); });
    function list(sim, st) { const a = sim.reqs.filter((r) => r.status === st).map((r) => st === "run" ? r.id + " " + r.tok + "/" + r.len : st === "wait" && r.paused ? r.id + " (paused, had " + r.tok + ")" : r.id); return a.length ? a.join(", ") : "none"; }
    function drawSide(el, sim) {
      const mem = el.querySelector(".pa-mem");
      let h = "";
      for (let b = 0; b < sim.mem; b++) {
        const o = sim.owner[b];
        if (!o) { h += '<div class="pa-cell free"><span>#' + b + "</span></div>"; continue; }
        const f = sim.filled(b);
        h += '<div class="pa-cell ' + COLOR[o] + (o === sel ? " sel" : "") + '"><i style="width:' + (f / BLOCK) * 100 + '%"></i><span>' + o + " #" + b + "</span></div>";
      }
      mem.innerHTML = h;
      el.querySelector(".pa-log").innerHTML = "<b>" + (sim.step ? "Step " + sim.step : "Start") + ":</b> " + sim.log.join(" ");
      let used = 0, held = 0;
      sim.reqs.forEach((r) => { if (r.status === "run") { used += r.tok; held += r.blocks.length * BLOCK; } });
      const pct = held ? Math.round((used / held) * 100) : 0;
      el.querySelector(".pa-stats").innerHTML =
        "<div><span>Memory held</span><b>" + held / BLOCK + " of " + sim.mem + " blocks</b></div>" +
        "<div><span>Actually used by tokens</span><b>" + (held ? pct + "%" : "n/a") + "</b></div>" +
        "<div><span>Running (written/final)</span><b>" + list(sim, "run") + "</b></div>" +
        "<div><span>Waiting for memory</span><b>" + list(sim, "wait") + "</b></div>" +
        "<div><span>Finished</span><b>" + list(sim, "done") + "</b></div>" +
        (sim.paged ? "<div><span>Tokens recomputed after a pause</span><b>" + sim.recomputed + "</b></div>" : "");
    }
    function table(sim) {
      const r = sim.reqs.find((x) => x.id === sel);
      const name = sim.paged ? "PagedAttention" : "Traditional";
      if (r.status === "wait") return '<div class="pa-table"><b>' + name + "</b><p>" + sel + " is still waiting: no memory for it yet.</p></div>";
      if (r.status === "done") return '<div class="pa-table"><b>' + name + "</b><p>" + sel + " finished; its blocks went back to the pool.</p></div>";
      if (!sim.paged) return '<div class="pa-table"><b>' + name + "</b><p>One contiguous range, blocks #" + r.blocks[0] + " to #" + r.blocks[r.blocks.length - 1] + ", all reserved at the start. " + sel + " has " + r.tok + " tokens, so " + (MAX - r.tok) + " slots sit empty.</p></div>";
      let rows = "";
      r.blocks.forEach((b, i) => { rows += "<tr><td>" + i + "</td><td>tokens " + i * BLOCK + " to " + (i * BLOCK + BLOCK - 1) + "</td><td>#" + b + "</td></tr>"; });
      return '<div class="pa-table"><b>' + name + ": " + sel + "'s block table</b><table><thead><tr><th>Logical block</th><th>Holds</th><th>Physical block</th></tr></thead><tbody>" + rows + "</tbody></table><p>" + sel + " has " + r.tok + " tokens in " + r.blocks.length + " blocks. The physical blocks are scattered; the table keeps them in order.</p></div>";
    }
    function draw() {
      root.querySelectorAll(".pa-side").forEach((el, i) => drawSide(el, sims[i]));
      chips.querySelectorAll(".pa-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === sel)));
      root.querySelector(".pa-tables").innerHTML = table(sims[0]) + table(sims[1]);
      root.querySelector("[data-step]").textContent = "step " + sims[0].step;
      const [t, p] = sims;
      const msg = [];
      if (t.done()) msg.push("Traditional finished all five in " + t.step + " steps.");
      if (p.done()) msg.push("PagedAttention finished all five in " + p.step + " steps.");
      const small = mem === 12;
      root.querySelector("[data-take]").textContent = msg.length
        ? msg.join(" ") + (small ? " With 12 blocks the traditional side fits only one request at a time. Paged runs all five, but once it ran out it had to pause E and recompute " + p.recomputed + " tokens: that is the price of not reserving." : " Same memory, same requests: paging just stops holding empty space, so more requests run at once.")
        : small
          ? "12 blocks: traditional can hold only one request (8 blocks) at a time. Paged lets all five start, betting they will not all grow at once. Step to 9 to see what happens when the bet fails."
          : "Traditional holds 8 blocks per request from the first token, so at most 3 run at once and the rest wait. Paged gives each request one block at a time, so all 5 run and most held memory is real tokens.";
      const end = t.done() && p.done();
      root.querySelector("[data-prev]").disabled = sims[0].step === 0;
      root.querySelector("[data-next]").disabled = end; root.querySelector("[data-run]").disabled = end;
    }
    function reset() { sims = [makeSim(false, mem), makeSim(true, mem)]; draw(); }
    root.querySelector("[data-next]").addEventListener("click", () => { sims.forEach((s) => s.next()); draw(); });
    root.querySelector("[data-run]").addEventListener("click", () => { while (!(sims[0].done() && sims[1].done())) sims.forEach((s) => s.next()); draw(); });
    root.querySelector("[data-reset]").addEventListener("click", reset);
    // The simulation is deterministic, so going back = replay from the start up to one step earlier.
    root.querySelector("[data-prev]").addEventListener("click", () => {
      const target = sims[0].step - 1; if (target < 0) return;
      sims = [makeSim(false, mem), makeSim(true, mem)];
      for (let i = 0; i < target; i++) sims.forEach((s) => s.next());
      draw();
    });
    root.querySelectorAll("[data-mem]").forEach((b) => b.addEventListener("click", () => {
      mem = +b.dataset.mem;
      root.querySelectorAll("[data-mem]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      root.querySelector("[data-memtxt]").textContent = mem;
      reset();
    }));
    chips.addEventListener("click", (e) => { const b = e.target.closest(".pa-chip"); if (b) { sel = b.dataset.id; draw(); } });
    reset();
  }

  function partPrefix(root) {
    root.innerHTML =
      '<h3 class="qd-title">2. Prefix caching: two requests, one copy of the shared start</h3>' +
      '<p class="qd-text">Requests 1 and 2 start with the same 32-token system prompt (exactly 2 full blocks), then ask different questions: 20 tokens and 12 tokens. The prompt\'s K and V are identical in both, because K and V only depend on the tokens before them.</p>' +
      '<div class="kvc-seg" role="group" aria-label="Prefix caching"><button type="button" data-on="0" aria-pressed="true">Prefix caching off</button><button type="button" data-on="1" aria-pressed="false">Prefix caching on</button></div>' +
      '<div class="pa-mem pa-mem-row"></div>' +
      '<div class="pa-tables"></div>' +
      '<p class="qd-key" data-take></p>';
    let on = false;
    // Blocks: S = system prompt, 1/2 = each request's own tokens.
    function layout() {
      const r1 = [{ k: "S", n: 16 }, { k: "S", n: 16 }, { k: "1", n: 16 }, { k: "1", n: 4 }];
      const r2 = [{ k: "S", n: 16 }, { k: "S", n: 16 }, { k: "2", n: 12 }];
      const phys = [], t1 = [], t2 = [];
      r1.forEach((b) => { t1.push(phys.length); phys.push({ k: b.k, n: b.n, refs: 1, who: "1" }); });
      r2.forEach((b, i) => {
        if (on && b.k === "S") { t2.push(t1[i]); phys[t1[i]].refs = 2; return; }
        t2.push(phys.length); phys.push({ k: b.k, n: b.n, refs: 1, who: "2" });
      });
      return { phys, t1, t2 };
    }
    function draw() {
      const { phys, t1, t2 } = layout();
      let h = "";
      phys.forEach((b, i) => {
        const cls = b.k === "S" ? "pa-s" : b.k === "1" ? "pa-a" : "pa-c";
        const lab = b.k === "S" ? "prompt" : "req " + b.k;
        h += '<div class="pa-cell ' + cls + (b.refs > 1 ? " shared" : "") + '"><i style="width:' + (b.n / 16) * 100 + '%"></i><span>#' + i + " " + lab + (b.refs > 1 ? " ×2" : "") + "</span></div>";
      });
      for (let i = phys.length; i < 8; i++) h += '<div class="pa-cell free"><span>#' + i + " free</span></div>";
      root.querySelector(".pa-mem").innerHTML = h;
      function tbl(name, t) {
        let rows = "";
        t.forEach((p, i) => { rows += "<tr" + (phys[p].refs > 1 ? ' class="shared"' : "") + "><td>" + i + "</td><td>" + (phys[p].k === "S" ? "system prompt" : "own question") + "</td><td>#" + p + "</td></tr>"; });
        return '<div class="pa-table"><b>' + name + "'s block table</b><table><thead><tr><th>Logical block</th><th>Holds</th><th>Physical block</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
      }
      root.querySelector(".pa-tables").innerHTML = tbl("Request 1", t1) + tbl("Request 2", t2);
      root.querySelectorAll("[data-on]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.on === "1") === on)));
      root.querySelector("[data-take]").textContent = on
        ? phys.length + " blocks. Both block tables point logical blocks 0 and 1 at the same physical blocks #0 and #1, so the prompt is stored and computed once. Each request still gets its own blocks for its own question. Matching works in whole blocks from the first token: one different token early on, and nothing after it can be shared."
        : phys.length + " blocks. Each request stores its own copy of the same system prompt: blocks #0, #1 and #4, #5 hold identical K and V.";
    }
    root.querySelectorAll("[data-on]").forEach((b) => b.addEventListener("click", () => { on = b.dataset.on === "1"; draw(); }));
    draw();
  }

  document.querySelectorAll("[data-paged-demo]").forEach((root) => {
    // Prefix-caching figure (partPrefix) is kept for a later post; only the comparison is shown here.
    root.innerHTML = '<section class="kvc-part"></section>';
    partCompare(root.querySelector(".kvc-part"));
  });
})();
