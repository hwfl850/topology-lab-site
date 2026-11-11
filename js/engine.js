/* Topology Lab: engine.
   Turns a role play from data.js into three boards (bus, mesh, star). A board
   holds the parts tray, the scoring rules and an answer key that is generated
   from the same description, so the key always scores 100 against its own rules
   (tests/engine.test.js checks that for every board).

   No DOM in this file: it runs in Node for the tests and in the browser. */
(function (root) {
  'use strict';
  var TL = root.TL;
  var W = 1000, H = 660;
  TL.SIZE = { w: W, h: H, bar: 660 };

  TL.OPTS = [
    { id: 'bus', name: 'Bus', blurb: 'One shared backbone' },
    { id: 'mesh', name: 'Mesh', blurb: 'Everything to everything' },
    { id: 'star', name: 'Star', blurb: 'Our pick' }
  ];

  var CATS = {
    devices: 'Right devices',
    links: 'Connections',
    cables: 'Cable types',
    vlans: 'VLANs',
    resil: 'Backup and uptime'
  };
  TL.CATS = CATS;

  /* ---- graph helpers --------------------------------------------------- */
  function byId(G) { var m = {}; G.nodes.forEach(function (n) { m[n.id] = n; }); return m; }
  function pick(G, sel) { return G.nodes.filter(sel); }
  function edgesOf(G, id) { return G.edges.filter(function (e) { return e.a === id || e.b === id; }); }
  function other(e, id) { return e.a === id ? e.b : e.a; }
  function K() { var ks = [].slice.call(arguments); return function (n) { return ks.indexOf(n.kind) >= 0; }; }
  function loose(k) { return function (n) { return n.kind === k && !n.piece; }; }
  function P(ids) { return function (n) { return !!n.piece && ids.indexOf(n.piece) >= 0; }; }
  function names(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  /* ---- rule factories ---------------------------------------------------
     Each returns fn(G, B) -> array of items:
       { cat, w, label, f (0..1), tip, bad:{n:[],e:[]} }   scored item
       { ded, label, tip, bad }                            deduction        */
  function item(cat, w, label, f, tip, bad) {
    return { cat: cat, w: w, label: label, f: Math.max(0, Math.min(1, f)), tip: tip, bad: bad || { n: [], e: [] } };
  }

  function count(sel, min, w, label, tip) {
    return function (G) { return [item('devices', w, label, pick(G, sel).length / min, tip)]; };
  }

  function pieces(ids, w, label) {
    return function (G, B) {
      var placed = {}; G.nodes.forEach(function (n) { if (n.piece) placed[n.piece] = 1; });
      var missing = ids.filter(function (i) { return !placed[i]; });
      var tip = 'Still in the tray: ' + names(missing.map(function (i) { return B.pm[i].label; })) + '.';
      return [item('devices', w, label, (ids.length - missing.length) / ids.length, tip)];
    };
  }

  /* Every node matching `from` needs a link to a node matching `to`.
     Two items come back: one for the connection, one for the cable on it. */
  function each(o) {
    return function (G) {
      var m = byId(G), froms = pick(G, o.from), need = Math.max(froms.length, o.min || 1);
      var linked = 0, cabled = 0, badN = [], badE = [];
      froms.forEach(function (n) {
        var hits = edgesOf(G, n.id).filter(function (e) { return o.to(m[other(e, n.id)]); });
        if (!hits.length) { badN.push(n.id); return; }
        linked++;
        var accept = (o.cablesFor && o.cablesFor(n)) || o.cables;
        if (hits.some(function (e) { return accept.indexOf(e.cable) >= 0; })) cabled++;
        else hits.forEach(function (e) { badE.push(e.id); });
      });
      return [
        item(o.cat || 'links', o.w, o.label, linked / need, o.tip, { n: badN, e: [] }),
        item(o.catCable || 'cables', o.wc, o.labelCable, cabled / need, linked ? o.tipCable : o.tip, { n: [], e: badE })
      ];
    };
  }

  /* At least one link between the two groups. */
  function any(o) {
    return function (G) {
      var m = byId(G);
      var hits = G.edges.filter(function (e) {
        var a = m[e.a], b = m[e.b];
        return (o.a(a) && o.b(b)) || (o.a(b) && o.b(a));
      });
      var good = hits.some(function (e) { return o.cables.indexOf(e.cable) >= 0; });
      var badN = hits.length ? [] : pick(G, o.a).concat(pick(G, o.b)).map(function (n) { return n.id; });
      return [
        item(o.cat || 'links', o.w, o.label, hits.length ? 1 : 0, o.tip, { n: badN, e: [] }),
        item(o.catCable || 'cables', o.wc, o.labelCable, good ? 1 : 0, hits.length ? o.tipCable : o.tip,
          { n: [], e: good ? [] : hits.map(function (e) { return e.id; }) })
      ];
    };
  }

  /* Full mesh: every pair of matching nodes linked directly. */
  function pairs(o) {
    return function (G, B) {
      var ns = pick(G, o.sel), total = o.total, have = 0, good = 0, badE = [], short = {};
      for (var i = 0; i < ns.length; i++) for (var j = i + 1; j < ns.length; j++) {
        var hit = G.edges.filter(function (e) {
          return (e.a === ns[i].id && e.b === ns[j].id) || (e.a === ns[j].id && e.b === ns[i].id);
        })[0];
        if (!hit) { short[ns[i].id] = 1; short[ns[j].id] = 1; continue; }
        have++;
        if (o.cables.indexOf(hit.cable) >= 0) good++; else badE.push(hit.id);
      }
      var tip = have + ' of ' + total + ' links drawn. ' + o.tip;
      return [
        item('links', o.w, o.label, have / total, tip, { n: Object.keys(short), e: [] }),
        item('cables', o.wc, o.labelCable, good / total, have ? o.tipCable : tip, { n: [], e: badE })
      ];
    };
  }

  /* Extended star: all switches joined into one tree by switch-to-switch links. */
  function chain(o) {
    return function (G) {
      var sw = pick(G, K('switch')), need = Math.max(sw.length, o.min);
      var ids = {}; sw.forEach(function (n) { ids[n.id] = 1; });
      var ss = G.edges.filter(function (e) { return ids[e.a] && ids[e.b]; });
      var best = 0, seen = {};
      sw.forEach(function (n) {
        if (seen[n.id]) return;
        var q = [n.id], size = 0; seen[n.id] = 1;
        while (q.length) {
          var c = q.pop(); size++;
          ss.forEach(function (e) {
            var t = e.a === c ? e.b : e.b === c ? e.a : null;
            if (t && !seen[t]) { seen[t] = 1; q.push(t); }
          });
        }
        best = Math.max(best, size);
      });
      var fLink = need > 1 ? (best - 1) / (need - 1) : 0;
      var goodE = ss.filter(function (e) { return o.cables.indexOf(e.cable) >= 0; });
      var fCable = ss.length ? fLink * goodE.length / ss.length : 0;
      var lone = sw.filter(function (n) { return !ss.some(function (e) { return e.a === n.id || e.b === n.id; }); });
      return [
        item('links', o.w, o.label, fLink, o.tip, { n: lone.map(function (n) { return n.id; }), e: [] }),
        item('cables', o.wc, o.labelCable, fCable, ss.length ? o.tipCable : o.tip,
          { n: [], e: ss.filter(function (e) { return goodE.indexOf(e) < 0; }).map(function (e) { return e.id; }) })
      ];
    };
  }

  function vlan(map, w) {
    return function (G, B) {
      var ids = Object.keys(map), ok = 0, bad = [];
      G.nodes.forEach(function (n) {
        if (!n.piece || !map[n.piece]) return;
        if (map[n.piece].indexOf(n.vlan) >= 0) ok++; else bad.push(n.id);
      });
      return [item('vlans', w, 'Each device group is on the right VLAN', ok / ids.length,
        'Select a device group and pick its VLAN. Ask who should be able to reach it: guests get internet only, and sensitive systems sit alone.', { n: bad, e: [] })];
    };
  }

  function paths(G, failed) {
    failed = failed || { n: {}, e: {} };
    var adj = {};
    G.nodes.forEach(function (n) { if (!failed.n[n.id]) adj[n.id] = []; });
    G.edges.forEach(function (e) {
      if (failed.e[e.id] || e.cable === 'power' || !adj[e.a] || !adj[e.b]) return;
      adj[e.a].push(e.b); adj[e.b].push(e.a);
    });
    return adj;
  }
  var DEAD_END = { ups: 1, terminator: 1, cloud: 1 };
  function flood(G, adj, starts) {
    var m = byId(G), seen = {}, q = [];
    starts.forEach(function (id) { if (adj[id] && !seen[id]) { seen[id] = 1; q.push(id); } });
    while (q.length) {
      var c = q.pop();
      if (DEAD_END[m[c].kind] && starts.indexOf(c) < 0) continue;
      adj[c].forEach(function (t) { if (!seen[t]) { seen[t] = 1; q.push(t); } });
    }
    return seen;
  }

  function reach(fromSel, targetSel, w, label, tip) {
    return function (G) {
      var froms = pick(G, fromSel), targets = pick(G, targetSel).map(function (n) { return n.id; });
      if (!froms.length) return [item('links', w, label, 0, tip)];
      var seen = flood(G, paths(G), targets);
      var cut = froms.filter(function (n) { return !seen[n.id]; });
      return [item('links', w, label, (froms.length - cut.length) / froms.length, tip, { n: cut.map(function (n) { return n.id; }), e: [] })];
    };
  }

  /* A resilience part: half credit for placing it, most for linking it, all
     for the right cable. */
  function attach(o) {
    return function (G) {
      var m = byId(G), ns = pick(G, o.sel);
      if (!ns.length) return [item('resil', o.w, o.label, 0, o.tipPlace)];
      var best = 0.5, tip = o.tipLink, badN = [ns[0].id], badE = [];
      ns.forEach(function (n) {
        edgesOf(G, n.id).forEach(function (e) {
          if (!o.to(m[other(e, n.id)])) return;
          if (o.cables.indexOf(e.cable) >= 0) { best = 1; }
          else if (best < 0.8) { best = 0.8; tip = o.tipCable; badE = [e.id]; badN = []; }
        });
      });
      if (best === 1) { badN = []; badE = []; }
      return [item('resil', o.w, o.label, best, tip, { n: badN, e: badE })];
    };
  }

  function forbidKind(sel, pts, label, tip) {
    return function (G) {
      var hits = pick(G, sel);
      return hits.length ? [{ ded: pts, label: label, tip: tip, bad: { n: hits.map(function (n) { return n.id; }), e: [] } }] : [];
    };
  }
  function forbidLink(a, b, per, max, label, tip) {
    return function (G) {
      var m = byId(G);
      var hits = G.edges.filter(function (e) { return a(m[e.a]) && b(m[e.b]); });
      return hits.length ? [{ ded: Math.min(max, per * hits.length), label: label, tip: tip, bad: { n: [], e: hits.map(function (e) { return e.id; }) } }] : [];
    };
  }

  /* ---- layout helpers for answer keys ---------------------------------- */
  function spread(n, gap, cx) {
    var g = n > 1 ? Math.min(gap, 840 / (n - 1)) : 0, out = [];
    for (var i = 0; i < n; i++) out.push(Math.round((cx || 500) - g * (n - 1) / 2 + g * i));
    return out;
  }
  function chunks(list, n) {
    var out = [], size = Math.ceil(list.length / n);
    for (var i = 0; i < n; i++) out.push(list.slice(i * size, (i + 1) * size));
    return out;
  }
  function mean(xs) { return Math.round(xs.reduce(function (a, b) { return a + b; }, 0) / xs.length); }

  function maker() {
    var N = [], E = [];
    return {
      N: N, E: E,
      node: function (kind, x, y, extra) {
        var n = { id: 'k' + (N.length + 1), kind: kind, piece: null, x: x, y: y, vlan: null };
        if (extra) for (var k in extra) n[k] = extra[k];
        N.push(n); return n;
      },
      link: function (a, b, cable) { E.push({ id: 'j' + (E.length + 1), a: a.id, b: b.id, cable: cable }); }
    };
  }

  /* ---- star board ------------------------------------------------------ */
  function starBoard(scn) {
    var s = scn.star, t = scn.talk;
    var eps = s.endpoints.map(function (e) { var o = { kind: 'endpoint' }; for (var k in e) o[k] = e[k]; return o; });
    var wired = eps.filter(function (e) { return e.via === 'wired'; });
    var wifi = eps.filter(function (e) { return e.via === 'wifi'; });
    var sites = (s.sites || []).map(function (x) { return { id: x.id, kind: 'site', label: x.label, sub: x.sub, cables: x.cables }; });
    var far = sites.slice();
    if (s.remote) far.push({ id: 'remote', kind: 'remote', label: s.remote.label, sub: s.remote.sub });
    var all = eps.concat(far), pm = {};
    all.forEach(function (p) { pm[p.id] = p; });

    var via = function (v) { return function (n) { return n.piece && pm[n.piece] && pm[n.piece].via === v; }; };
    var isEp = K('endpoint'), sw = K('switch');
    var nSwitch = 1 + s.access;
    var uplink = s.fastUplink ? ['cat6a', 'fiber'] : ['cat6', 'cat6a', 'fiber'];
    var rules = [];

    rules.push(count(K('internet'), 1, 1, 'The internet is on the chart', 'Start with the internet cloud at the top.'));
    rules.push(count(K('firewall'), 1, 2, 'A firewall guards the edge', 'Every site needs a firewall between the internet and the network.'));
    rules.push(count(sw, nSwitch, 2,
      s.access ? 'A core switch plus ' + s.access + ' access switches' : 'A managed switch is the hub of the star',
      s.access ? 'At this size one switch is not enough. Draw a core switch and ' + s.access + ' access switches: an extended star.' : 'The star needs its hub: add a PoE switch.'));
    if (wifi.length) rules.push(count(K('ap'), s.aps.draw, 2,
      s.aps.draw > 1 ? s.aps.draw + ' access points for the Wi-Fi devices' : 'An access point for the Wi-Fi devices',
      'Wireless devices need access points. Draw ' + s.aps.draw + '.'));
    if (s.servers) rules.push(count(K('server'), s.servers, 2,
      s.servers > 1 ? s.servers + ' servers to share the load' : 'A server for the records',
      'Add ' + (s.servers > 1 ? s.servers + ' servers so one can fail without stopping work.' : 'a server for the sensitive records.')));
    rules.push(pieces(eps.map(function (e) { return e.id; }), 3, 'Every device group is placed'));
    if (far.length) rules.push(pieces(far.map(function (e) { return e.id; }), 2, 'Other sites and remote users are placed'));

    rules.push(any({ a: K('internet'), b: K('firewall'), cables: ['wan', 'fiber'], w: 2, wc: 1,
      label: 'The internet reaches the firewall', labelCable: 'ISP line between the cloud and the firewall',
      tip: 'Connect the internet cloud to the firewall.',
      tipCable: 'Use the ISP line between the cloud and the firewall. Coax only suits cable internet, and it stops at the modem.' }));
    rules.push(any({ a: K('firewall'), b: sw, cables: ['cat6', 'cat6a', 'fiber'], w: 3, wc: 1,
      label: 'The firewall feeds the core switch', labelCable: 'Copper or fiber between firewall and switch',
      tip: 'Connect the firewall to the core switch.',
      tipCable: 'Between the firewall and the switch use Cat6, Cat6A or fiber.' }));
    if (s.access) rules.push(chain({ min: nSwitch, cables: uplink, w: 3, wc: 2,
      label: 'Access switches uplink to the core', labelCable: s.fastUplink ? '10 Gbps uplinks (Cat6A or fiber)' : 'Copper or fiber uplinks',
      tip: 'Link every access switch back to the core switch.',
      tipCable: 'Uplinks between switches carry everyone\'s traffic. Use Cat6A or fiber so the uplink is not the bottleneck.' }));
    if (wifi.length) rules.push(each({ from: K('ap'), to: sw, cables: ['cat6', 'cat6a'], w: 3, wc: 2, min: s.aps.draw,
      label: 'Every access point is wired to a switch', labelCable: 'Copper to each access point (it carries PoE)',
      tip: 'Wire every access point back to a switch.',
      tipCable: 'Access points need copper, Cat6 or Cat6A, because the same cable powers them. Fiber cannot carry PoE.' }));
    if (wired.length) rules.push(each({ from: via('wired'), to: sw, cables: ['cat6', 'cat6a'], w: 4, wc: 3, min: wired.length,
      label: 'Wired device groups home-run to a switch', labelCable: 'Cat6 on the wall drops',
      tip: 'Wired device groups plug into a switch, one home run each.',
      tipCable: 'Wall drops are Cat6 (Cat6A also works).' }));
    if (wifi.length) rules.push(each({ from: via('wifi'), to: K('ap'), cables: ['wifi'], w: 4, wc: 2, min: wifi.length,
      label: 'Wireless device groups join an access point', labelCable: 'Wi-Fi between wireless devices and the access point',
      tip: 'Wireless device groups connect to an access point, not straight to a switch.',
      tipCable: 'Draw the link from a wireless group to its access point as Wi-Fi.' }));
    if (s.servers) rules.push(each({ from: K('server'), to: sw, cables: ['cat6', 'cat6a', 'fiber'], w: 2, wc: 1, min: s.servers,
      label: 'Servers plug into a switch', labelCable: 'Copper or fiber to the servers',
      tip: 'Plug each server into a switch.', tipCable: 'Servers take Cat6, Cat6A or fiber.' }));
    if (far.length) rules.push(each({ from: K('site', 'remote'), to: K('firewall'), cables: ['vpn'], w: 2, wc: 2, min: far.length,
      cablesFor: function (n) { return pm[n.piece] && pm[n.piece].cables; },
      label: 'Other sites and remote users reach the firewall', labelCable: 'VPN tunnels to other sites and remote users',
      tip: 'Other sites and remote users connect to the firewall, which is where the tunnel ends.',
      tipCable: 'Use a VPN tunnel to other sites and remote users.' }));
    rules.push(reach(isEp, K('internet', 'backup'), 3, 'Every device group has a path to the internet',
      'At least one device group is an island. Trace it: device, switch or access point, firewall, internet.'));

    var vmap = {};
    eps.forEach(function (e) { if (e.vlan) vmap[e.id] = e.vlan; });
    rules.push(vlan(vmap, 1));

    rules.push(attach({ sel: K('ups'), to: K('switch', 'firewall'), cables: ['power'], w: 3,
      label: 'UPS battery powers the core',
      tipPlace: 'Add a UPS battery so a short outage does not drop the network.',
      tipLink: 'Run power from the UPS to the switch or the firewall.',
      tipCable: 'A UPS connects with a power cord, not a data cable.' }));
    rules.push(attach({ sel: K('backup'), to: K('firewall'), cables: ['wan', 'fiber'], w: 3,
      label: 'A backup internet line fails over at the firewall',
      tipPlace: 'Add a backup internet line. It is the cheap fix for the star\'s weak point at the edge.',
      tipLink: 'Connect the backup line to the firewall.',
      tipCable: 'The backup line is an ISP line.' }));
    if (s.nas) rules.push(attach({ sel: K('nas'), to: sw, cables: ['cat6', 'cat6a'], w: 2,
      label: 'A NAS on the switch holds the local backup',
      tipPlace: 'Add a NAS for the local backup copy.',
      tipLink: 'Plug the NAS into the switch.',
      tipCable: 'The NAS uses Cat6 or Cat6A.' }));
    rules.push(attach({ sel: K('cloud'), to: K('internet', 'firewall'), cables: ['wan', 'vpn'], w: 2,
      label: 'Cloud backup keeps a copy off-site',
      tipPlace: 'Add cloud backup: the off-site copy in the 3-2-1 rule.',
      tipLink: 'Connect cloud backup to the internet cloud. It rides the ISP line.',
      tipCable: 'Cloud backup travels over the ISP line (encrypted).' }));
    if (s.wanMesh) rules.push(any({ a: P([s.wanMesh[0]]), b: P([s.wanMesh[1]]), cables: ['vpn'], w: 2, wc: 1, cat: 'resil', catCable: 'resil',
      label: 'The two existing offices also tunnel to each other', labelCable: 'VPN tunnel between the existing offices',
      tip: 'Three sites only need three tunnels for a full mesh. Link the two existing offices to each other as well.',
      tipCable: 'Use a VPN tunnel between offices.' }));

    rules.push(forbidKind(K('hub'), 5, 'A hub is on the chart',
      'Take the hub out. It shares bandwidth between every port and has no VLANs. The switch does its job.'));
    rules.push(forbidLink(isEp, isEp, 3, 9, 'Device groups are wired straight to each other',
      'In a star every device goes to the switch. Device-to-device links are mesh thinking.'));

    /* answer key */
    /* Layout: WAN across the top, other sites down the left edge (then the
       right), firewall and core in the middle, devices along the bottom. */
    var mk = maker(), top = {};
    top.cloud = mk.node('cloud', 310, 70); top.internet = mk.node('internet', 500, 70); top.backup = mk.node('backup', 690, 70);
    var gap = s.wanMesh ? 140 : 105, right = 0;
    sites.forEach(function (p, i) {
      top[p.id] = i < 3 ? mk.node('site', 85, 150 + i * gap, { piece: p.id }) : mk.node('site', 915, 150 + 105 * right++, { piece: p.id });
    });
    if (s.remote) top.remote = mk.node('remote', 915, 150 + 105 * right, { piece: 'remote' });
    var fw = mk.node('firewall', 500, 195);
    var core = mk.node('switch', 500, 320, { label: s.access ? 'Core switch' : null });
    var ups = mk.node('ups', 305, 335);
    mk.link(top.internet, fw, 'wan'); mk.link(top.backup, fw, 'wan'); mk.link(top.cloud, top.internet, 'wan');
    sites.forEach(function (p) { mk.link(top[p.id], fw, (p.cables || ['vpn'])[0]); });
    if (s.remote) mk.link(top.remote, fw, 'vpn');
    if (s.wanMesh) mk.link(top[s.wanMesh[0]], top[s.wanMesh[1]], 'vpn');
    mk.link(fw, core, 'cat6a'); mk.link(ups, core, 'power'); mk.link(ups, fw, 'power');
    if (s.nas) mk.link(mk.node('nas', 700, s.servers > 1 ? 348 : 320), core, 'cat6a');
    var srvAt = [[745, 225], [880, 285]];
    for (var i = 0; i < s.servers; i++) mk.link(mk.node('server', srvAt[i][0], srvAt[i][1]), core, 'cat6a');

    var deep = s.access > 0 || wifi.length > 0;
    var order = wired.concat(wifi), ex = spread(order.length, 185), xOf = {};
    var epNode = {};
    order.forEach(function (e, i) {
      xOf[e.id] = ex[i];
      epNode[e.id] = mk.node('endpoint', ex[i], deep ? 575 : 470, { piece: e.id, vlan: e.vlan ? e.vlan[0] : null });
    });
    if (s.access) {
      chunks(wired, s.access).forEach(function (grp, i) {
        var x = grp.length ? mean(grp.map(function (e) { return xOf[e.id]; })) : 120 + i * 120;
        var a = mk.node('switch', x, 450, { label: 'Access switch' });
        mk.link(a, core, 'fiber');
        grp.forEach(function (e) { mk.link(epNode[e.id], a, 'cat6'); });
      });
    } else {
      wired.forEach(function (e) { mk.link(epNode[e.id], core, 'cat6'); });
    }
    if (wifi.length) {
      var nAp = Math.max(1, s.aps.draw), groups = chunks(wifi, Math.min(nAp, wifi.length));
      for (var a = 0; a < nAp; a++) {
        var grp = groups[a] || [];
        var x = grp.length ? mean(grp.map(function (e) { return xOf[e.id]; })) : 880;
        var apn = mk.node('ap', x, 450);
        mk.link(apn, core, 'cat6');
        grp.forEach(function (e) { mk.link(epNode[e.id], apn, 'wifi'); });
      }
    }

    var v = scn.vlanNames;
    var notes = [
      'Every device has its own run to a switch, so one bad cable takes down one device group, not ' + t.place + '.',
      'VLANs: 10 ' + v[10] + ', 20 ' + v[20] + ', 30 ' + v[30] + ', 40 ' + v[40] + '. The firewall blocks traffic between them, so ' + t.guests + ' can never reach ' + t.sensitive + '.',
      'The star\'s one weakness is the core. The UPS, the backup internet line and a spare switch on the shelf remove it for a few hundred dollars.'
    ].concat(s.why || []);

    return {
      opt: 'star', pieces: all, pm: pm,
      gear: ['internet', 'backup', 'firewall', 'switch', 'ap', 'server', 'nas', 'cloud', 'ups', 'hub'],
      budgets: { devices: 25, links: 35, cables: 20, vlans: 10, resil: 10 },
      rules: rules, solution: { nodes: mk.N, edges: mk.E }, vlans: true,
      goal: 'Build our pick: an extended star with a redundant core. Start at the internet and work down to the devices, then set each group\'s VLAN.',
      notes: notes,
      say: [
        'We recommend an extended star with a redundant core: every device runs to a managed switch, with backup only where downtime is expensive.',
        'Pros: a bad cable affects one device; every packet passes one point we can secure and monitor; adding a user is one more cable.',
        'Cons, and the fix: the core switch is a single point of failure, so it sits on a UPS with a spare on the shelf and a backup internet line.',
        'It is the only option that keeps ' + t.guests + ' away from ' + t.sensitive + ', which is what ' + t.rule + ' expects.'
      ],
      target: K('internet', 'backup'),
      watch: isEp
    };
  }

  /* ---- mesh board ------------------------------------------------------ */
  function meshBoard(scn) {
    var d = scn.mesh, t = scn.talk, pm = {};
    var ps = d.nodes.map(function (p) { var o = { kind: p.kind || 'endpoint' }; for (var k in p) o[k] = p[k]; pm[o.id] = o; return o; });
    var ids = ps.map(function (p) { return p.id; }), n = ps.length, total = n * (n - 1) / 2;
    var cableNames = names(d.cables.map(function (c) { return TL.CABLES[c].name; }));
    var rules = [
      pieces(ids, 1, 'Every ' + d.unit + ' is placed'),
      pairs({ sel: P(ids), total: total, cables: d.cables, w: 1, wc: 1,
        label: 'Every ' + d.unit + ' links directly to every other (' + total + ' links)',
        labelCable: 'The right link type on each one',
        tip: 'A full mesh of ' + n + ' needs n(n-1)/2 = ' + total + '.',
        tipCable: 'For this mesh use ' + cableNames.replace(/ and /, ' or ') + '.' }),
      forbidKind(function (x) { return !x.piece && (x.kind === 'switch' || x.kind === 'hub'); }, 10, 'A central device is on the chart',
        'Take the switch or hub out. A central device turns a mesh into a star.')
    ];
    var mk = maker(), R = 235, nodes = [];
    ps.forEach(function (p, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      nodes.push(mk.node(p.kind, Math.round(500 + R * Math.cos(ang)), Math.round(330 + R * Math.sin(ang)), { piece: p.id }));
    });
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) mk.link(nodes[i], nodes[j], d.cables[0]);
    return {
      opt: 'mesh', pieces: ps, pm: pm, gear: ['switch', 'hub'],
      budgets: { devices: 20, links: 60, cables: 20 },
      rules: rules, solution: { nodes: mk.N, edges: mk.E }, vlans: false,
      goal: 'Build the full mesh option: connect every ' + d.unit + ' directly to every other one. Count the links as you go.',
      notes: [
        'Links = n(n-1)/2. Here n = ' + n + ', so ' + total + ' links.',
        d.scale,
        'Run the failure test: cut any one link and nothing goes offline. That redundancy is the whole appeal, and the link count is the whole cost.'
      ],
      say: [
        'Option two is a full mesh: every ' + d.unit + ' connects directly to every other.',
        'Pros: maximum redundancy, because traffic reroutes around any failed link, and the shortest path between any two points.',
        'Cons: the link count explodes. It is n times n minus one, over two. ' + d.scale,
        'Cost impact: highest by far, and much harder to manage and document.'
      ],
      target: null,
      watch: P(ids)
    };
  }

  /* ---- bus board ------------------------------------------------------- */
  function busBoard(scn) {
    var d = scn.bus, t = scn.talk, pm = {};
    var ps = d.pieces.map(function (p) { var o = { kind: 'endpoint' }; for (var k in p) o[k] = p[k]; return o; });
    ps.push({ id: 'router', kind: 'firewall', label: 'Router', sub: 'to the internet' });
    ps.forEach(function (p) { pm[p.id] = p; });
    var ids = ps.map(function (p) { return p.id; });
    var bb = K('backbone'), isPiece = P(ids);
    var rules = [
      count(bb, 1, 2, 'One shared coax backbone', 'A bus starts with a single backbone cable. Drag the coax backbone onto the page.'),
      count(K('terminator'), 2, 2, 'A terminator for each end', 'A bus needs two terminators, one on each end of the backbone.'),
      pieces(ids, 3, 'Every device is placed'),
      each({ from: isPiece, to: bb, cables: ['coax'], w: 4, wc: 3, min: ids.length,
        label: 'Every device taps into the backbone', labelCable: 'Coax on every tap',
        tip: 'Connect each device to the backbone itself. On a bus nothing has its own line to a central box.',
        tipCable: 'Bus taps are coax, joined to the backbone with a T-connector.' }),
      each({ from: K('terminator'), to: bb, cables: ['coax'], w: 2, wc: 1, min: 2,
        label: 'Both terminators cap the backbone', labelCable: 'Terminators sit on the coax',
        tip: 'Attach each terminator to the backbone.',
        tipCable: 'Terminators attach to the coax.' }),
      forbidKind(function (x) { return !x.piece && (x.kind === 'switch' || x.kind === 'hub'); }, 10, 'A central device is on the chart',
        'Take the switch or hub out. With a central device this stops being a bus.'),
      forbidLink(function (x) { return x.kind !== 'backbone'; }, function (x) { return x.kind !== 'backbone'; }, 3, 9,
        'Devices are wired straight to each other', 'On a bus every device connects only to the backbone.')
    ];
    var mk = maker(), bar = mk.node('backbone', 500, 330);
    var t1 = mk.node('terminator', 500 - TL.SIZE.bar / 2 - 50, 330), t2 = mk.node('terminator', 500 + TL.SIZE.bar / 2 + 50, 330);
    mk.link(t1, bar, 'coax'); mk.link(t2, bar, 'coax');
    var order = [pm.router].concat(ps.filter(function (p) { return p.id !== 'router'; })), xs = spread(order.length, 135);
    order.forEach(function (p, i) {
      mk.link(mk.node(p.kind, xs[i], i % 2 ? 490 : 175, { piece: p.id }), bar, 'coax');
    });
    var notes = [
      'Every device shares one cable, so they also share its bandwidth: the more devices, the slower it gets.',
      'Run the failure test and click the backbone. Everything goes offline at once, because a break leaves two unterminated ends.',
      'There is no switch, so there are no VLANs. Nothing separates ' + t.guests + ' from ' + t.sensitive + '.'
    ];
    if (d.extra) notes.push(d.extra);
    return {
      opt: 'bus', pieces: ps, pm: pm, gear: ['backbone', 'terminator', 'switch', 'hub'],
      budgets: { devices: 25, links: 50, cables: 25 },
      rules: rules, solution: { nodes: mk.N, edges: mk.E }, vlans: false,
      goal: 'Build the bus option: put every device on one shared coax backbone and cap both ends.',
      notes: notes,
      say: [
        'Option one is a bus: every device taps into one shared backbone cable.',
        'Pros: it uses the least cable, so it is the cheapest to wire, and it is simple for a very small, temporary setup.',
        'Cons: one break takes down all of ' + t.place + '; everyone shares the same bandwidth; and with no VLANs we could not separate ' + t.guests + ' from ' + t.sensitive + '.',
        'Cost impact: lowest, but it fails on security and reliability.'
      ],
      target: P(['router']),
      watch: isPiece,
      isBus: true
    };
  }

  /* ---- public: boards --------------------------------------------------- */
  var cache = {};
  TL.board = function (scn, opt) {
    var key = scn.id + '.' + opt;
    if (cache[key]) return cache[key];
    var B = opt === 'star' ? starBoard(scn) : opt === 'mesh' ? meshBoard(scn) : busBoard(scn);
    B.key = key; B.scn = scn;
    return (cache[key] = B);
  };
  TL.scenario = function (id) { return TL.SCENARIOS.filter(function (s) { return s.id === id; })[0]; };

  /* ---- public: scoring -------------------------------------------------- */
  TL.evaluate = function (B, G) {
    var items = [], deds = [];
    B.rules.forEach(function (r) { r(G, B).forEach(function (it) { (it.ded ? deds : items).push(it); }); });
    var sumW = {}, cats = {};
    items.forEach(function (it) { sumW[it.cat] = (sumW[it.cat] || 0) + it.w; });
    var raw = 0;
    Object.keys(B.budgets).forEach(function (c) { cats[c] = { name: CATS[c], max: B.budgets[c], got: 0, items: [] }; });
    items.forEach(function (it) {
      it.max = B.budgets[it.cat] * it.w / sumW[it.cat];
      it.got = it.max * it.f;
      it.state = it.f >= 0.999 ? 'ok' : it.f <= 0.001 ? 'miss' : 'part';
      cats[it.cat].got += it.got; cats[it.cat].items.push(it);
      raw += it.got;
    });
    var lost = deds.reduce(function (a, d) { return a + d.ded; }, 0);
    var score = Math.max(0, Math.min(100, Math.round(raw - lost)));
    var bad = { n: {}, e: {} };
    items.concat(deds).forEach(function (it) {
      if (it.ded || it.state !== 'ok') {
        it.bad.n.forEach(function (i) { bad.n[i] = 1; });
        it.bad.e.forEach(function (i) { bad.e[i] = 1; });
      }
    });
    return { score: score, raw: raw, lost: lost, cats: cats, items: items, deds: deds, bad: bad };
  };
  TL.stars = function (score) { return score >= 100 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0; };

  /* ---- public: failure test ---------------------------------------------
     failed = { n:{id:1}, e:{id:1} }. Returns which watched nodes lost their
     path to the target (the internet on a star, the router on a bus, the
     largest surviving group on a mesh). */
  TL.failureTest = function (B, G, failed) {
    var m = byId(G), watched = pick(G, B.watch), adj = paths(G, failed), off = [];
    var busDown = false;
    if (B.isBus) {
      var bars = pick(G, K('backbone'));
      var capped = bars.length === 1 && G.edges.filter(function (e) {
        if (failed.e[e.id]) return false;
        var o = e.a === bars[0].id ? m[e.b] : e.b === bars[0].id ? m[e.a] : null;
        return o && o.kind === 'terminator' && !failed.n[o.id];
      }).length >= 2;
      busDown = !bars.length || failed.n[bars[0].id] || !capped;
    }
    var seen;
    var targets = B.target ? pick(G, B.target).map(function (n) { return n.id; }) : [];
    if (targets.length) {
      seen = flood(G, adj, targets);
    } else {
      var best = {}, bestSize = -1, done = {};
      watched.forEach(function (n) {
        if (done[n.id] || failed.n[n.id]) return;
        var comp = flood(G, adj, [n.id]), size = 0;
        Object.keys(comp).forEach(function (k) { done[k] = 1; if (B.watch(m[k])) size++; });
        if (size > bestSize) { bestSize = size; best = comp; }
      });
      seen = best;
    }
    watched.forEach(function (n) {
      if (failed.n[n.id]) return;
      if (busDown || !seen[n.id]) off.push(n.id);
    });
    var alive = watched.filter(function (n) { return !failed.n[n.id]; }).length;
    return { offline: off, alive: alive, all: alive > 0 && off.length === alive, busDown: busDown };
  };

  /* ---- public: cost card ------------------------------------------------- */
  TL.costCard = function (scn) {
    var c = scn.cost, s = scn.star, PR = TL.PRICES;
    if (!c) return null;
    var wired = s.endpoints.filter(function (e) { return e.via === 'wired'; })
      .reduce(function (a, e) { return a + (e.qty || 0); }, 0);
    var base = wired + s.aps.real + (s.nas ? 1 : 0) + s.servers;
    var drops = base + Math.ceil(base * 0.1);
    var ports = Math.ceil(drops * 1.2);
    var lines = [];
    function add(p, qty, note) { lines.push({ label: p.label, qty: qty, unit: p.usd, total: p.usd * qty, approx: !!p.approx, note: note }); }
    add(PR[c.gateway], 1);
    if (ports <= 16) add(PR.sw16, 1, ports + ' ports needed');
    else add(PR.sw24, Math.ceil(ports / 24), ports + ' ports needed');
    if (s.aps.real) add(PR.ap, s.aps.real);
    add(PR.drop, drops, base + ' runs + 10% spare');
    add(PR[c.ups], 1);
    if (s.nas) add(PR.nas, 1);
    if (s.servers) add(PR.server, s.servers);
    add(PR.rack, 1);
    if (c.branch) {
      var kit = PR.ucg.usd + PR.sw16.usd + PR.upsSmall.usd + PR.drop.usd * c.branch.drops;
      lines.push({ label: c.branch.label, qty: c.branch.n, unit: kit, total: kit * c.branch.n });
    }
    var sub = lines.reduce(function (a, l) { return a + l.total; }, 0);
    var labor = Math.round(sub * 0.15);
    var monthly = [];
    if (c.users) monthly.push({ label: PR.m365.label + ' (' + c.users + ' x $' + PR.m365.usd + ')', total: c.users * PR.m365.usd });
    if (c.tb) monthly.push({ label: PR.b2.label + ' (' + c.tb + ' TB)', total: Math.round(c.tb * PR.b2.usd) });
    return {
      lines: lines, subtotal: sub, labor: labor, total: sub + labor,
      rounded: Math.round((sub + labor) / 100) * 100,
      monthly: monthly, monthlyTotal: monthly.reduce(function (a, l) { return a + l.total; }, 0),
      note: c.note, drops: drops, ports: ports
    };
  };

  /* ---- public: progress ---------------------------------------------------- */
  TL.rank = function (xp) {
    var cur = TL.RANKS[0], next = null;
    TL.RANKS.forEach(function (r, i) { if (xp >= r.at) { cur = r; next = TL.RANKS[i + 1] || null; } });
    return { name: cur.name, at: cur.at, next: next };
  };
  TL.MAX_XP = TL.SCENARIOS.length * 3 * 100 + 200;
})(typeof window !== 'undefined' ? window : globalThis);
