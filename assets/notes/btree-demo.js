// Interactive figures for the B-Tree and B+ Tree post.
// [data-btree-demo="search"]: a lookup and a range query on a B-tree vs a B+ tree, one node visit per step.
// [data-btree-demo="split"]: inserting keys into a B+ tree (max 3 keys per node) to show how splits grow the tree.
// Reuses .qkv-demo styles (buttons, dots, text) plus bt-* rules in main.css.
(function () {
  const KW = 30, KH = 26, PAD = 3, GAP = 24, LH = 64, M = 8, SIDE = 96;
  const N = (keys, children) => ({ keys, children: children || null });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Search demo data ----------
  // A step visits one node (at: path id, "r" = root, "r.1" = root's 2nd child).
  // via: "link" = reached by following a leaf link. take/found/stop: keys to mark in that node.
  const SEARCH = {
    btree: {
      label: "B-Tree", links: false, labels: ["keys + rows", "keys + rows"],
      tree: () => N([20, 40], [N([5, 10]), N([30]), N([50, 60])]),
      queries: {
        point: [
          { at: "r", found: [20], key: true,
            text: "Read the root [20 | 40]. 20 is right here, and in a B-tree its row is stored with it. Done after 1 node." },
        ],
        range: [
          { at: "r", text: "Read the root. 10 < 20, so go down to the left child." },
          { at: "r.0", take: [10], text: "Read [5 | 10]. Take 10. Nothing bigger is in this leaf, so the next key is back up in the parent." },
          { at: "r", take: [20], text: "Back up to the root. Take 20, which is stored here with its row." },
          { at: "r.1", take: [30], text: "Down to the middle child. Take 30." },
          { at: "r", take: [40], text: "Back up to the root again. Take 40." },
          { at: "r.2", stop: [50], key: true,
            text: "Down to the right child. 50 > 45, stop. 6 node visits, and the root was visited 3 times." },
        ],
      },
    },
    bplus: {
      label: "B+ Tree", links: true, labels: ["keys only", "keys + rows"],
      tree: () => N([20, 40], [N([5, 10]), N([20, 30]), N([40, 50, 60])]),
      queries: {
        point: [
          { at: "r", text: "Read the root [20 | 40]. 20 is here, but only as a signpost with no row. 20 ≥ 20, so go down to the middle child." },
          { at: "r.1", found: [20], key: true,
            text: "Read the leaf [20 | 30]. Found 20 and its row. Every lookup ends at a leaf, so every lookup visits the same number of nodes: 2 here." },
        ],
        range: [
          { at: "r", text: "Read the root. 10 < 20, so go down to the left child." },
          { at: "r.0", take: [10], text: "Read the leaf [5 | 10]. Take 10." },
          { at: "r.1", via: "link", take: [20, 30], text: "Follow the link to the next leaf. Take 20 and 30. No trip back up to the root." },
          { at: "r.2", via: "link", take: [40], stop: [50], key: true,
            text: "Follow the link again. Take 40. 50 > 45, stop. 4 node visits, and the root was visited once." },
        ],
      },
    },
  };
  const QUERIES = {
    point: { label: "Lookup 20", sql: "WHERE id = 20" },
    range: { label: "Range 10 to 45", sql: "WHERE id BETWEEN 10 AND 45" },
  };

  // ---------- Split demo data (B+ tree, max 3 keys per node) ----------
  // over: node id that has one key too many. added: "id:key" cells that are new in this step.
  const SPLIT = [
    { tree: () => N([10, 20, 30]), added: ["r:10", "r:20", "r:30"],
      text: "Insert 10, 20, 30. In this demo a node holds at most 3 keys (a real 16 KB page holds hundreds). The only node is both the root and a leaf, and it is now full." },
    { tree: () => N([10, 20, 30, 40]), over: "r", added: ["r:40"],
      text: "Insert 40. The node now has 4 keys, one too many, so it must split." },
    { tree: () => N([30], [N([10, 20]), N([30, 40])]), added: ["r:30"],
      text: "Split it in half: [10 | 20] and [30 | 40]. The first key of the right half, 30, is copied up into a new root. The tree now has 2 levels." },
    { tree: () => N([30], [N([10, 20]), N([30, 40, 50, 60])]), over: "r.1", added: ["r.1:50", "r.1:60"],
      text: "Insert 50 and 60. Both are ≥ 30, so both go into the right leaf, which overflows." },
    { tree: () => N([30, 50], [N([10, 20]), N([30, 40]), N([50, 60])]), added: ["r:50"],
      text: "Split the leaf and copy 50 up into the root. The root got wider, not taller." },
    { tree: () => N([30, 50], [N([10, 20]), N([30, 40]), N([50, 60, 70, 80])]), over: "r.2", added: ["r.2:70", "r.2:80"],
      text: "Insert 70 and 80. The right-most leaf overflows." },
    { tree: () => N([30, 50, 70], [N([10, 20]), N([30, 40]), N([50, 60]), N([70, 80])]), added: ["r:70"],
      text: "Split it and copy 70 up. The root now has 3 keys, so it is full." },
    { tree: () => N([30, 50, 70], [N([10, 20]), N([30, 40]), N([50, 60]), N([70, 80, 90, 100])]), over: "r.3", added: ["r.3:90", "r.3:100"],
      text: "Insert 90 and 100. The right-most leaf overflows once more." },
    { tree: () => N([30, 50, 70, 90], [N([10, 20]), N([30, 40]), N([50, 60]), N([70, 80]), N([90, 100])]), over: "r", added: ["r:90"],
      text: "Split the leaf and copy 90 up. Now the root has 4 keys and overflows too." },
    { tree: () => N([70], [N([30, 50], [N([10, 20]), N([30, 40]), N([50, 60])]), N([90], [N([70, 80]), N([90, 100])])]), added: ["r:70"], key: true,
      text: "Split the root into [30 | 50] and [90], and move the middle key 70 up into a new root. The tree grew from the top, so every leaf is still at the same depth." },
  ];

  // ---------- Layout + drawing ----------
  // Leaves are placed left to right; each parent is centered over its first and last child.
  function layout(root) {
    const nodes = [], leaves = [];
    let cur = 0, depth = 0;
    (function walk(nd, d, id) {
      nd.id = id; nd.d = d; nd.w = nd.keys.length * KW + PAD * 2;
      depth = Math.max(depth, d);
      nodes.push(nd);
      if (nd.children) {
        nd.children.forEach((c, i) => walk(c, d + 1, id + "." + i));
        nd.cx = (nd.children[0].cx + nd.children[nd.children.length - 1].cx) / 2;
      } else {
        nd.cx = cur + nd.w / 2;
        cur += nd.w + GAP;
        leaves.push(nd);
      }
    })(root, 0, "r");
    nodes.forEach((nd) => { nd.x = M + nd.cx - nd.w / 2; nd.y = M + nd.d * LH; });
    return { nodes, leaves, levels: depth + 1, w: cur - GAP + 2 * M, h: depth * LH + KH + 2 * M };
  }

  function nodeAt(root, id) {
    return id.split(".").slice(1).reduce((nd, i) => nd.children[+i], root);
  }

  // st: { node: {id: "now"|"seen"|"over"}, key: {"id:key": "take"|"stop"|"new"}, edges: Set(childId), links: Set(rightLeafId) }
  function draw(root, st, opt) {
    const L = layout(root);
    const W = L.w + (opt.labels ? SIDE : 0);
    let out = "";
    L.nodes.forEach((nd) => (nd.children || []).forEach((c, i) => {
      const on = st.edges && st.edges.has(c.id) ? " on" : "";
      out += '<line class="bt-edge' + on + '" x1="' + (nd.x + PAD + i * KW) + '" y1="' + (nd.y + KH) +
        '" x2="' + (c.x + c.w / 2) + '" y2="' + c.y + '"/>';
    }));
    if (opt.links) L.leaves.forEach((a, i) => {
      const b = L.leaves[i + 1];
      if (!b) return;
      const on = st.links && st.links.has(b.id) ? " on" : "";
      const y = a.y + KH / 2, x1 = a.x + a.w + 3, x2 = b.x - 3;
      out += '<g class="bt-link' + on + '"><line x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - 5) + '" y2="' + y + '"/>' +
        '<path d="M' + (x2 - 6) + "," + (y - 4) + " L" + x2 + "," + y + " L" + (x2 - 6) + "," + (y + 4) + 'Z"/></g>';
    });
    L.nodes.forEach((nd) => {
      const ns = st.node && st.node[nd.id] ? " " + st.node[nd.id] : "";
      out += '<g class="bt-node' + ns + '"><rect class="bt-box" x="' + nd.x + '" y="' + nd.y + '" width="' + nd.w + '" height="' + KH + '" rx="5"/>';
      nd.keys.forEach((k, i) => {
        const kc = (st.key && st.key[nd.id + ":" + k]) || "";
        const kx = nd.x + PAD + i * KW;
        if (kc) out += '<rect class="bt-cell ' + kc + '" x="' + (kx + 1) + '" y="' + (nd.y + 3) + '" width="' + (KW - 2) + '" height="' + (KH - 6) + '" rx="3"/>';
        if (i) out += '<line class="bt-sep" x1="' + kx + '" y1="' + (nd.y + 4) + '" x2="' + kx + '" y2="' + (nd.y + KH - 4) + '"/>';
        out += '<text class="bt-key ' + kc + '" x="' + (kx + KW / 2) + '" y="' + (nd.y + KH / 2) + '">' + k + "</text>";
      });
      out += "</g>";
    });
    if (opt.labels) opt.labels.forEach((t, d) => {
      out += '<text class="bt-side" x="' + (L.w + 6) + '" y="' + (M + d * LH + KH / 2) + '">' + esc(t) + "</text>";
    });
    return {
      levels: L.levels,
      html: '<div class="qd-scroll"><svg class="bt-svg" viewBox="0 0 ' + W + " " + L.h + '" style="max-width:' + W + 'px" role="img" aria-label="' +
        esc(opt.aria) + '">' + out + "</svg></div>",
    };
  }

  function nav(n, step) {
    const dots = Array.from({ length: n }, (_, i) =>
      '<button type="button" data-step="' + i + '"' + (i === step ? ' aria-current="step"' : "") + ' aria-label="Step ' + (i + 1) + '">' + (i + 1) + "</button>").join("");
    return '<div class="qd-nav"><div class="qd-dots">' + dots + '</div><div class="qd-row">' +
      '<button type="button" class="qd-btn" data-go="-1"' + (step === 0 ? " disabled" : "") + ">Back</button>" +
      '<button type="button" class="qd-btn primary" data-go="1"' + (step === n - 1 ? " disabled" : "") + ">Next</button></div></div>";
  }

  function toggles(label, attr, items, current) {
    return '<div class="qd-row bt-toggles"><span class="bt-lab">' + label + "</span>" + Object.keys(items).map((k) =>
      '<button type="button" class="qd-btn" data-' + attr + '="' + k + '" aria-pressed="' + (k === current) + '">' + esc(items[k].label) + "</button>").join("") + "</div>";
  }

  // ---------- Search demo ----------
  function mountSearch(el) {
    let mode = "btree", q = "range", step = 0;

    function render() {
      const m = SEARCH[mode], steps = m.queries[q], s = steps[step];
      const root = m.tree();
      const st = { node: {}, key: {}, edges: new Set(), links: new Set() };
      const trail = [], result = [];
      steps.slice(0, step + 1).forEach((v, i) => {
        st.node[v.at] = i === step ? "now" : "seen";
        if (v.via === "link") st.links.add(v.at);
        else if (v.at !== "r") st.edges.add(v.at);
        (v.take || []).concat(v.found || []).forEach((k) => { st.key[v.at + ":" + k] = "take"; result.push(k); });
        (v.stop || []).forEach((k) => { st.key[v.at + ":" + k] = "stop"; });
        trail.push(v.at === "r" ? "root" : "[" + nodeAt(root, v.at).keys.join(" | ") + "]");
      });
      const fig = draw(root, st, { labels: m.labels, links: m.links, aria: m.label + " with the visited nodes highlighted" });

      el.innerHTML =
        toggles("Tree", "mode", SEARCH, mode) +
        toggles("Query", "q", QUERIES, q) +
        nav(steps.length, step) +
        '<p class="qd-hint qd-mono">' + esc(QUERIES[q].sql) + "</p>" +
        '<p class="' + (s.key ? "qd-key" : "qd-text") + '">' + esc(s.text) + "</p>" +
        fig.html +
        '<div class="bt-stats"><div>Nodes visited: <b>' + (step + 1) + '</b> <span class="qd-mono bt-trail">' + esc(trail.join(" → ")) + "</span></div>" +
        "<div>Result: <b>" + (result.length ? result.join(", ") : "none yet") + "</b></div></div>";
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const n = SEARCH[mode].queries[q].length;
      if (b.dataset.mode) { mode = b.dataset.mode; step = 0; }
      else if (b.dataset.q) { q = b.dataset.q; step = 0; }
      else if (b.dataset.step) step = +b.dataset.step;
      else if (b.dataset.go) step = Math.max(0, Math.min(n - 1, step + +b.dataset.go));
      render();
    });
    render();
  }

  // ---------- Split demo ----------
  function mountSplit(el) {
    let step = 0;

    function render() {
      const s = SPLIT[step];
      const st = { node: {}, key: {} };
      if (s.over) st.node[s.over] = "over";
      (s.added || []).forEach((k) => { st.key[k] = "new"; });
      const fig = draw(s.tree(), st, { links: true, aria: "B+ tree after step " + (step + 1) });
      el.innerHTML =
        nav(SPLIT.length, step) +
        '<p class="' + (s.key ? "qd-key" : "qd-text") + '">' + esc(s.text) + "</p>" +
        fig.html +
        '<div class="bt-stats"><div>Levels: <b>' + fig.levels + "</b></div></div>";
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.step) step = +b.dataset.step;
      else if (b.dataset.go) step = Math.max(0, Math.min(SPLIT.length - 1, step + +b.dataset.go));
      render();
    });
    render();
  }

  document.querySelectorAll('[data-btree-demo="search"]').forEach(mountSearch);
  document.querySelectorAll('[data-btree-demo="split"]').forEach(mountSplit);
})();
