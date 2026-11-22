// Interactive figure for the Continuous Batching post. Mounts into [data-cb-demo].
// Reuses .qkv-demo / .paged-demo styles (buttons, colors, log, stats, block cells) plus cb-* rules in main.css.
// Toy scale, simplified from vLLM's scheduler: KV blocks of 4 tokens, a token budget of 8 per step,
// at most 4 running requests. No slots: the limits are blocks, the token budget and the request count.
(function () {
  const BLOCK = 4, BUDGET = 8, MAX_SEQS = 4;
  // p = prompt tokens, o = output tokens (unknown to the scheduler), arrive = step it enters the queue.
  const REQS = [
    { id: "A", p: 4, o: 6, arrive: 1 }, { id: "B", p: 6, o: 8, arrive: 1 }, { id: "C", p: 4, o: 3, arrive: 1 },
    { id: "D", p: 8, o: 5, arrive: 3 }, { id: "E", p: 4, o: 4, arrive: 4 },
  ];
  const COLOR = { A: "pa-a", B: "pa-b", C: "pa-c", D: "pa-d", E: "pa-e" };
  const nb = (t) => Math.ceil(t / BLOCK);

  // continuous=false: static batching. One batch is prefilled together (no token budget) and nobody
  // joins until every request in it has finished. continuous=true: the three checks run every step.
  function makeSim(continuous, mem) {
    const reqs = REQS.map((r) => ({ ...r, gen: 0, done: 0, need: r.p, status: "future", blocks: [], paused: 0 }));
    const owner = new Array(mem).fill(null);
    const running = [], waiting = [];
    const sim = { continuous, mem, owner, reqs, step: 0, log: [], check: "", cells: {}, recomputed: 0, budgetUsed: 0 };
    REQS.forEach((r) => { sim.cells[r.id] = []; });
    const freeCount = () => owner.filter((x) => !x).length;
    function grow(r, n) { // give r blocks until it holds n
      for (let b = 0; b < mem && r.blocks.length < n; b++) if (!owner[b]) { owner[b] = r.id; r.blocks.push(b); }
    }
    function release(r) { r.blocks.forEach((b) => { owner[b] = null; }); r.blocks = []; }
    // KV tokens a request will hold after processing num more tokens this step.
    const kvAfter = (r, num) => (r.done < r.need ? r.done : r.need + r.gen - 1) + num;

    sim.next = function () {
      if (sim.done()) return;
      const s = ++sim.step;
      sim.log = []; sim.check = "";
      let budget = continuous ? BUDGET : Infinity;
      const did = {};
      reqs.filter((r) => r.arrive === s).forEach((r) => { r.status = "wait"; waiting.push(r); if (s > 1) sim.log.push(r.id + " arrives."); });

      // 1. Running requests first: decode = 1 token, unfinished prefill = as much of the prompt as the budget allows.
      const sched = [];
      let preempted = false;
      for (let i = 0; i < running.length; i++) {
        const r = running[i];
        if (budget <= 0) break;
        r.wasRunning = true;
        const num = r.done < r.need ? Math.min(r.need - r.done, budget) : 1;
        const want = nb(kvAfter(r, num));
        let stopped = false;
        while (want > r.blocks.length + freeCount()) {
          // Out of blocks: pause the request that started last, free its blocks, put it at the front of the queue.
          const v = running.pop();
          const had = v.blocks.length;
          release(v);
          const j = sched.findIndex((x) => x[0] === v);
          if (j >= 0) { budget += sched[j][1]; sched.splice(j, 1); }
          v.status = "wait"; v.paused++; v.need = v.p + v.gen; v.done = 0;
          waiting.unshift(v); did[v.id] = { k: "X" }; preempted = true; sim.recomputed += v.need;
          sim.log.push("No free block for " + r.id + ". " + (v === r ? r.id + " started last, so it pauses itself" : v.id + " started last, so it is paused") + ": its " + had + " block" + (had === 1 ? " is" : "s are") + " freed, and later it must recompute K and V for " + v.need + " tokens.");
          if (v === r) { stopped = true; break; }
        }
        if (stopped) break;
        const before = r.blocks.length;
        grow(r, want);
        if (r.blocks.length > before && r.done >= r.need) sim.log.push(r.id + "'s last block is full, so it gets block #" + r.blocks[r.blocks.length - 1] + ".");
        budget -= num; sched.push([r, num]);
      }

      // 2. Waiting requests, in arrival order, while all three checks pass.
      // Static: only when the batch is empty. Continuous: every step, unless something was just preempted.
      const open = continuous ? !preempted : running.length === 0;
      if (waiting.length && !open) {
        sim.check = continuous
          ? "A request was just paused, so no new request is admitted this step."
          : "The batch is still running, so " + waiting.map((r) => r.id).join(" and ") + (waiting.length === 1 ? " waits" : " wait") + " for every request in it to finish.";
      }
      while (waiting.length && open) {
        const r = waiting[0];
        const num = Math.min(r.need, budget);
        const blocksNeeded = nb(num);
        const c1 = running.length < MAX_SEQS, c2 = budget > 0, c3 = c2 && blocksNeeded <= freeCount();
        if (continuous) {
          sim.check = "Checks for " + r.id + ": running " + running.length + " of " + MAX_SEQS + (c1 ? " ✓" : " ✗") +
            " · token budget left " + Math.max(0, budget) + " of " + BUDGET + (c2 ? " ✓" : " ✗") +
            " · free blocks " + freeCount() + (c2 ? ", needs " + blocksNeeded + (c3 ? " ✓" : " ✗") : "") +
            (c1 && c3 ? "" : " → " + r.id + " waits.");
        }
        if (!(c1 && c2 && c3)) break;
        waiting.shift(); running.push(r); r.status = "run"; r.wasRunning = false;
        grow(r, blocksNeeded); budget -= num; sched.push([r, num]);
        sim.log.push(r.id + (r.paused ? " comes back and starts recomputing" : " joins") + ": " + num + " of its " + r.need + (r.paused ? " tokens" : " prompt tokens") + " this step" + (num < r.need ? " (chunked prefill: the budget ran out)" : "") + ", " + r.blocks.length + " block" + (r.blocks.length === 1 ? "" : "s") + ".");
      }
      if (!continuous && open && sched.length) sim.check = "The batch was empty, so a new batch starts and is prefilled together.";

      // 3. One forward pass for everyone scheduled.
      const fin = [];
      for (const [r, num] of sched) {
        if (r.done < r.need) {
          r.done += num;
          did[r.id] = { k: "p", n: num, d: r.done, t: r.need };
          if (r.done >= r.need) { r.gen++; did[r.id].first = true; if (r.wasRunning) sim.log.push(r.id + " finishes its prefill (" + num + " more token" + (num === 1 ? "" : "s") + ") and gets its first token."); }
          else if (r.wasRunning) sim.log.push(r.id + " continues its prefill: " + num + " more tokens.");
        } else { r.gen++; did[r.id] = { k: "d" }; }
        if (r.gen >= r.o) fin.push(r);
      }
      fin.forEach((r) => { sim.log.push(r.id + " finishes and frees " + r.blocks.length + " blocks."); r.status = "done"; release(r); running.splice(running.indexOf(r), 1); });
      sim.budgetUsed = continuous ? BUDGET - budget : sched.reduce((a, x) => a + x[1], 0);
      reqs.forEach((r) => {
        sim.cells[r.id][s] = did[r.id] || (r.status === "wait" ? { k: "w" } : null);
      });
      if (!sim.log.length) sim.log.push("Every running request generates 1 more token.");
      if (sim.done()) sim.log.push("All done.");
    };
    sim.done = () => reqs.every((r) => r.status === "done");
    return sim;
  }

  function mount(root) {
    root.innerHTML =
      '<h3 class="qd-title">Static batching vs. continuous batching</h3>' +
      '<table class="cb-reqs"><thead><tr><th>Request</th><th>Prompt tokens</th><th>Output tokens</th><th>Arrives at</th></tr></thead><tbody>' +
      REQS.map((r) => '<tr><td class="' + COLOR[r.id] + '"><b>' + r.id + '</b></td><td>' + r.p + '</td><td>' + r.o + '</td><td>step ' + r.arrive + '</td></tr>').join('') +
      '</tbody></table>' +
      '<ul class="pa-setup">' +
      '<li>D and E arrive <b>mid-way</b>, to show who can join a batch that is already running. The scheduler knows each prompt length but <b>not the output length</b>.</li>' +
      '<li><b>Same memory on both sides:</b> <span data-memtxt>12</span> KV blocks of 4 tokens. Each step = one forward pass: a running request gets 1 token; a new one first runs its prompt (<b>P</b> = prefill).</li>' +
      '<li><b>Left:</b> one batch, nobody joins until all of it finishes. <b>Right:</b> every step, a waiting request joins only if 3 checks pass: under <b>4 running</b>, <b>8-token budget</b> left, <b>free blocks</b> for its tokens.</li>' +
      '</ul>' +
      '<details class="cb-rules"><summary>Exact rules (simplified from vLLM)</summary><ul class="pa-setup">' +
      '<li>Running requests are served first, then waiting ones in arrival order.</li>' +
      '<li>The 3 checks map to <span class="qd-mono">--max-num-seqs</span>, <span class="qd-mono">--max-num-batched-tokens</span> and the free KV blocks.</li>' +
      '<li>A prompt bigger than the budget left is split across steps (chunked prefill).</li>' +
      '<li>If a running request needs a block and none is free, the request that started last is paused, its blocks freed, and it recomputes later. Nobody new joins in that step.</li>' +
      '<li>Toy values; real vLLM uses blocks of 16 tokens and budgets in the thousands.</li>' +
      '</ul></details>' +
      '<div class="kvc-seg" role="group" aria-label="Memory size"><button type="button" data-mem="12" aria-pressed="true">Memory: 12 blocks</button><button type="button" data-mem="7" aria-pressed="false">Memory: 7 blocks (runs out)</button></div>' +
      '<div class="qd-row"><button type="button" class="qd-btn" data-prev>Previous step</button><button type="button" class="qd-btn primary" data-next>Next step</button><button type="button" class="qd-btn" data-run>Run to end</button><button type="button" class="qd-btn" data-reset>Reset</button><span class="qd-mono" data-step></span></div>' +
      '<p class="qd-hint cb-legend"><span class="cb-cell pa-b soft"><span>P4/6</span></span> prefill: 4 of 6 prompt tokens done <span class="cb-cell pa-b soft two"><span>P6/6<br>+1</span></span> prompt done, first token out <span class="cb-cell pa-b"><span>+1</span></span> 1 new token <span class="cb-cell wait"><span>wait</span></span> in queue <span class="cb-cell paused"><span>X</span></span> paused, K/V thrown away</p>' +
      '<div class="cb-sides">' +
      '<div class="pa-side" data-side="0"><h4 class="pa-h">Static batching</h4><div class="cb-gantt"></div><div class="pa-mem"></div><p class="cb-check"></p><div class="pa-log"></div><div class="pa-stats"></div></div>' +
      '<div class="pa-side" data-side="1"><h4 class="pa-h">Continuous batching</h4><div class="cb-gantt"></div><div class="pa-mem"></div><p class="cb-check"></p><div class="pa-log"></div><div class="pa-stats"></div></div>' +
      '</div>' +
      '<p class="qd-key" data-take></p>';
    let sims, mem = 12, cols = 13, result = null;
    function finalRun() { // run both to the end once, to size the grid and write the summary
      const a = makeSim(false, mem), b = makeSim(true, mem);
      while (!a.done()) a.next();
      while (!b.done()) b.next();
      cols = Math.max(a.step, b.step);
      result = [a, b];
    }
    function names(sim, st) {
      const a = sim.reqs.filter((r) => r.status === st).map((r) =>
        st === "run" ? r.id + (r.done < r.need ? " prefill " + r.done + "/" + r.need : " " + r.gen + "/" + r.o) : st === "wait" && r.paused ? r.id + " (paused)" : r.id);
      return a.length ? a.join(", ") : "none";
    }
    function drawSide(el, sim) {
      let h = '<div class="cb-corner"></div>';
      for (let c = 1; c <= cols; c++) h += '<div class="cb-colh' + (c === sim.step ? " now" : "") + '">' + c + "</div>";
      sim.reqs.forEach((r) => {
        h += '<div class="cb-rowh">' + r.id + "</div>";
        for (let c = 1; c <= cols; c++) {
          const x = c <= sim.step ? sim.cells[r.id][c] : undefined;
          const now = c === sim.step ? " now" : "";
          if (c > sim.step) h += '<div class="cb-cell future"></div>';
          else if (!x) h += '<div class="cb-cell none"></div>';
          else if (x.k === "p") h += '<div class="cb-cell ' + COLOR[r.id] + " soft" + now + '"><span>P' + x.d + "/" + x.t + (x.first ? "<br>+1" : "") + "</span></div>";
          else if (x.k === "d") h += '<div class="cb-cell ' + COLOR[r.id] + now + '"><span>+1</span></div>';
          else if (x.k === "X" || x.k === "x") h += '<div class="cb-cell paused' + now + '"><span>X</span></div>';
          else h += '<div class="cb-cell wait' + now + '"><span>wait</span></div>';
        }
      });
      const g = el.querySelector(".cb-gantt");
      g.style.gridTemplateColumns = "28px repeat(" + cols + ", minmax(0, 1fr))";
      g.innerHTML = h;
      let m = "";
      for (let b = 0; b < sim.mem; b++) {
        const o = sim.owner[b];
        m += o ? '<div class="pa-cell ' + COLOR[o] + '"><i style="width:100%"></i><span>' + o + " #" + b + "</span></div>" : '<div class="pa-cell free"><span>#' + b + "</span></div>";
      }
      el.querySelector(".pa-mem").innerHTML = m;
      el.querySelector(".pa-log").innerHTML = "<b>" + (sim.step ? "Step " + sim.step : "Start") + ":</b> " + (sim.step ? sim.log.join(" ") : "Nothing has run yet. Press Next step.");
      const chk = el.querySelector(".cb-check");
      chk.textContent = sim.step ? sim.check || "No one is waiting." : "The admission check shows here each step.";
      const free = sim.owner.filter((x) => !x).length;
      el.querySelector(".pa-stats").innerHTML =
        "<div><span>Free blocks</span><b>" + free + " of " + sim.mem + "</b></div>" +
        "<div><span>Tokens this step</span><b>" + (sim.step ? sim.budgetUsed + (sim.continuous ? " of " + BUDGET : "") : "n/a") + "</b></div>" +
                "<div><span>Waiting</span><b>" + names(sim, "wait") + "</b></div>" +
                (sim.continuous ? "<div><span>To recompute</span><b>" + sim.recomputed + "</b></div>" : "");
    }
    function draw() {
      root.querySelectorAll(".pa-side").forEach((el, i) => drawSide(el, sims[i]));
      const step = Math.max(sims[0].step, sims[1].step);
      root.querySelector("[data-step]").textContent = "step " + step;
      const [st, cb] = result;
      const end = sims[0].done() && sims[1].done();
      const wait = (s, id) => { let n = 0; for (let c = 1; c <= s.step; c++) if (s.cells[id][c] && s.cells[id][c].k === "w") n++; return n; };
      root.querySelector("[data-take]").textContent = end
        ? (mem === 12
          ? "Static took " + st.step + " steps, continuous " + cb.step + ". In static, D and E waited " + wait(st, "D") + " and " + wait(st, "E") + " steps for B, the longest request; in continuous they waited " + wait(cb, "D") + " and " + wait(cb, "E") + "."
          : "With 7 blocks continuous admitted more than memory could hold as everyone grew, so it paused requests and recomputed " + cb.recomputed + " tokens. Static took " + st.step + " steps, continuous " + cb.step + ": continuous batching bets that requests will not all grow at once, and preemption is the price when the bet fails.")
        : step === 0
          ? "Step through and watch the check line under each grid: it shows why the next waiting request can or cannot join."
          : mem === 12
            ? "Watch step 1 on the bottom: the 8-token budget is used by A's and B's prompts, so C waits one step. Step 3: D's 8-token prompt is split over two steps."
            : "With only 7 blocks, watch for a block running out: the request that started last is paused and must recompute later.";
      root.querySelector("[data-prev]").disabled = step === 0;
      root.querySelector("[data-next]").disabled = end;
      root.querySelector("[data-run]").disabled = end;
    }
    const stepAll = () => sims.forEach((s) => s.next());
    function reset() { finalRun(); sims = [makeSim(false, mem), makeSim(true, mem)]; draw(); }
    root.querySelector("[data-next]").addEventListener("click", () => { stepAll(); draw(); });
    root.querySelector("[data-run]").addEventListener("click", () => { while (!(sims[0].done() && sims[1].done())) stepAll(); draw(); });
    root.querySelector("[data-reset]").addEventListener("click", reset);
    // Deterministic, so going back = replay from the start up to one step earlier.
    root.querySelector("[data-prev]").addEventListener("click", () => {
      const target = Math.max(sims[0].step, sims[1].step) - 1; if (target < 0) return;
      sims = [makeSim(false, mem), makeSim(true, mem)];
      for (let i = 0; i < target; i++) stepAll();
      draw();
    });
    root.querySelectorAll("[data-mem]").forEach((b) => b.addEventListener("click", () => {
      mem = +b.dataset.mem;
      root.querySelectorAll("[data-mem]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      root.querySelector("[data-memtxt]").textContent = mem;
      reset();
    }));
    reset();
  }

  document.querySelectorAll("[data-cb-demo]").forEach((root) => {
    root.innerHTML = '<section class="kvc-part"></section>';
    mount(root.querySelector(".kvc-part"));
  });
})();
