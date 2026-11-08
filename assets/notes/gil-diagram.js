// Animated process / thread / coroutine / GIL diagram for the Python GIL post.
// Mounts into every element with [data-gil-diagram].
(function () {
  const SVG = `
<svg class="gil-anim__svg" viewBox="0 0 760 404" role="img" aria-label="Process A has three threads taking turns on one GIL. The event loop on MainThread only runs coroutines while MainThread holds the GIL, and coroutines switch at await. Process B has its own GIL and runs at the same time on another core.">
  <defs>
    <marker id="gilArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ga-arrowhead" d="M0,0 L10,5 L0,10 z"></path></marker>
  </defs>

  <rect class="ga-box" x="16" y="16" width="480" height="340" rx="12"></rect>
  <text class="ga-head" x="32" y="38">Process A (worker 1)</text>
  <text class="ga-muted" x="480" y="38" text-anchor="end">1 GIL · 3 threads compete</text>
  <rect class="ga-mem" x="32" y="50" width="448" height="24" rx="5"></rect>
  <text class="ga-muted" x="256" y="66" text-anchor="middle">shared memory: every thread reads/writes</text>

  <rect class="ga-lane active" data-lane="main" x="80" y="86" width="400" height="154" rx="8"></rect>
  <text class="ga-text" x="96" y="106">MainThread · runs event loop</text>
  <text class="ga-status on" data-status="main" x="468" y="106" text-anchor="end">runs Python</text>
  <circle class="ga-dash" cx="160" cy="185" r="30"></circle>
  <text class="ga-muted" x="160" y="182" text-anchor="middle">event</text>
  <text class="ga-muted" x="160" y="196" text-anchor="middle">loop</text>
  <line class="ga-line" x1="194" y1="185" x2="262" y2="185" marker-end="url(#gilArrow)"></line>
  <text class="ga-muted" x="228" y="177" text-anchor="middle">pick next</text>
  <text class="ga-muted" x="314" y="160" text-anchor="middle">running</text>
  <rect class="ga-dash" x="268" y="168" width="92" height="34" rx="6"></rect>
  <text class="ga-muted" x="422" y="130" text-anchor="middle">suspended (I/O)</text>
  <rect class="ga-dash" x="372" y="138" width="100" height="98" rx="6"></rect>

  <rect class="ga-lane" data-lane="t1" x="80" y="250" width="400" height="42" rx="8"></rect>
  <text class="ga-text" x="96" y="276">Thread-1 · thread pool (def route)</text>
  <text class="ga-status" data-status="t1" x="468" y="276" text-anchor="end">waits for GIL</text>
  <rect class="ga-lane" data-lane="t2" x="80" y="300" width="400" height="42" rx="8"></rect>
  <text class="ga-text" x="96" y="326">Thread-2 · thread pool</text>
  <text class="ga-status" data-status="t2" x="468" y="326" text-anchor="end">waits for GIL</text>

  <g class="ga-coro ga-move" data-coro="A" style="--c: var(--ga-c1); transform: translate(272px, 172px)"><rect width="84" height="26" rx="6"></rect><text x="42" y="17" text-anchor="middle">coro A</text></g>
  <g class="ga-coro ga-move" data-coro="B" style="--c: var(--ga-c2); transform: translate(380px, 144px)"><rect width="84" height="26" rx="6"></rect><text x="42" y="17" text-anchor="middle">coro B</text></g>
  <g class="ga-coro ga-move" data-coro="C" style="--c: var(--ga-c3); transform: translate(380px, 174px)"><rect width="84" height="26" rx="6"></rect><text x="42" y="17" text-anchor="middle">coro C</text></g>

  <g class="ga-gil ga-move" data-gil style="transform: translate(52px, 163px)"><circle r="16"></circle><text y="4" text-anchor="middle">GIL</text></g>

  <rect class="ga-box" x="516" y="16" width="228" height="340" rx="12"></rect>
  <text class="ga-head" x="532" y="38">Process B (worker 2)</text>
  <rect class="ga-mem" x="532" y="50" width="196" height="24" rx="5"></rect>
  <text class="ga-muted" x="630" y="66" text-anchor="middle">own memory, A can't see it</text>
  <rect class="ga-lane active" x="580" y="86" width="148" height="154" rx="8"></rect>
  <text class="ga-text" x="592" y="106">MainThread</text>
  <text class="ga-status on ga-pulse" x="592" y="128">always running</text>
  <g class="ga-gil ga-pulse" style="transform: translate(552px, 163px)"><circle r="16"></circle><text y="4" text-anchor="middle">GIL</text></g>
  <text class="ga-muted" x="630" y="280" text-anchor="middle">own interpreter + GIL</text>
  <text class="ga-muted" x="630" y="300" text-anchor="middle">never waits on A's lock</text>

  <line class="ga-line" x1="256" y1="356" x2="256" y2="368" marker-end="url(#gilArrow)"></line>
  <rect class="ga-core" x="186" y="370" width="140" height="28" rx="6"></rect>
  <text class="ga-text" x="256" y="389" text-anchor="middle">CPU core 1</text>
  <line class="ga-line" x1="630" y1="356" x2="630" y2="368" marker-end="url(#gilArrow)"></line>
  <rect class="ga-core" x="560" y="370" width="140" height="28" rx="6"></rect>
  <text class="ga-text" x="630" y="389" text-anchor="middle">CPU core 2</text>
</svg>`;

  const RUN = [272, 172];
  const WAIT = [[380, 144], [380, 174], [380, 204]];
  const GIL_Y = { main: 163, t1: 271, t2: 321 };
  const FRAMES = [
    { gil: "main", run: "A", wait: ["B", "C"], cap: "MainThread holds the GIL. The event loop is running coroutine A; B and C are suspended, waiting on I/O." },
    { gil: "t1", run: "A", wait: ["B", "C"], cap: "About 5 ms later the GIL moves to Thread-1 (a def route in the thread pool). MainThread pauses, and coroutine A pauses with it, because A lives on MainThread." },
    { gil: "main", run: "B", wait: ["C", "A"], cap: "The GIL is back on MainThread. A hit await to wait for the database, so the loop switches to B, whose data just arrived." },
    { gil: "t2", run: "B", wait: ["C", "A"], cap: "The GIL moves to Thread-2. Inside one process, only one thread runs Python at any moment." },
    { gil: "main", run: "C", wait: ["A", "B"], cap: "B awaits too, so the loop switches to C. Coroutines only switch at await. That is the event loop's job, not the GIL's." },
    { gil: "t1", run: "C", wait: ["A", "B"], cap: "Meanwhile Process B has been running the whole time: it has its own GIL, on another core." }
  ];

  function mount(root) {
    root.innerHTML = `
      <div class="gil-anim__scroll">${SVG}</div>
      <div class="gil-anim__bar">
        <p class="gil-anim__status" aria-live="polite"></p>
        <div class="gil-anim__btns">
          <button type="button" class="gil-anim__btn" data-toggle>Pause</button>
          <button type="button" class="gil-anim__btn" data-next>Next step</button>
        </div>
      </div>`;
    const q = (sel) => root.querySelector(sel);
    const status = q(".gil-anim__status");
    const toggle = q("[data-toggle]");
    const next = q("[data-next]");
    const move = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };
    let i = 0;
    let timer = null;

    function show(n) {
      const f = FRAMES[n];
      move(q("[data-gil]"), 52, GIL_Y[f.gil]);
      ["main", "t1", "t2"].forEach((k) => {
        const on = f.gil === k;
        q(`[data-lane="${k}"]`).classList.toggle("active", on);
        const st = q(`[data-status="${k}"]`);
        st.classList.toggle("on", on);
        st.textContent = on ? "runs Python" : "waits for GIL";
      });
      const runEl = q(`[data-coro="${f.run}"]`);
      move(runEl, RUN[0], RUN[1]);
      runEl.classList.toggle("frozen", f.gil !== "main");
      f.wait.forEach((c, k) => {
        const el = q(`[data-coro="${c}"]`);
        move(el, WAIT[k][0], WAIT[k][1]);
        el.classList.remove("frozen");
      });
      status.innerHTML = `<b>${n + 1}/${FRAMES.length}</b>${f.cap}`;
    }
    const step = () => { i = (i + 1) % FRAMES.length; show(i); };
    const stop = () => { if (timer) clearInterval(timer); timer = null; toggle.textContent = "Play"; };
    const start = () => { stop(); timer = setInterval(step, 2800); toggle.textContent = "Pause"; };

    toggle.addEventListener("click", () => (timer ? stop() : start()));
    next.addEventListener("click", () => { stop(); step(); });
    show(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) stop();
    else start();
  }

  document.querySelectorAll("[data-gil-diagram]").forEach(mount);
})();
