/* Topology Lab: interface.
   Views: home (role play list), lab (the drawing board), guide, quiz.
   The lab keeps one graph per board in localStorage, so a half-built chart is
   still there after a reload. Scoring and answer keys come from engine.js. */
(function () {
  'use strict';
  var TL = window.TL;
  var STORE_KEY = 'tl_v1';
  var W = TL.SIZE.w, H = TL.SIZE.h, BAR = TL.SIZE.bar;

  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  var uidN = 0;
  function uid(p) { return p + Date.now().toString(36) + (uidN++).toString(36); }

  /* ---- icons: marker sketches on a 48 x 48 box ------------------------- */
  var CLOUD = 'M15 35h19a8 8 0 0 0 1.6-15.8A11 11 0 0 0 14.4 21 7 7 0 0 0 15 35z';
  var ICONS = {
    cloud: '<path d="' + CLOUD + '"/>',
    cloudup: '<path d="' + CLOUD + '"/><path d="M24.5 31v-9M20.8 25.4l3.7-3.7 3.7 3.7"/>',
    tower: '<path d="M24 22v20M17 42h14M20 32l4-10 4 10"/><circle cx="24" cy="20" r="2.2"/><path d="M17.6 13.6a9 9 0 0 1 12.8 0M13.4 9.4a15 15 0 0 1 21.2 0"/>',
    firewall: '<rect x="7" y="11" width="34" height="26" rx="2"/><path d="M7 19.7h34M7 28.3h34M18 11v8.7M30 11v8.7M13 19.7v8.6M24 19.7v8.6M35 19.7v8.6M18 28.3V37M30 28.3V37"/>',
    switch: '<rect x="5" y="15" width="38" height="18" rx="4"/><path d="M12 21h11M20 18l3 3-3 3M36 27H25M28 24l-3 3 3 3"/>',
    hub: '<rect x="5" y="17" width="38" height="14" rx="4"/><path class="dot" d="M13 24h.01M20.3 24h.01M27.7 24h.01M35 24h.01"/>',
    ap: '<rect x="13" y="29" width="22" height="9" rx="3"/><path d="M24 29v-4M18.3 19.3a8 8 0 0 1 11.4 0M13.4 14.4a15 15 0 0 1 21.2 0"/>',
    server: '<rect x="14" y="5" width="20" height="38" rx="3"/><path d="M14 17.5h20M14 30.5h20"/><path class="dot" d="M19.5 11.5h.01M19.5 24h.01M19.5 37h.01"/>',
    nas: '<rect x="7" y="13" width="34" height="22" rx="3"/><path d="M15.5 13v22M24 13v22M32.5 13v22M11 39.5h26"/>',
    ups: '<rect x="8" y="15" width="32" height="22" rx="3"/><path d="M15 15v-4h5v4M28 15v-4h5v4M14 26h7M17.5 22.5v7M27 26h7"/>',
    building: '<path d="M9 42V10h19v32M28 21h11v21M5 42h38"/><path d="M14.5 17h3M21 17h3M14.5 24h3M21 24h3M14.5 31h3M21 31h3M32.5 28h2.5M32.5 35h2.5"/>',
    home: '<path d="M7 24 24 9l17 15M12 20.5V40h24V20.5M20 40V29h8v11"/>',
    pc: '<rect x="7" y="9" width="34" height="23" rx="3"/><path d="M24 32v7M15 40h18"/>',
    laptop: '<rect x="11" y="10" width="26" height="19" rx="2.5"/><path d="M4.5 36h39l-3.5-7h-32z"/>',
    tablet: '<rect x="13" y="5" width="22" height="38" rx="4"/><path d="M21.5 37.5h5"/>',
    phone: '<rect x="15" y="5" width="18" height="38" rx="4"/><path d="M21.5 37.5h5"/>',
    pos: '<rect x="12" y="6" width="24" height="18" rx="3"/><path d="M24 24v6M20 35.5h8"/><rect x="8" y="30" width="32" height="11" rx="2.5"/>',
    printer: '<path d="M14 18V7h20v11M14 27h20v14H14z"/><rect x="7" y="18" width="34" height="15" rx="3"/>',
    display: '<rect x="5" y="8" width="38" height="25" rx="3"/><path d="M11 15.5h11M11 21h16M11 26.5h8M24 33v6M16 40h16"/>',
    medical: '<rect x="6" y="9" width="36" height="24" rx="3"/><path d="M10.5 22H17l2.8-6.5 4.4 12 3-5.5H38M24 33v6M16 40h16"/>',
    terminator: '<path d="M8 24h16"/><rect x="24" y="15" width="13" height="18" rx="3"/><path d="M28.5 21v6M32.5 21v6"/>',
    backbone: '<path class="thick" d="M4 24h40"/><path d="M13 24v-9M24 24v9M35 24v-9"/>'
  };
  function icon(name, size) {
    return '<svg class="ic" viewBox="0 0 48 48" width="' + (size || 30) + '" height="' + (size || 30) + '" aria-hidden="true">' + (ICONS[name] || ICONS.pc) + '</svg>';
  }
  function starsSvg(n) {
    var out = '';
    for (var i = 0; i < 3; i++) out += '<svg class="st' + (i < n ? ' on' : '') + '" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.2-4 5.7-.7z"/></svg>';
    return '<span class="stars" role="img" aria-label="' + n + ' of 3 stars">' + out + '</span>';
  }
  function swatch(c) {
    return '<svg class="sw c-' + c + '" viewBox="0 0 44 14" width="44" height="14" aria-hidden="true">' + edgePaths({ x: 3, y: 7 }, { x: 41, y: 7 }, c, true) + '</svg>';
  }

  /* ---- saved progress --------------------------------------------------- */
  var store = { boards: {}, quiz: 0 };
  try { var raw = JSON.parse(localStorage.getItem(STORE_KEY)); if (raw && raw.boards) store = raw; } catch (e) {}
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
  function rec(key) {
    return store.boards[key] || (store.boards[key] = { g: { nodes: [], edges: [] }, best: 0, tries: 0, checks: 0, peeked: false, clean: false, time: 0, ms: 0, started: false, done: false });
  }
  function best(key) { return store.boards[key] ? store.boards[key].best : 0; }
  function xp() {
    var t = 0;
    Object.keys(store.boards).forEach(function (k) { t += store.boards[k].best || 0; });
    return t + (store.quiz || 0) * 20;
  }

  /* ---- state ------------------------------------------------------------ */
  var S = { view: 'home', tool: 'move', sel: null, pending: null, answer: false, breaking: false, failed: { n: {}, e: {} },
    result: null, tab: 'brief', hist: [], drag: null, link: null, t0: null, ask: false, quiz: null };
  var view = $('#tl-view');

  function toast(msg) {
    var t = $('#tl-toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 3800);
  }
  function drawRank() {
    var x = xp(), r = TL.rank(x);
    var pct = r.next ? Math.round((x - r.at) / (r.next.at - r.at) * 100) : 100;
    $('#tl-rank').innerHTML = '<span class="tl-rank-name">' + esc(r.name) + '</span><span class="tl-rank-xp">' + x.toLocaleString('en-US') + ' pts</span>' +
      '<span class="tl-rank-bar" title="' + (r.next ? (r.next.at - x) + ' points to ' + esc(r.next.name) : 'Top rank') + '"><i style="width:' + pct + '%"></i></span>';
  }

  /* ---- routing ---------------------------------------------------------- */
  /* Opened straight from a folder (file://), some browsers refuse pushState.
     The lab still works there: the address bar just stops tracking the view. */
  var query = location.search;
  function go(q) {
    leaveLab();
    query = q ? '?' + q : '';
    try { history.pushState(null, '', location.pathname + query); } catch (e) {}
    route(); window.scrollTo({ top: 0, behavior: 'instant' }); view.focus({ preventScroll: true });
  }
  function route() {
    var p = new URLSearchParams(query), scn = TL.scenario(p.get('rp'));
    document.querySelectorAll('.tl-nav [data-nav]').forEach(function (b) { b.removeAttribute('aria-current'); });
    if (scn) { S.view = 'lab'; openLab(scn, ['bus', 'mesh', 'star'].indexOf(p.get('opt')) >= 0 ? p.get('opt') : 'bus'); }
    else if (p.get('view') === 'guide') { S.view = 'guide'; renderGuide(); }
    else if (p.get('view') === 'quiz') { S.view = 'quiz'; renderQuiz(); }
    else { S.view = 'home'; renderHome(); }
    var cur = $('.tl-nav [data-nav="' + (S.view === 'lab' ? 'home' : S.view) + '"]');
    if (cur) cur.setAttribute('aria-current', 'page');
    drawRank();
  }
  window.addEventListener('popstate', function () { leaveLab(); query = location.search; route(); });

  /* ======================================================================
     HOME
     ====================================================================== */
  function heroSketch() {
    var pts = [[258, 38], [304, 71], [286, 125], [230, 125], [212, 71]], mesh = '';
    for (var i = 0; i < 5; i++) for (var j = i + 1; j < 5; j++) mesh += 'M' + pts[i] + 'L' + pts[j];
    var dots = pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6"/>'; }).join('');
    var spokes = [[430, 34], [484, 62], [476, 122], [384, 122], [376, 62]];
    return '<svg class="hero-art" viewBox="0 0 520 176" role="img" aria-label="Three hand-drawn network sketches: a bus, a mesh and a star, with the star ticked">' +
      '<g class="hk hk-black"><path d="M22 84h132"/><path d="M22 74v20M154 74v20"/></g>' +
      '<g class="hk hk-blue"><path d="M46 84V52M76 84v32M106 84V52M132 84v32"/></g>' +
      '<g class="hk-box"><rect x="36" y="34" width="20" height="16" rx="3"/><rect x="66" y="118" width="20" height="16" rx="3"/><rect x="96" y="34" width="20" height="16" rx="3"/><rect x="122" y="118" width="20" height="16" rx="3"/></g>' +
      '<g class="hk hk-red"><path d="' + mesh + '"/></g><g class="hk-dot">' + dots + '</g>' +
      '<g class="hk hk-blue"><path d="' + spokes.map(function (p) { return 'M430 84L' + p; }).join('') + '"/></g>' +
      '<g class="hk-dot">' + spokes.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6"/>'; }).join('') + '</g>' +
      '<g class="hk-box"><rect x="416" y="74" width="28" height="20" rx="4"/></g>' +
      '<g class="hk hk-green"><path d="M462 150l9 10 18-24"/></g>' +
      '<g class="hk-txt"><text x="88" y="166">bus</text><text x="258" y="166">mesh</text><text x="424" y="166">star</text></g></svg>';
  }

  function renderHome() {
    var rows = TL.SCENARIOS.map(function (s) {
      var opts = TL.OPTS.map(function (o) {
        var b = best(s.id + '.' + o.id), r = store.boards[s.id + '.' + o.id];
        return '<a class="rp-opt" href="?rp=' + s.id + '&opt=' + o.id + '" data-go="rp=' + s.id + '&opt=' + o.id + '">' +
          '<span class="rp-opt-name">' + o.name + '</span>' + starsSvg(TL.stars(b)) +
          '<span class="rp-opt-score">' + (r && r.tries ? b + (r.clean ? ' first try' : '') : 'not tried') + '</span></a>';
      }).join('');
      return '<li class="rp"><div class="rp-main"><span class="rp-tag">Sample ' + s.samples.join(' + ') + '</span>' +
        '<h3>' + esc(s.title) + '</h3><p>' + esc(s.tagline) + '</p></div><div class="rp-opts">' + opts + '</div></li>';
    }).join('');
    var done = 0, total = TL.SCENARIOS.length * 3;
    TL.SCENARIOS.forEach(function (s) { TL.OPTS.forEach(function (o) { if (best(s.id + '.' + o.id) >= 100) done++; }); });
    view.innerHTML =
      '<div class="home">' +
      '<section class="hero"><div class="hero-copy"><h1>Practice the flip chart before the judges see it</h1>' +
      '<p>Pick a role play. Draw each of our three options: bus, mesh, then the star we recommend. Check your chart against the answer key and see how close you got.</p>' +
      '<div class="hero-acts"><button class="tl-btn tl-btn--gold" data-act="random">Give me a random drill</button>' +
      '<span class="hero-count">' + done + ' of ' + total + ' charts at 100</span></div></div>' + heroSketch() + '</section>' +
      '<section aria-labelledby="rp-h"><h2 id="rp-h">Role plays</h2><ol class="rp-list">' + rows + '</ol></section>' +
      '<section class="how" aria-labelledby="how-h"><h2 id="how-h">How points work</h2><div class="how-grid">' +
      '<div><h3>100 per chart</h3><p>Points for the right devices, the right connections and the right cable on each one. The star also scores VLANs and backup.</p></div>' +
      '<div><h3>Three stars</h3><p>One star at 60, two at 80, three at a perfect 100. A perfect chart on the first check is marked "first try."</p></div>' +
      '<div><h3>The answer key costs you</h3><p>Open it any time. That run then counts 50 at most, until you start the chart over.</p></div>' +
      '<div><h3>Break it on purpose</h3><p>The failure test lets you cut a cable or kill a switch and watch what goes offline. That is your pros and cons, shown instead of memorized.</p></div>' +
      '</div></section></div>';
  }

  /* ======================================================================
     LAB
     ====================================================================== */
  function openLab(scn, opt) {
    S.scn = scn; S.opt = opt; S.B = TL.board(scn, opt); S.rec = rec(S.B.key); S.G = S.rec.g;
    S.tool = 'move'; S.sel = null; S.pending = null; S.answer = false; S.breaking = false; S.failed = { n: {}, e: {} };
    S.result = null; S.tab = 'brief'; S.hist = []; S.ask = false;
    renderLab();
    if (S.rec.started && !S.rec.done) S.t0 = Date.now();
    clearInterval(S.tick); S.tick = setInterval(drawTimer, 1000);
  }
  function leaveLab() {
    if (S.view !== 'lab') return;
    flushTimer(); clearInterval(S.tick); save();
  }
  function flushTimer() { if (S.t0) { S.rec.ms += Date.now() - S.t0; S.t0 = null; } }
  function elapsed() { return S.rec.ms + (S.t0 ? Date.now() - S.t0 : 0); }
  function clock(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function drawTimer() { var t = $('#tl-timer'); if (t) t.textContent = clock(elapsed()); }
  window.addEventListener('pagehide', leaveLab);

  function locked() { return S.answer || S.breaking; }
  function shown() { return S.answer ? S.B.solution : S.G; }

  function renderLab() {
    var s = S.scn;
    var tabs = TL.OPTS.map(function (o) {
      var b = best(s.id + '.' + o.id);
      return '<a role="tab" class="opt-tab" aria-selected="' + (o.id === S.opt) + '" href="?rp=' + s.id + '&opt=' + o.id + '" data-go="rp=' + s.id + '&opt=' + o.id + '">' +
        '<b>' + o.name + '</b><span>' + o.blurb + '</span>' + starsSvg(TL.stars(b)) + '</a>';
    }).join('');
    view.innerHTML =
      '<div class="lab">' +
      '<div class="lab-head"><div><a class="lab-back" href="./" data-go="">All role plays</a>' +
      '<h1>' + esc(s.title) + '</h1><p>Sample ' + s.samples.join(' + ') + '. ' + esc(s.tagline) + '.</p></div>' +
      '<div class="opt-tabs" role="tablist" aria-label="Which option to draw">' + tabs + '</div></div>' +
      '<div class="lab-grid">' +
      '<aside class="parts" id="tl-parts" aria-label="Parts tray"></aside>' +
      '<div class="stage">' +
      '<div class="tools" id="tl-tools" role="toolbar" aria-label="Tools"></div>' +
      '<p class="hint" id="tl-hint" aria-live="polite"></p>' +
      '<div class="paper-wrap"><svg id="tl-paper" class="paper" viewBox="0 0 ' + W + ' ' + H + '" role="application" aria-label="Flip chart page. Tab to a device, arrow keys move it, Enter picks it for a cable, Delete removes it."></svg></div>' +
      '<div class="acts" id="tl-acts"></div>' +
      '</div>' +
      '<aside class="side" id="tl-side"></aside>' +
      '</div></div>';
    bindPaper();
    drawAll();
  }
  function drawAll() { drawParts(); drawTools(); drawPaper(); drawActs(); drawSide(); drawHint(); }

  /* ---- parts tray ------------------------------------------------------- */
  function drawParts() {
    var B = S.B, placed = {}, hasBar = false;
    S.G.nodes.forEach(function (n) { if (n.piece) placed[n.piece] = 1; if (n.kind === 'backbone') hasBar = true; });
    var gear = B.gear.map(function (k) {
      var off = locked() || (k === 'backbone' && hasBar);
      return '<button type="button" class="part" data-kind="' + k + '"' + (off ? ' disabled' : '') + '>' + icon(TL.KINDS[k].icon) +
        '<span>' + esc(TL.KINDS[k].name) + '</span></button>';
    }).join('');
    var mine = B.pieces.map(function (p) {
      var off = locked() || placed[p.id];
      return '<button type="button" class="part' + (placed[p.id] ? ' used' : '') + '" data-kind="' + p.kind + '" data-piece="' + p.id + '"' + (off ? ' disabled' : '') + '>' +
        icon(p.icon || TL.KINDS[p.kind].icon) + '<span>' + esc(p.label) + (p.qty ? ' <em>×' + p.qty + '</em>' : '') + '</span></button>';
    }).join('');
    $('#tl-parts').innerHTML =
      '<h2>Network gear</h2><p class="parts-note">Use as many as you need.</p><div class="part-list">' + gear + '</div>' +
      '<h2>' + (S.opt === 'mesh' ? 'What to connect' : 'This role play') + '</h2><p class="parts-note">Each goes on the page once.</p><div class="part-list">' + mine + '</div>';
  }

  function freeSpot() {
    for (var y = 110; y < H - 90; y += 115) for (var x = 110; x < W - 60; x += 130) {
      if (!S.G.nodes.some(function (n) { return Math.abs(n.x - x) < 100 && Math.abs(n.y - y) < 95; })) return { x: x, y: y };
    }
    return { x: 120 + Math.random() * 700, y: 120 + Math.random() * 380 };
  }
  function addPart(btn, at) {
    if (locked()) return;
    var kind = btn.dataset.kind, piece = btn.dataset.piece || null;
    if (piece && S.G.nodes.some(function (n) { return n.piece === piece; })) return;
    if (kind === 'backbone') at = { x: W / 2, y: at.y };
    var id = uid('n');
    edit(function () {
      S.G.nodes.push({ id: id, kind: kind, piece: piece, x: Math.round(clamp(at.x, 44, W - 44)), y: Math.round(clamp(at.y, 44, H - 84)), vlan: null });
    });
    S.sel = { t: 'n', id: id }; S.tab = 'inspect';
    drawAll();
  }

  /* ---- toolbar ---------------------------------------------------------- */
  function drawTools() {
    var out = '<button type="button" class="tool" data-tool="move" aria-pressed="' + (S.tool === 'move') + '">' +
      '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 2.5l11.5 7-5 1.2 3 5.8-2.2 1.1-3-5.8L4 15.5z" fill="currentColor"/></svg>Move</button>' +
      '<span class="tools-sep">Run a cable</span>';
    TL.CABLE_ORDER.forEach(function (c) {
      out += '<button type="button" class="tool tool--cable" data-tool="' + c + '" aria-pressed="' + (S.tool === c) + '" title="' + esc(TL.CABLES[c].spec) + '">' +
        swatch(c) + esc(TL.CABLES[c].name) + '</button>';
    });
    $('#tl-tools').innerHTML = out;
  }
  function drawHint() {
    var h;
    if (S.breaking) h = breakLesson();
    else if (S.answer) h = 'This is the answer key. Your own chart is saved; go back to it any time.';
    else if (S.tool === 'move') h = S.G.nodes.length ? 'Drag to arrange. Pick a cable above to connect two devices.' : 'Drag parts from the tray onto the page, or click one to drop it in.';
    else if (S.pending) h = 'Now click the device this ' + TL.CABLES[S.tool].name + ' link should reach.';
    else h = 'Running ' + TL.CABLES[S.tool].name + ': click one device, then another, or drag between them. Click a cable to repaint it.';
    var el = $('#tl-hint'); el.textContent = h; el.className = 'hint' + (S.breaking ? ' hint--break' : S.answer ? ' hint--key' : '');
  }

  /* ---- drawing the page -------------------------------------------------- */
  function anchor(n, toward) {
    if (n.kind !== 'backbone') return { x: n.x, y: n.y };
    var half = BAR / 2;
    if (toward.kind === 'terminator') return { x: toward.x < n.x ? n.x - half : n.x + half, y: n.y };
    return { x: clamp(toward.x, n.x - half + 14, n.x + half - 14), y: n.y };
  }
  function edgePaths(a, b, cable, bare) {
    var d = 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
    if (cable === 'wan') {
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, k = bare ? 5 : 10, z = bare ? 4 : 9;
      d = 'M' + a.x + ' ' + a.y + 'L' + (mx + ux * k - uy * z).toFixed(1) + ' ' + (my + uy * k + ux * z).toFixed(1) +
        'L' + (mx - ux * k + uy * z).toFixed(1) + ' ' + (my - uy * k - ux * z).toFixed(1) + 'L' + b.x + ' ' + b.y;
    }
    return (bare ? '' : '<path class="ed-hit" d="' + d + '"/>') + '<path class="ed-ln" d="' + d + '"/>' +
      (cable === 'fiber' ? '<path class="ed-core" d="' + d + '"/>' : '');
  }
  function nodeText(n) {
    var B = S.B, p = n.piece ? B.pm[n.piece] : null;
    return {
      title: p ? p.label : (n.label || TL.KINDS[n.kind].name),
      sub: p ? (p.qty ? '×' + p.qty : (p.sub || '')) : '',
      icon: p && p.icon ? p.icon : TL.KINDS[n.kind].icon
    };
  }

  function drawPaper() {
    var paper = $('#tl-paper'); if (!paper) return;
    var G = shown(), m = {}, res = S.result && !locked() ? S.result.r : null;
    G.nodes.forEach(function (n) { m[n.id] = n; });
    var fail = S.breaking ? TL.failureTest(S.B, G, S.failed) : null, offMap = {};
    if (fail) fail.offline.forEach(function (id) { offMap[id] = 1; });
    var focusId = paper.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.n : null;
    var live = !!(S.drag || S.link);

    var edges = G.edges.map(function (e) {
      var a = m[e.a], b = m[e.b]; if (!a || !b) return '';
      var cls = 'ed c-' + e.cable + (S.sel && S.sel.t === 'e' && S.sel.id === e.id ? ' sel' : '') +
        (res && res.bad.e[e.id] ? ' bad' : '') + (S.breaking && S.failed.e[e.id] ? ' dead' : '');
      return '<g class="' + cls + '" data-e="' + e.id + '"><title>' + esc(TL.CABLES[e.cable].name) + '</title>' + edgePaths(anchor(a, b), anchor(b, a), e.cable) + '</g>';
    }).join('');

    var shapes = '', labels = '';
    G.nodes.forEach(function (n) {
      var t = nodeText(n), isSel = S.sel && S.sel.t === 'n' && S.sel.id === n.id;
      var cls = 'nd k-' + n.kind + (isSel ? ' sel' : '') + (res && res.bad.n[n.id] ? ' bad' : '') + (n.vlan ? ' v' + n.vlan : '') +
        (S.pending === n.id ? ' pend' : '') + (S.breaking && S.failed.n[n.id] ? ' dead' : '') + (offMap[n.id] ? ' off' : '');
      var aria = t.title + (t.sub ? ' ' + t.sub : '') + (n.vlan ? ', VLAN ' + n.vlan : '');
      if (n.kind === 'backbone') {
        shapes += '<g class="' + cls + '" data-n="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
          '<rect class="bb-hit" x="' + (n.x - BAR / 2) + '" y="' + (n.y - 16) + '" width="' + BAR + '" height="32" rx="8"/>' +
          '<path class="bb-ln" d="M' + (n.x - BAR / 2) + ' ' + n.y + 'H' + (n.x + BAR / 2) + '"/>' +
          (S.breaking && S.failed.n[n.id] ? '<path class="bb-cut" d="M' + (n.x - 12) + ' ' + (n.y - 18) + 'l24 36M' + (n.x + 12) + ' ' + (n.y - 18) + 'l-24 36"/>' : '') + '</g>';
        labels += '<text class="nd-t" data-n="' + n.id + '" x="' + (n.x - BAR / 2 + 62) + '" y="' + (n.y - 20) + '">' + esc(t.title) + '</text>';
        return;
      }
      shapes += '<g class="' + cls + '" data-n="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
        '<rect class="nd-bg" x="' + (n.x - 33) + '" y="' + (n.y - 33) + '" width="66" height="66" rx="12"/>' +
        '<g class="nd-ic" transform="translate(' + (n.x - 27) + ' ' + (n.y - 27) + ') scale(1.125)">' + (ICONS[t.icon] || ICONS.pc) + '</g>' +
        (S.breaking && S.failed.n[n.id] ? '<path class="nd-x" d="M' + (n.x - 26) + ' ' + (n.y - 26) + 'l52 52M' + (n.x + 26) + ' ' + (n.y - 26) + 'l-52 52"/>' : '') + '</g>';
      var lw = Math.max(t.title.length * 6.9 + 12, t.sub ? t.sub.length * 6.2 + 10 : 0);
      labels += '<g class="nd-lb' + (offMap[n.id] ? ' off' : '') + '" data-n="' + n.id + '">' +
        '<rect class="nd-lbg" x="' + (n.x - lw / 2) + '" y="' + (n.y + 36) + '" width="' + lw + '" height="' + (t.sub ? 37 : 21) + '" rx="5"/><text class="nd-t" x="' + n.x + '" y="' + (n.y + 51) + '">' + esc(t.title) + '</text>' +
        (t.sub ? '<text class="nd-s" x="' + n.x + '" y="' + (n.y + 67) + '">' + esc(t.sub) + '</text>' : '') +
        (offMap[n.id] ? '<text class="nd-off" x="' + n.x + '" y="' + (n.y - 40) + '">offline</text>' : '') +
        (n.vlan ? '<g class="nd-v v' + n.vlan + '"><rect x="' + (n.x + 14) + '" y="' + (n.y - 45) + '" width="38" height="20" rx="10"/><text x="' + (n.x + 33) + '" y="' + (n.y - 30.5) + '">V' + n.vlan + '</text></g>' : '') +
        '</g>';
    });

    var over = '';
    if (S.link) { var f = m[S.link.from]; if (f) over = '<path class="rubber c-' + S.tool + '" d="M' + f.x + ' ' + f.y + 'L' + S.link.x + ' ' + S.link.y + '"/>'; }
    var selEdge = S.sel && S.sel.t === 'e' ? G.edges.filter(function (e) { return e.id === S.sel.id; })[0] : null;
    if (selEdge && m[selEdge.a] && m[selEdge.b]) {
      var pa = anchor(m[selEdge.a], m[selEdge.b]), pb = anchor(m[selEdge.b], m[selEdge.a]);
      over += '<text class="ed-tag" x="' + (pa.x + pb.x) / 2 + '" y="' + ((pa.y + pb.y) / 2 - 10) + '">' + esc(TL.CABLES[selEdge.cable].name) + '</text>';
    }
    var empty = G.nodes.length ? '' : '<text class="pp-empty" x="' + W / 2 + '" y="' + (H / 2 - 8) + '">A blank page.</text>' +
      '<text class="pp-empty pp-empty--s" x="' + W / 2 + '" y="' + (H / 2 + 26) + '">Drag parts here from the tray, or click one to drop it in.</text>';

    paper.innerHTML =
      '<defs><pattern id="tl-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" class="pp-gridline"/></pattern>' +
      '<filter id="tl-wob" filterUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#tl-grid)"/>' + empty +
      '<g class="pp-edges"' + (live ? '' : ' filter="url(#tl-wob)"') + '>' + edges + '</g>' +
      '<g class="pp-nodes"' + (live ? '' : ' filter="url(#tl-wob)"') + '>' + shapes + '</g>' +
      '<g class="pp-labels">' + labels + '</g><g class="pp-over">' + over + '</g>';
    paper.classList.toggle('is-key', S.answer); paper.classList.toggle('is-break', S.breaking);
    paper.classList.toggle('is-cable', S.tool !== 'move' && !locked());
    if (focusId) { var el = paper.querySelector('g.nd[data-n="' + focusId + '"]'); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---- editing ---------------------------------------------------------- */
  function edit(fn) {
    S.hist.push(JSON.stringify(S.G)); if (S.hist.length > 80) S.hist.shift();
    fn(); touched();
  }
  function touched() {
    S.result = null;
    if (!S.rec.started) { S.rec.started = true; S.rec.done = false; S.t0 = Date.now(); }
    else if (!S.t0 && !S.rec.done) S.t0 = Date.now();
    save();
  }
  function undo() {
    if (!S.hist.length || locked()) return;
    var g = JSON.parse(S.hist.pop());
    S.G.nodes = g.nodes; S.G.edges = g.edges; S.sel = null; S.pending = null; S.result = null; save(); drawAll();
  }
  function removeSel() {
    if (!S.sel || locked()) return;
    var sel = S.sel;
    edit(function () {
      if (sel.t === 'n') {
        S.G.nodes = S.G.nodes.filter(function (n) { return n.id !== sel.id; });
        S.G.edges = S.G.edges.filter(function (e) { return e.a !== sel.id && e.b !== sel.id; });
        S.rec.g = S.G;
      } else S.G.edges = S.G.edges.filter(function (e) { return e.id !== sel.id; });
    });
    S.sel = null; S.pending = null; drawAll();
  }
  function connect(a, b) {
    if (a === b) return;
    var id;
    edit(function () {
      var ex = S.G.edges.filter(function (e) { return (e.a === a && e.b === b) || (e.a === b && e.b === a); })[0];
      if (ex) { ex.cable = S.tool; id = ex.id; }
      else { id = uid('e'); S.G.edges.push({ id: id, a: a, b: b, cable: S.tool }); }
    });
    S.sel = { t: 'e', id: id }; S.pending = null;
  }
  function pickForCable(id) {
    if (S.pending && S.pending !== id) connect(S.pending, id);
    else S.pending = S.pending === id ? null : id;
  }

  function svgPt(ev) {
    var paper = $('#tl-paper'), pt = paper.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var p = pt.matrixTransform(paper.getScreenCTM().inverse()); return { x: p.x, y: p.y };
  }
  function nodeById(id) { return shown().nodes.filter(function (n) { return n.id === id; })[0]; }

  function bindPaper() {
    var paper = $('#tl-paper');
    paper.addEventListener('pointerdown', function (ev) {
      if (ev.button) return;
      var nEl = ev.target.closest('[data-n]'), eEl = ev.target.closest('[data-e]'), p = svgPt(ev);
      var nid = nEl && nEl.dataset.n, eid = eEl && eEl.dataset.e;
      if (S.breaking) {
        if (nid) S.failed.n[nid] ? delete S.failed.n[nid] : (S.failed.n[nid] = 1);
        else if (eid) S.failed.e[eid] ? delete S.failed.e[eid] : (S.failed.e[eid] = 1);
        drawPaper(); drawHint(); return;
      }
      if (S.answer) {
        S.sel = nid ? { t: 'n', id: nid } : eid ? { t: 'e', id: eid } : null; if (S.sel) S.tab = 'inspect';
        drawPaper(); drawSide(); return;
      }
      if (S.tool !== 'move') {
        if (nid) { S.link = { from: nid, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; paper.setPointerCapture(ev.pointerId); }
        else if (eid) { edit(function () { S.G.edges.forEach(function (e) { if (e.id === eid) e.cable = S.tool; }); }); S.sel = { t: 'e', id: eid }; }
        else { S.pending = null; S.sel = null; }
        drawPaper(); drawHint(); drawSide(); drawActs(); return;
      }
      if (nid) {
        var n = nodeById(nid);
        S.sel = { t: 'n', id: nid }; S.tab = 'inspect';
        S.drag = { id: nid, dx: p.x - n.x, dy: p.y - n.y, moved: false, snap: JSON.stringify(S.G) };
        paper.setPointerCapture(ev.pointerId);
        // The side panel is redrawn on release: on narrow screens it sits under
        // the page, and changing its height mid-drag would scroll the paper away.
        drawPaper(); return;
      } else if (eid) { S.sel = { t: 'e', id: eid }; S.tab = 'inspect'; }
      else S.sel = null;
      drawPaper(); drawSide(); drawActs();
    });
    paper.addEventListener('pointermove', function (ev) {
      if (!S.drag && !S.link) return;
      var p = svgPt(ev);
      if (S.drag) {
        var n = nodeById(S.drag.id); if (!n) return;
        var nx = Math.round(clamp(p.x - S.drag.dx, 44, W - 44)), ny = Math.round(clamp(p.y - S.drag.dy, 44, H - 84));
        if (n.kind === 'backbone') nx = clamp(nx, BAR / 2 + 20, W - BAR / 2 - 20);
        if (nx !== n.x || ny !== n.y) { n.x = nx; n.y = ny; S.drag.moved = true; drawPaper(); }
      } else {
        S.link.x = p.x; S.link.y = p.y;
        if (Math.abs(p.x - S.link.sx) + Math.abs(p.y - S.link.sy) > 8) S.link.moved = true;
        drawPaper();
      }
    });
    function end(ev) {
      if (S.drag) {
        var d = S.drag; S.drag = null;
        if (d.moved) { S.hist.push(d.snap); touched(); }
        drawPaper(); drawSide(); drawActs(); return;
      }
      if (S.link) {
        var l = S.link; S.link = null;
        var hit = document.elementFromPoint(ev.clientX, ev.clientY), tEl = hit && hit.closest ? hit.closest('[data-n]') : null;
        var target = tEl ? tEl.dataset.n : null;
        if (ev.type === 'pointercancel') target = null;
        if (target && target !== l.from) connect(l.from, target);
        else if (!l.moved) pickForCable(l.from);
        drawAll();
      }
    }
    paper.addEventListener('pointerup', end);
    paper.addEventListener('pointercancel', end);

    paper.addEventListener('keydown', function (ev) {
      var el = ev.target.closest('g.nd[data-n]'); if (!el) return;
      var id = el.dataset.n, n = nodeById(id), step = ev.shiftKey ? 40 : 10;
      var mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
      if (mv && !locked()) {
        ev.preventDefault();
        edit(function () { n.x = clamp(n.x + mv[0], 44, W - 44); n.y = clamp(n.y + mv[1], 44, H - 84); });
        S.sel = { t: 'n', id: id }; drawPaper(); drawSide(); drawActs();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (S.breaking) { S.failed.n[id] ? delete S.failed.n[id] : (S.failed.n[id] = 1); drawPaper(); drawHint(); return; }
        if (S.tool !== 'move' && !S.answer) pickForCable(id); else { S.sel = { t: 'n', id: id }; S.tab = 'inspect'; }
        drawAll();
      }
    });

    /* dragging a part out of the tray */
    var parts = $('#tl-parts'), dragged = false;
    parts.addEventListener('pointerdown', function (ev) {
      var b = ev.target.closest('.part'); if (!b || b.disabled || ev.button || ev.pointerType === 'touch') return;
      var sx = ev.clientX, sy = ev.clientY, ghost = null;
      function move(e) {
        if (!ghost && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) {
          ghost = document.createElement('div'); ghost.className = 'part-ghost'; ghost.innerHTML = b.innerHTML; document.body.appendChild(ghost);
          document.body.classList.add('tl-dragging');
        }
        if (ghost) ghost.style.transform = 'translate(' + (e.clientX - 28) + 'px,' + (e.clientY - 28) + 'px)';
      }
      function up(e) {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (!ghost) return;
        ghost.remove(); document.body.classList.remove('tl-dragging');
        dragged = true; setTimeout(function () { dragged = false; }, 0);
        var r = paper.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) addPart(b, svgPt(e));
      }
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    parts.addEventListener('click', function (ev) {
      var b = ev.target.closest('.part'); if (!b || b.disabled || dragged) return;
      addPart(b, freeSpot());
    });
    $('#tl-tools').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tool]'); if (!b) return;
      setTool(b.dataset.tool);
    });
  }
  function setTool(t) {
    if (locked()) { S.answer = false; S.breaking = false; S.failed = { n: {}, e: {} }; }
    S.tool = t; S.pending = null; drawAll();
  }

  /* ---- action bar ------------------------------------------------------- */
  function drawActs() {
    var el = $('#tl-acts'); if (!el) return;
    if (S.ask) {
      el.innerHTML = '<p class="ask">Opening the answer key caps this run at 50 points until you start the chart over. Show it?</p>' +
        '<button class="tl-btn tl-btn--navy" data-act="key-yes">Show the answer key</button><button class="tl-btn" data-act="key-no">Not yet</button>';
      return;
    }
    el.innerHTML =
      '<button class="tl-btn tl-btn--gold" data-act="check"' + (locked() ? ' disabled' : '') + '>Check my chart</button>' +
      '<button class="tl-btn' + (S.breaking ? ' is-on' : '') + '" data-act="break" aria-pressed="' + S.breaking + '">' + (S.breaking ? 'End failure test' : 'Failure test') + '</button>' +
      '<button class="tl-btn' + (S.answer ? ' is-on' : '') + '" data-act="key" aria-pressed="' + S.answer + '">' + (S.answer ? 'Back to my chart' : 'Answer key') + '</button>' +
      '<span class="acts-gap"></span>' +
      '<button class="tl-btn tl-btn--quiet" data-act="undo"' + (S.hist.length && !locked() ? '' : ' disabled') + '>Undo</button>' +
      '<button class="tl-btn tl-btn--quiet" data-act="del"' + (S.sel && !locked() ? '' : ' disabled') + '>Delete</button>' +
      '<button class="tl-btn tl-btn--quiet" data-act="reset"' + (S.G.nodes.length ? '' : ' disabled') + '>Start over</button>' +
      '<span class="timer" title="Time on this chart"><span id="tl-timer">' + clock(elapsed()) + '</span></span>';
  }

  function check() {
    if (locked()) return;
    var r = TL.evaluate(S.B, S.G), R = S.rec, before = xp(), rankBefore = TL.rank(before).name;
    R.tries++; R.checks++;
    var counted = R.peeked ? Math.min(r.score, 50) : r.score, first = R.checks === 1;
    if (counted > R.best) R.best = counted;
    if (r.score === 100 && !R.peeked) {
      flushTimer(); R.done = true;
      if (first) R.clean = true;
      if (!R.time || R.ms < R.time) R.time = R.ms;
    }
    S.result = { r: r, counted: counted, first: first, gained: xp() - before };
    S.tab = 'score'; S.sel = null; S.pending = null;
    save(); drawAll(); drawRank();
    var rankNow = TL.rank(xp()).name;
    if (rankNow !== rankBefore) toast('New rank: ' + rankNow);
    var side = $('#tl-side'); if (side && window.matchMedia('(max-width: 1180px)').matches) side.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function startOver() {
    S.hist.push(JSON.stringify(S.G));
    S.G.nodes = []; S.G.edges = [];
    var R = S.rec; R.peeked = false; R.checks = 0; R.ms = 0; R.started = false; R.done = false; S.t0 = null;
    S.answer = false; S.breaking = false; S.failed = { n: {}, e: {} }; S.sel = null; S.pending = null; S.result = null; S.tab = 'brief';
    save(); drawAll();
  }

  /* ---- failure test ----------------------------------------------------- */
  function breakLesson() {
    var G = shown(), B = S.B, nf = Object.keys(S.failed.n).length + Object.keys(S.failed.e).length;
    if (!G.nodes.length) return 'Nothing to break yet. Build the chart, or open the answer key, then run the failure test.';
    if (!nf) return 'Failure test: click any device or cable to break it, and watch what goes offline. Click it again to repair it.';
    var res = TL.failureTest(B, G, S.failed);
    var lbl = res.offline.map(function (id) { return nodeText(nodeById(id)).title; });
    if (!res.offline.length) {
      return 'Nothing else went offline. ' + (B.opt === 'mesh' ? 'A mesh reroutes around a failed link. That is what all those links buy.' :
        B.opt === 'star' ? 'Either nothing depended on it or a backup took over. That is the redundant core doing its job.' : 'That part was not carrying anyone.');
    }
    if (res.all) {
      return 'Everything is offline. ' + (B.opt === 'bus' ? 'One break, or one missing terminator, stops the whole bus. This is the con to say out loud.' :
        B.opt === 'star' ? 'You found the star\'s single point of failure. The fix is cheap: a UPS, a spare switch on the shelf, a backup internet line.' :
          'With that many failures even a mesh is cut apart.');
    }
    return 'Offline: ' + lbl.join(', ') + ' (' + res.offline.length + ' of ' + res.alive + '). ' +
      (B.opt === 'star' ? 'Everything else keeps working. That is fault isolation, the star\'s best pro.' : 'The rest still reach each other.');
  }

  /* ---- side panel ------------------------------------------------------- */
  function drawSide() {
    var el = $('#tl-side'); if (!el) return;
    var tabs = [['brief', 'Brief'], ['inspect', 'Selected'], ['score', S.answer ? 'Why' : 'Score']];
    var head = '<div class="side-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button role="tab" aria-selected="' + (S.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    var body = S.tab === 'brief' ? sideBrief() : S.tab === 'inspect' ? sideInspect() : (S.answer ? sideWhy() : sideScore());
    el.innerHTML = head + '<div class="side-body" role="tabpanel">' + body + '</div>';
  }
  function list(items, cls) { return '<ul class="' + (cls || 'plain') + '">' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; }

  function sideBrief() {
    var s = S.scn, B = S.B;
    var scored = Object.keys(B.budgets).map(function (c) { return '<li><span>' + TL.CATS[c] + '</span><b>' + B.budgets[c] + '</b></li>'; }).join('');
    return '<h2>' + TL.OPTS.filter(function (o) { return o.id === S.opt; })[0].name + ' option</h2>' +
      '<p class="goal">' + esc(B.goal) + '</p>' +
      '<h3>The client</h3><p>' + esc(s.client) + '. ' + esc(s.brief) + '</p>' +
      '<h3>What the prompt gives you</h3>' + list(s.facts) +
      (s.assume ? '<p class="assume"><b>Assumption.</b> ' + esc(s.assume) + '</p>' : '') +
      '<h3>Scored out of 100</h3><ul class="scored">' + scored + '</ul>' +
      '<details><summary>What the judges want covered</summary>' + list(s.cover) + '</details>';
  }

  function vlanChips(n) {
    var names = S.scn.vlanNames, out = '<button class="chip' + (!n.vlan ? ' on' : '') + '" data-vlan="0">None</button>';
    [10, 20, 30, 40].forEach(function (v) {
      out += '<button class="chip v' + v + (n.vlan === v ? ' on' : '') + '" data-vlan="' + v + '">' + v + ' ' + esc(names[v]) + '</button>';
    });
    return '<h3>VLAN</h3><div class="chips" role="group" aria-label="VLAN for this device group">' + out + '</div>' +
      '<p class="fine">Who should be able to reach this group? Guests get internet only. Sensitive systems sit alone.</p>';
  }
  function kindCard(k, head) {
    return (head || '') + '<p class="layer">' + esc(k.layer) + '</p><p>' + esc(k.what) + '</p>' +
      '<dl class="facts"><dt>Use it</dt><dd>' + esc(k.when) + '</dd>' +
      (k.sketch ? '<dt>Draw it</dt><dd>' + esc(k.sketch) + '</dd>' : '') +
      (k.price ? '<dt>Buy</dt><dd>' + esc(k.price) + '</dd>' : '') +
      (k.say ? '<dt>Say</dt><dd>"' + esc(k.say) + '"</dd>' : '') + '</dl>';
  }
  function sideInspect() {
    var G = shown();
    if (!S.sel) {
      return '<p class="empty">Select a device or a cable on the page to see what it is, what it costs and how to describe it to the judges.</p>' +
        (S.B.vlans ? '<h3>VLANs in this role play</h3><ul class="vkey">' + [10, 20, 30, 40].map(function (v) { return '<li class="v' + v + '"><b>' + v + '</b> ' + esc(S.scn.vlanNames[v]) + '</li>'; }).join('') + '</ul>' : '');
    }
    if (S.sel.t === 'e') {
      var e = G.edges.filter(function (x) { return x.id === S.sel.id; })[0]; if (!e) return '';
      var c = TL.CABLES[e.cable];
      var chips = S.answer ? '' : '<div class="chips" role="group" aria-label="Cable type">' + TL.CABLE_ORDER.map(function (id) {
        return '<button class="chip' + (id === e.cable ? ' on' : '') + '" data-cable="' + id + '">' + esc(TL.CABLES[id].name) + '</button>';
      }).join('') + '</div>';
      return '<div class="insp-head">' + swatch(e.cable) + '<h2>' + esc(c.name) + '</h2></div>' + chips +
        '<p class="layer">' + esc(c.kind) + '. ' + esc(c.spec) + '</p><p>' + esc(c.what) + '</p>' +
        '<dl class="facts"><dt>Use it</dt><dd>' + esc(c.when) + '</dd><dt>Cost</dt><dd>' + esc(c.price) + '</dd><dt>Say</dt><dd>"' + esc(c.say) + '"</dd></dl>';
    }
    var n = G.nodes.filter(function (x) { return x.id === S.sel.id; })[0]; if (!n) return '';
    var t = nodeText(n), k = TL.KINDS[n.kind], p = n.piece ? S.B.pm[n.piece] : null;
    var head = '<div class="insp-head">' + icon(t.icon, 40) + '<h2>' + esc(t.title) + (t.sub ? ' <em>' + esc(t.sub) + '</em>' : '') + '</h2></div>';
    var extra = '';
    if (p && p.kind === 'endpoint' && p.via) extra += '<p class="via">' + (p.via === 'wifi' ? 'Wireless: these join an access point.' : 'Wired: these plug into a switch.') + (p.assumed ? ' Count assumed, not from the prompt.' : '') + '</p>';
    if (S.B.vlans && n.kind === 'endpoint' && !S.answer) extra += vlanChips(n);
    if (S.B.vlans && n.kind === 'endpoint' && S.answer && n.vlan) extra += '<p class="via">VLAN ' + n.vlan + ': ' + esc(S.scn.vlanNames[n.vlan]) + '.</p>';
    return kindCard(k, head + extra);
  }

  function costHtml() {
    var c = TL.costCard(S.scn);
    if (!c) return '<details><summary>Cost card</summary><p>The prompt gives no counts, so there is no total to check. On the day: assume counts out loud, then run the five buckets (core, edge, data, endpoints, monthly) and add 15%.</p></details>';
    var rows = c.lines.map(function (l) {
      return '<tr><td>' + esc(l.label) + (l.approx ? ' <i>approx.</i>' : '') + (l.note ? '<small>' + esc(l.note) + '</small>' : '') + '</td><td>' + l.qty + '</td><td>' + money(l.total) + '</td></tr>';
    }).join('');
    var mon = c.monthly.map(function (l) { return '<tr><td colspan="2">' + esc(l.label) + '</td><td>' + money(l.total) + '</td></tr>'; }).join('');
    return '<details><summary>Cost card: about ' + money(c.rounded) + ' up front</summary>' +
      '<table class="cost"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>' + rows +
      '<tr><td colspan="2">Labor and contingency (15%)</td><td>' + money(c.labor) + '</td></tr>' +
      '<tr class="tot"><td colspan="2">Up front</td><td>' + money(c.total) + '</td></tr>' + mon +
      (mon ? '<tr class="tot"><td colspan="2">Each month, before internet</td><td>' + money(c.monthlyTotal) + '</td></tr>' : '') +
      '</tbody></table><p class="fine">' + esc(c.note || '') + ' Store prices checked November 2026.</p></details>';
  }
  function sayHtml(open) {
    return '<details' + (open ? ' open' : '') + '><summary>Say it to the judges</summary><ol class="say">' + S.B.say.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol></details>';
  }
  function nextBoard() {
    var i = ['bus', 'mesh', 'star'].indexOf(S.opt);
    if (i < 2) { var o = TL.OPTS[i + 1]; return '<button class="tl-btn tl-btn--navy" data-go="rp=' + S.scn.id + '&opt=' + o.id + '">Next: draw the ' + o.name.toLowerCase() + '</button>'; }
    return '<button class="tl-btn tl-btn--navy" data-go="">Pick another role play</button>';
  }

  function sideScore() {
    if (!S.result) {
      var R = S.rec;
      return '<p class="empty">Build the chart, then press <b>Check my chart</b>. You will see what is right, what is missing and what to fix.</p>' +
        (R.tries ? '<p class="via">Best so far: <b>' + R.best + '</b> ' + starsSvg(TL.stars(R.best)) + (R.time ? ' Fastest perfect chart: ' + clock(R.time) + '.' : '') + '</p>' : '') +
        (R.peeked ? '<p class="assume">The answer key was opened on this run, so it counts 50 at most. Start over for full points.</p>' : '');
    }
    var res = S.result, r = res.r, st = TL.stars(res.counted);
    var verdict = r.score === 100 ? (res.first && !S.rec.peeked ? 'Perfect, first try.' : 'Perfect chart.') :
      r.score >= 80 ? 'Close. Fix the marked items.' : r.score >= 60 ? 'The shape is there. Keep going.' : 'A start. Work down the list.';
    var cats = Object.keys(r.cats).map(function (c) {
      var k = r.cats[c], pct = k.max ? Math.round(k.got / k.max * 100) : 0;
      var items = k.items.map(function (it) {
        return '<li class="ck ck--' + it.state + '"><span class="ck-mark" aria-hidden="true"></span><div><b>' + esc(it.label) + '</b>' +
          (it.state !== 'ok' ? '<p>' + esc(it.tip) + '</p>' : '') + '</div></li>';
      }).join('');
      return '<section class="cat"><h3><span>' + k.name + '</span><b>' + Math.round(k.got) + ' / ' + k.max + '</b></h3>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div><ul class="cks">' + items + '</ul></section>';
    }).join('');
    var deds = r.deds.length ? '<section class="cat cat--ded"><h3><span>Points taken off</span><b>-' + r.lost + '</b></h3><ul class="cks">' +
      r.deds.map(function (d) { return '<li class="ck ck--miss"><span class="ck-mark" aria-hidden="true"></span><div><b>' + esc(d.label) + '</b><p>' + esc(d.tip) + '</p></div></li>'; }).join('') + '</ul></section>' : '';
    return '<div class="scorebox s' + st + '"><div class="score-n"><b>' + r.score + '</b><span>/ 100</span></div>' +
      '<div class="score-t">' + starsSvg(st) + '<p>' + verdict + '</p>' +
      '<p class="fine">' + (S.rec.peeked ? 'Answer key was open: this run counts ' + res.counted + '.' : res.gained > 0 ? '+' + res.gained + ' points to your rank.' : 'Your best on this chart is ' + S.rec.best + '.') + '</p></div></div>' +
      (r.score === 100 ? '<div class="next">' + nextBoard() + '</div>' : '<p class="fine marked">Items to fix are outlined in red on the page.</p>') +
      cats + deds + sayHtml(r.score >= 80) + (S.opt === 'star' ? costHtml() : '');
  }
  function sideWhy() {
    return '<h2>Why it is built this way</h2>' + list(S.B.notes, 'why') + sayHtml(true) + (S.opt === 'star' ? costHtml() : '') +
      '<p class="fine">Try the failure test on this chart, then go back and build it from memory.</p>';
  }

  /* ======================================================================
     FIELD GUIDE
     ====================================================================== */
  function renderGuide() {
    var kinds = ['internet', 'backup', 'firewall', 'switch', 'ap', 'server', 'nas', 'cloud', 'ups', 'site', 'remote', 'hub', 'backbone', 'terminator'];
    var dev = kinds.map(function (id) {
      var k = TL.KINDS[id];
      return '<article class="card">' + kindCard(k, '<div class="insp-head">' + icon(k.icon, 44) + '<h3>' + esc(k.name) + '</h3></div>') + '</article>';
    }).join('');
    var cab = TL.CABLE_ORDER.map(function (id) {
      var c = TL.CABLES[id];
      return '<article class="card"><div class="insp-head">' + swatch(id) + '<h3>' + esc(c.name) + '</h3></div><p class="layer">' + esc(c.kind) + '. ' + esc(c.spec) + '</p><p>' + esc(c.what) + '</p>' +
        '<dl class="facts"><dt>Use it</dt><dd>' + esc(c.when) + '</dd><dt>Cost</dt><dd>' + esc(c.price) + '</dd><dt>Say</dt><dd>"' + esc(c.say) + '"</dd></dl></article>';
    }).join('');
    var topo = TL.TOPOLOGIES.map(function (t) {
      return '<tr><th scope="row">' + esc(t.name) + '</th><td>' + esc(t.links) + '</td><td>' + esc(t.pros) + '</td><td>' + esc(t.cons) + '</td><td>' + esc(t.fit) + '</td></tr>';
    }).join('');
    view.innerHTML = '<div class="guide"><h1>Field guide</h1><p class="lead-in">Everything on the parts tray and the cable bar: what it is, when to use it, how to sketch it in three seconds and what to say about it.</p>' +
      '<h2>Topologies</h2><div class="tbl-wrap"><table class="topo"><thead><tr><th>Layout</th><th>Links for n devices</th><th>Pros</th><th>Cons</th><th>Best fit</th></tr></thead><tbody>' + topo + '</tbody></table></div>' +
      '<h2>Cables and links</h2><p class="lead-in">The line style on the page is the line style to draw: solid for copper, a double line for fiber, dots for Wi-Fi, dashes for a tunnel, a lightning bolt for the ISP.</p><div class="cards">' + cab + '</div>' +
      '<h2>Devices</h2><div class="cards">' + dev + '</div>' +
      '<p class="fine">Prices are store prices checked in November 2026. Round up when you present.</p></div>';
  }

  /* ======================================================================
     QUIZ
     ====================================================================== */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function newQuiz() {
    var qs = shuffle(TL.QUIZ).slice(0, 10).map(function (q) { return { q: q.q, why: q.why, right: q.a[0], opts: shuffle(q.a) }; });
    S.quiz = { qs: qs, i: 0, right: 0, picked: null, done: false };
  }
  function renderQuiz() {
    var Q = S.quiz;
    if (!Q) {
      view.innerHTML = '<div class="quiz"><h1>Rapid-fire quiz</h1><p class="lead-in">Ten questions on devices, cabling and topologies, drawn at random from ' + TL.QUIZ.length + '. Each right answer on your best round is worth 20 points toward your rank.</p>' +
        '<p>Best round so far: <b>' + (store.quiz || 0) + ' of 10</b></p><button class="tl-btn tl-btn--gold" data-act="quiz-start">Start a round</button></div>';
      return;
    }
    if (Q.done) {
      view.innerHTML = '<div class="quiz"><h1>' + Q.right + ' of 10</h1><p class="lead-in">' + (Q.right === 10 ? 'A clean round.' : Q.right >= 7 ? 'Solid. The misses are worth one more look in the field guide.' : 'Read the field guide, then go again.') +
        ' Best round: <b>' + store.quiz + ' of 10</b>.</p><div class="hero-acts"><button class="tl-btn tl-btn--gold" data-act="quiz-start">Play again</button><button class="tl-btn" data-go="view=guide">Open the field guide</button></div></div>';
      return;
    }
    var q = Q.qs[Q.i];
    var opts = q.opts.map(function (o, i) {
      var cls = 'q-opt';
      if (Q.picked != null) cls += o === q.right ? ' right' : i === Q.picked ? ' wrong' : ' dim';
      return '<button class="' + cls + '" data-pick="' + i + '"' + (Q.picked != null ? ' disabled' : '') + '>' + esc(o) + '</button>';
    }).join('');
    view.innerHTML = '<div class="quiz"><p class="q-step">Question ' + (Q.i + 1) + ' of 10 <span>' + Q.right + ' right</span></p><h1>' + esc(q.q) + '</h1>' +
      '<div class="q-opts">' + opts + '</div>' +
      (Q.picked != null ? '<div class="q-why ' + (q.opts[Q.picked] === q.right ? 'ok' : 'no') + '" role="status"><b>' + (q.opts[Q.picked] === q.right ? 'Right.' : 'Not quite.') + '</b> ' + esc(q.why) + '</div>' +
        '<button class="tl-btn tl-btn--navy" data-act="quiz-next" id="q-next">' + (Q.i === 9 ? 'See my score' : 'Next question') + '</button>' : '') + '</div>';
    var nx = $('#q-next'); if (nx) nx.focus();
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  document.addEventListener('click', function (ev) {
    var nav = ev.target.closest('[data-nav]');
    if (nav) { ev.preventDefault(); S.quiz = null; go(nav.dataset.nav === 'home' ? '' : 'view=' + nav.dataset.nav); return; }
    var g = ev.target.closest('[data-go]');
    if (g) { ev.preventDefault(); go(g.dataset.go); return; }
    var tab = ev.target.closest('[data-tab]');
    if (tab) { S.tab = tab.dataset.tab; drawSide(); return; }
    var vl = ev.target.closest('[data-vlan]');
    if (vl && S.sel && !locked()) {
      var n = nodeById(S.sel.id), v = +vl.dataset.vlan || null;
      edit(function () { n.vlan = v; }); drawPaper(); drawSide(); drawActs(); return;
    }
    var cb = ev.target.closest('[data-cable]');
    if (cb && S.sel && !locked()) {
      var id = S.sel.id;
      edit(function () { S.G.edges.forEach(function (e) { if (e.id === id) e.cable = cb.dataset.cable; }); });
      drawPaper(); drawSide(); drawActs(); return;
    }
    var pk = ev.target.closest('[data-pick]');
    if (pk && S.quiz && S.quiz.picked == null) {
      var Q = S.quiz; Q.picked = +pk.dataset.pick;
      if (Q.qs[Q.i].opts[Q.picked] === Q.qs[Q.i].right) Q.right++;
      renderQuiz(); return;
    }
    var a = ev.target.closest('[data-act]'); if (!a || a.disabled) return;
    switch (a.dataset.act) {
      case 'check': check(); break;
      case 'undo': undo(); break;
      case 'del': removeSel(); break;
      case 'reset': startOver(); break;
      case 'break':
        S.breaking = !S.breaking; S.failed = { n: {}, e: {} }; S.sel = null; S.pending = null; S.ask = false; drawAll(); break;
      case 'key':
        if (S.answer) { S.answer = false; S.sel = null; S.tab = S.result ? 'score' : 'brief'; S.failed = { n: {}, e: {} }; drawAll(); }
        else if (S.rec.peeked) showKey();
        else { S.ask = true; drawActs(); }
        break;
      case 'key-yes': S.ask = false; S.rec.peeked = true; save(); showKey(); break;
      case 'key-no': S.ask = false; drawActs(); break;
      case 'random': randomDrill(); break;
      case 'quiz-start': newQuiz(); renderQuiz(); break;
      case 'quiz-next':
        var q = S.quiz; q.picked = null; q.i++;
        if (q.i >= 10) {
          q.done = true;
          var before = TL.rank(xp()).name;
          if (q.right > (store.quiz || 0)) { store.quiz = q.right; save(); }
          drawRank();
          var now = TL.rank(xp()).name; if (now !== before) toast('New rank: ' + now);
        }
        renderQuiz(); break;
    }
  });
  function showKey() {
    S.answer = true; S.sel = null; S.pending = null; S.result = null; S.tab = 'score'; S.failed = { n: {}, e: {} };
    drawAll();
  }
  function randomDrill() {
    var open = [], all = [];
    TL.SCENARIOS.forEach(function (s) { TL.OPTS.forEach(function (o) { var k = 'rp=' + s.id + '&opt=' + o.id; all.push(k); if (best(s.id + '.' + o.id) < 100) open.push(k); }); });
    var pool = open.length ? open : all;
    go(pool[Math.floor(Math.random() * pool.length)]);
  }

  document.addEventListener('keydown', function (ev) {
    if (S.view !== 'lab') return;
    var tag = (ev.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea') return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); }
    else if (ev.key === 'Escape') { if (S.pending) { S.pending = null; drawPaper(); drawHint(); } else if (S.tool !== 'move') setTool('move'); }
    else if ((ev.key === 'Delete' || ev.key === 'Backspace') && S.sel && !locked()) { ev.preventDefault(); removeSel(); }
  });

  route();
})();
