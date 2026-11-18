// Interactive figures for the Optimistic vs Pessimistic Lock post.
// Mounts into [data-lock-demo="pessimistic"] and [data-lock-demo="optimistic"].
// Each demo replays two transactions (T1, T2) interleaved in time, in two modes:
// one without protection (shows the lost update) and one with the lock (shows the fix).
// Reuses .qkv-demo styles (buttons, dots, key/hint text) plus lk-* rules in main.css.
(function () {
  // A step: what T1 and/or T2 run at that moment, the row afterwards, and a one-line note.
  // tone: ok | bad | wait. key: true marks the outcome step.
  const SCENARIOS = {
    pessimistic: {
      table: "products", cols: ["id", "stock"], lockCol: true,
      modes: {
        none: {
          label: "No lock",
          intro: "Both requests read the stock, compute the new value in the app, and write it back.",
          steps: [
            { t1: { sql: "BEGIN;\nSELECT stock FROM products\nWHERE id = 1;", res: "stock = 1", tone: "ok" },
              row: { id: 1, stock: 1 }, note: "T1 reads stock = 1. One item left, enough for its order." },
            { t2: { sql: "BEGIN;\nSELECT stock FROM products\nWHERE id = 1;", res: "stock = 1", tone: "ok" },
              row: { id: 1, stock: 1 }, note: "T2 also reads 1, because T1 has not written anything yet." },
            { t1: { sql: "UPDATE products SET stock = 0\nWHERE id = 1;\nCOMMIT;", res: "1 row updated", tone: "ok" },
              row: { id: 1, stock: 0 }, changed: ["stock"], note: "T1 writes 1 - 1 = 0 and commits." },
            { t2: { sql: "UPDATE products SET stock = 0\nWHERE id = 1;\nCOMMIT;", res: "1 row updated", tone: "bad" },
              row: { id: 1, stock: 0 }, key: true,
              note: "T2 also writes 0, computed from the stale 1 it read. Two orders succeeded but there was one item: oversold." },
          ],
        },
        lock: {
          label: "SELECT ... FOR UPDATE",
          intro: "Same two requests, but the read takes a row lock that is held until COMMIT.",
          steps: [
            { t1: { sql: "BEGIN;\nSELECT stock FROM products\nWHERE id = 1 FOR UPDATE;", res: "stock = 1, row locked", tone: "ok" },
              row: { id: 1, stock: 1, lock: "T1" }, changed: ["lock"], note: "T1 reads stock = 1 and now holds the lock on this row." },
            { t2: { sql: "BEGIN;\nSELECT stock FROM products\nWHERE id = 1 FOR UPDATE;", res: "waiting for T1's lock...", tone: "wait" },
              row: { id: 1, stock: 1, lock: "T1" }, note: "T2 asks for the same lock and has to wait. It cannot read the old value." },
            { t1: { sql: "UPDATE products SET stock = 0\nWHERE id = 1;\nCOMMIT;", res: "1 row updated, lock released", tone: "ok" },
              t2: { sql: "", res: "unblocked: stock = 0, row locked", tone: "ok" },
              row: { id: 1, stock: 0, lock: "T2" }, changed: ["stock", "lock"],
              note: "T1 commits and releases the lock. T2's SELECT finally returns, and it sees the new value 0." },
            { t2: { sql: "-- stock is 0, not enough\nROLLBACK;", res: "out of stock", tone: "ok" },
              row: { id: 1, stock: 0 }, changed: ["lock"], key: true,
              note: "T2 sees there is nothing left and rejects the order. One item, one order: correct." },
          ],
        },
      },
    },
    optimistic: {
      table: "users", cols: ["id", "name", "version"], lockCol: false,
      modes: {
        none: {
          label: "No version check",
          intro: "Two people edit the same profile. Each opens the form, changes the name, and saves.",
          steps: [
            { t1: { sql: "SELECT name, version FROM users\nWHERE id = 7;", res: "name = 'Alan', version = 3", tone: "ok" },
              row: { id: 7, name: "'Alan'", version: 3 }, note: "T1 loads the profile into an edit form." },
            { t2: { sql: "SELECT name, version FROM users\nWHERE id = 7;", res: "name = 'Alan', version = 3", tone: "ok" },
              row: { id: 7, name: "'Alan'", version: 3 }, note: "T2 loads the same profile. No lock is taken, so neither waits." },
            { t1: { sql: "UPDATE users SET name = 'Alan W'\nWHERE id = 7;", res: "1 row updated", tone: "ok" },
              row: { id: 7, name: "'Alan W'", version: 3 }, changed: ["name"], note: "T1 saves its change." },
            { t2: { sql: "UPDATE users SET name = 'Hao'\nWHERE id = 7;", res: "1 row updated", tone: "bad" },
              row: { id: 7, name: "'Hao'", version: 3 }, changed: ["name"], key: true,
              note: "T2 saves over it. T1's edit is gone and nobody got an error: last write wins." },
          ],
        },
        lock: {
          label: "Version check",
          intro: "Same edits, but every UPDATE bumps version and only matches the version it read.",
          steps: [
            { t1: { sql: "SELECT name, version FROM users\nWHERE id = 7;", res: "name = 'Alan', version = 3", tone: "ok" },
              row: { id: 7, name: "'Alan'", version: 3 }, note: "T1 loads the profile and remembers version 3." },
            { t2: { sql: "SELECT name, version FROM users\nWHERE id = 7;", res: "name = 'Alan', version = 3", tone: "ok" },
              row: { id: 7, name: "'Alan'", version: 3 }, note: "T2 also remembers version 3. Still no lock, no waiting." },
            { t1: { sql: "UPDATE users\nSET name = 'Alan W', version = 4\nWHERE id = 7 AND version = 3;", res: "1 row updated", tone: "ok" },
              row: { id: 7, name: "'Alan W'", version: 4 }, changed: ["name", "version"],
              note: "The row is still at version 3, so T1's UPDATE matches. Version becomes 4." },
            { t2: { sql: "UPDATE users\nSET name = 'Hao', version = 4\nWHERE id = 7 AND version = 3;", res: "0 rows updated: conflict", tone: "bad" },
              row: { id: 7, name: "'Alan W'", version: 4 },
              note: "The row is now at version 4, so WHERE version = 3 matches nothing. T1's edit is safe, and T2 knows it lost." },
            { t2: { sql: "SELECT name, version FROM users\nWHERE id = 7;", res: "name = 'Alan W', version = 4", tone: "ok" },
              row: { id: 7, name: "'Alan W'", version: 4 }, note: "T2 re-reads (or asks the user to refresh) and sees T1's change." },
            { t2: { sql: "UPDATE users\nSET name = 'Hao', version = 5\nWHERE id = 7 AND version = 4;", res: "1 row updated", tone: "ok" },
              row: { id: 7, name: "'Hao'", version: 5 }, changed: ["name", "version"], key: true,
              note: "The retry matches version 4 and succeeds. T2 overwrote the name knowingly, not by accident." },
          ],
        },
      },
    },
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function mount(el) {
    const sc = SCENARIOS[el.dataset.lockDemo];
    if (!sc) return;
    let mode = "none", step = 0;

    function cell(who, c, state) {
      if (!c) return '<div class="lk-cell empty"></div>';
      const sql = c.sql ? '<pre class="lk-sql">' + esc(c.sql) + "</pre>" : "";
      return '<div class="lk-cell ' + who + " " + c.tone + " " + state + '">' + sql +
        '<div class="lk-res">' + (c.tone === "bad" ? "&#9888; " : c.tone === "wait" ? "&#8987; " : "&rarr; ") + esc(c.res) + "</div></div>";
    }

    function render() {
      const m = sc.modes[mode], s = m.steps[step], n = m.steps.length;
      const cols = sc.cols.concat(sc.lockCol ? ["lock"] : []);
      const changed = s.changed || [];
      const head = cols.map((c) => "<th>" + c + "</th>").join("");
      const body = cols.map((c) => {
        const v = c === "lock" ? (s.row.lock ? "held by " + s.row.lock : "none") : s.row[c];
        const cls = (changed.includes(c) ? "changed" : "") + (c === "lock" && s.row.lock ? " " + s.row.lock.toLowerCase() : "");
        return '<td class="' + cls + '">' + esc(v) + "</td>";
      }).join("");
      const rows = m.steps.map((st, i) => {
        const state = i < step ? "past" : i === step ? "now" : "future";
        return '<div class="lk-step ' + state + '"><div class="lk-n">' + (i + 1) + "</div>" + cell("t1", st.t1, state) + cell("t2", st.t2, state) + "</div>";
      }).join("");
      const modes = Object.keys(sc.modes).map((k) =>
        '<button type="button" class="qd-btn" data-mode="' + k + '" aria-pressed="' + (k === mode) + '">' + esc(sc.modes[k].label) + "</button>").join("");
      const dots = m.steps.map((_, i) =>
        '<button type="button" data-step="' + i + '"' + (i === step ? ' aria-current="step"' : "") + ' aria-label="Step ' + (i + 1) + '">' + (i + 1) + "</button>").join("");

      el.innerHTML =
        '<div class="qd-row lk-modes">' + modes + "</div>" +
        '<p class="qd-hint">' + esc(m.intro) + "</p>" +
        '<div class="lk-db"><div class="lk-db-h">Row in <b>' + sc.table + '</b> after step ' + (step + 1) + '</div>' +
        '<div class="qd-scroll"><table class="lk-table"><tr>' + head + "</tr><tr>" + body + "</tr></table></div></div>" +
        '<div class="lk-time"><div class="lk-step lk-head"><div class="lk-n">#</div><div class="t1">Transaction 1 (T1)</div><div class="t2">Transaction 2 (T2)</div></div>' + rows + "</div>" +
        '<p class="' + (s.key ? "qd-key" : "qd-text") + ' lk-note">' + esc(s.note) + "</p>" +
        '<div class="qd-nav"><div class="qd-dots">' + dots + '</div><div class="qd-row">' +
        '<button type="button" class="qd-btn" data-go="-1"' + (step === 0 ? " disabled" : "") + ">Back</button>" +
        '<button type="button" class="qd-btn primary" data-go="1"' + (step === n - 1 ? " disabled" : "") + ">Next</button></div></div>";
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.mode) { mode = b.dataset.mode; step = 0; }
      else if (b.dataset.step) step = +b.dataset.step;
      else if (b.dataset.go) step = Math.max(0, Math.min(sc.modes[mode].steps.length - 1, step + +b.dataset.go));
      render();
    });
    render();
  }

  document.querySelectorAll("[data-lock-demo]").forEach(mount);
})();
