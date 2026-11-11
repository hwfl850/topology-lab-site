/* Topology Lab: content.
   Everything a person reads lives here: the nine role plays (FBLA samples 1-10;
   samples 4 and 5 describe the same clinic), the device and cable catalog, the
   field guide and the quiz. engine.js turns a role play into three boards
   (bus, mesh, star) with an answer key and scoring rules; app.js draws them.

   Prices were checked in November 2026 against store pages. Anything marked
   "approximate" or "assumed" is not from the prompt or a store page and is
   labelled that way on screen. */
(function (root) {
  'use strict';
  var TL = root.TL = root.TL || {};

  /* ---- Cables: the eight line styles on the toolbar ------------------- */
  TL.CABLES = {
    cat6: {
      name: 'Cat6', kind: 'Copper',
      spec: '1 Gbps to 100 m (10 Gbps to 55 m)',
      what: 'Twisted-pair copper. It carries data and PoE power on the same cable, so it is the default for every wall drop and every access point.',
      when: 'Desktops, POS terminals, printers, access points.',
      say: 'Every run is Cat6, rated for gigabit speed up to 100 meters.',
      price: '$150 to $250 per installed drop'
    },
    cat6a: {
      name: 'Cat6A', kind: 'Copper',
      spec: '10 Gbps to 100 m',
      what: 'Thicker, better-shielded copper. Ten times the speed of Cat6 over the full 100 meters, and it still carries PoE.',
      when: 'Uplinks between switches, servers, and anywhere you want headroom for ten years.',
      say: 'Uplinks are Cat6A, so the link between switches is never the bottleneck.',
      price: '$200 to $350+ per installed drop'
    },
    fiber: {
      name: 'Fiber', kind: 'Glass',
      spec: 'Multimode: 10 Gbps for about 300 to 400 m. Single-mode: 10 km and beyond',
      what: 'Glass strands that carry light. Immune to electrical interference, hard to tap, and good for long distances. It cannot carry PoE power.',
      when: 'Between wiring closets (multimode), between buildings (single-mode), and any run over 100 m or through a noisy metal building.',
      say: 'Closets connect over fiber, which ignores interference and removes the cable bottleneck.',
      price: 'Quoted per run by the cabling contractor'
    },
    coax: {
      name: 'Coax', kind: 'Copper',
      spec: 'Old 10BASE2 bus: 10 Mbps, 185 m per segment',
      what: 'One copper core inside a shield. Bus networks ran on it with T-connectors and terminators. Today it only brings cable internet to the modem.',
      when: 'The bus option, to show why nobody builds it any more.',
      say: 'A bus shares one coax backbone, so one break takes down everyone.',
      price: 'Legacy parts; cheapest to wire'
    },
    wifi: {
      name: 'Wi-Fi', kind: 'Radio',
      spec: 'Wi-Fi 7 (802.11be): 2.4, 5 and 6 GHz',
      what: 'Radio, not a cable. Devices join an access point, and the access point is wired to the switch. Secure it with WPA3.',
      when: 'Laptops, tablets, phones, anything that moves.',
      say: 'Wi-Fi 7 access points, about one per 25 users, secured with WPA3.',
      price: 'No cabling; the cost is the access points'
    },
    vpn: {
      name: 'VPN tunnel', kind: 'Encrypted',
      spec: 'IPsec or WireGuard over the internet',
      what: 'An encrypted tunnel across the public internet. Site-to-site joins two offices; a client VPN joins one remote person.',
      when: 'Linking branches, a hospital, or people working from home.',
      say: 'Sites connect over an encrypted site-to-site VPN, so no leased line is needed.',
      price: 'Built into the gateway; rides the internet you already pay for'
    },
    wan: {
      name: 'ISP line', kind: 'Provider',
      spec: 'Business fiber, cable or cellular',
      what: "The provider's line into the building. On a hand-drawn chart it is a lightning bolt between the cloud and the firewall.",
      when: 'Internet to the firewall, and the backup line.',
      say: 'A business fiber line is the main connection, with a 5G line as backup.',
      price: 'Monthly, set by the ISP'
    },
    power: {
      name: 'Power', kind: 'Electrical',
      spec: 'Not a data link',
      what: 'The power cord from the UPS battery to the gear it protects.',
      when: 'UPS to the gateway and the core switch.',
      say: 'The gateway and switch sit on a UPS, so a short outage never takes the network down.',
      price: 'Included with the UPS'
    }
  };
  TL.CABLE_ORDER = ['cat6', 'cat6a', 'fiber', 'coax', 'wifi', 'vpn', 'wan', 'power'];

  /* ---- Device kinds (things you can place more than once) -------------- */
  TL.KINDS = {
    internet: {
      name: 'Internet (ISP)', icon: 'cloud', layer: 'WAN',
      what: 'Your connection to the outside world. The modem or fiber terminal is folded into this cloud on a flip chart.',
      when: 'Top of every design.',
      say: 'A business fiber line is the main connection.',
      sketch: 'A cloud with "ISP" inside.'
    },
    backup: {
      name: 'Backup internet', icon: 'tower', layer: 'WAN',
      what: 'A second way out: a 5G line or a second provider. The gateway fails over to it automatically.',
      when: 'Any site that cannot afford to be offline: card payments, telehealth, records.',
      say: 'If the main line drops, the 5G backup takes over automatically.',
      sketch: 'A small tower with two arcs.'
    },
    firewall: {
      name: 'Firewall / gateway', icon: 'firewall', layer: 'Layers 3 to 7',
      what: 'Router and next-generation firewall in one box. It routes between your network and the internet, blocks inbound traffic by default, and runs intrusion prevention, DHCP, DNS filtering and VPN.',
      when: 'One at the edge of every site, between the internet and the switch.',
      say: 'At the edge, a next-generation firewall with intrusion prevention built in.',
      sketch: 'A brick wall.',
      price: 'UniFi Cloud Gateway Max $279. Security-first: FortiGate 60F with 3 years of threat protection $1,558'
    },
    switch: {
      name: 'PoE switch', icon: 'switch', layer: 'Layer 2',
      what: 'A managed switch forwards frames to the right port by MAC address, creates VLANs, and powers access points over the data cable. It is the hub of the star.',
      when: 'One core switch per site. Add an access switch per wiring closet as the site grows (extended star).',
      say: 'At the core, a managed PoE switch that powers the access points through the network cable.',
      sketch: 'A flat box with arrows pointing both ways.',
      price: 'UniFi Pro Max 24 PoE $799. Small sites: Lite 16 PoE $199'
    },
    ap: {
      name: 'Access point', icon: 'ap', layer: 'Layer 2',
      what: 'Bridges Wi-Fi devices onto the wired network. It is wired to the switch with copper, which also powers it (PoE+).',
      when: 'About one per 25 to 30 wireless users. More in metal or thick-walled buildings.',
      say: 'Wi-Fi 7 access points, roughly one per 25 users.',
      sketch: 'A small box with three arcs above it.',
      price: 'UniFi U7 Pro (Wi-Fi 7) $189'
    },
    server: {
      name: 'Server', icon: 'server', layer: 'Layer 7',
      what: 'A central computer for logins (Active Directory), shared files or an application such as patient records. Two servers can share the load and cover for each other.',
      when: 'On-site apps, large file shares, or a domain controller. Small offices can use the cloud instead.',
      say: 'Two servers share the load, so one can fail without stopping the clinic.',
      sketch: 'A tall box with three shelf lines.',
      price: 'Dell PowerEdge T160 from $4,449, Windows Server 2025 Standard $1,036, plus $57 per user'
    },
    nas: {
      name: 'NAS', icon: 'nas', layer: 'Layer 7',
      what: 'Network-attached storage. Shared files and the local copy in the 3-2-1 backup rule.',
      when: 'Any site with files worth keeping. Plugs into the core switch.',
      say: 'A local NAS holds the first backup copy for fast restores.',
      sketch: 'A box with four vertical drive slots.',
      price: 'Synology DS925+ $590, plus drives (about $400, approximate)'
    },
    cloud: {
      name: 'Cloud backup', icon: 'cloudup', layer: 'Off-site',
      what: 'Encrypted backup outside the building. This is the "1" in 3-2-1: one copy off-site, ideally immutable so ransomware cannot change it.',
      when: 'Every design. It reaches the cloud through the internet connection.',
      say: 'An encrypted cloud copy means a fire or ransomware never costs you your data.',
      sketch: 'A cloud with an up arrow.',
      price: 'Backblaze B2 $6.95 per TB per month'
    },
    ups: {
      name: 'UPS battery', icon: 'ups', layer: 'Power',
      what: 'Battery backup. It keeps the gateway and switch running through short outages and allows a clean shutdown. Size it at total watts times 1.25.',
      when: 'Every network closet. It connects with a power cord, not a data cable.',
      say: 'The core sits on a UPS, which removes the cheapest single point of failure.',
      sketch: 'A battery with plus and minus.',
      price: 'CyberPower CP1500PFCLCD $275. Rackmount: APC Smart-UPS 1500 $1,085'
    },
    hub: {
      name: 'Hub', icon: 'hub', layer: 'Layer 1',
      what: 'Obsolete. A hub repeats every signal to every port, so all devices share one collision domain and anyone can read anyone else\'s traffic.',
      when: 'Never. If a judge mentions one, say you would replace it with a managed switch.',
      say: 'We would never specify a hub: no VLANs, no security, shared bandwidth.',
      sketch: 'A flat box with dots.'
    },
    backbone: {
      name: 'Coax backbone', icon: 'backbone', layer: 'Layer 1',
      what: 'The single shared cable in a bus topology. Every device taps into it with a T-connector.',
      when: 'Only on the bus option.',
      say: 'Every device shares one backbone, so they also share its bandwidth and its failures.',
      sketch: 'One long straight line across the page.'
    },
    terminator: {
      name: 'Terminator', icon: 'terminator', layer: 'Layer 1',
      what: 'A 50-ohm cap on each end of a bus. It absorbs the signal so it does not bounce back down the cable. Lose one and the whole bus stops.',
      when: 'One on each end of the backbone. Always two.',
      say: 'Both ends of a bus need a terminator; a missing one takes the network down.',
      sketch: 'A short bar across the end of the line.'
    },
    site: {
      name: 'Other site', icon: 'building', layer: 'WAN',
      what: 'Another building with its own star network inside. It joins this site through a site-to-site VPN.',
      when: 'Branches, a main office, a hospital, other campuses.',
      say: 'Each site keeps its own star, and the sites link over encrypted tunnels.',
      sketch: 'A small building.'
    },
    remote: {
      name: 'Remote user', icon: 'home', layer: 'WAN',
      what: 'Someone working from home or on the road. They connect through a client VPN with multi-factor login.',
      when: 'Remote access, off-site management.',
      say: 'Remote staff connect through a VPN with multi-factor login.',
      sketch: 'A house.'
    },
    endpoint: {
      name: 'Device group', icon: 'pc', layer: 'End devices',
      what: 'The devices people use. Wired ones home-run to a switch. Wireless ones join an access point.',
      when: 'One box per group on the chart, with the count written on it.',
      say: '',
      sketch: 'A box with the count, for example "POS x5".'
    }
  };

  /* Unit prices used by the cost card (USD, November 2026). */
  TL.PRICES = {
    ucg: { label: 'UniFi Cloud Gateway Max', usd: 279 },
    pro: { label: 'UniFi Dream Machine Pro Max', usd: 599 },
    beast: { label: 'UniFi Dream Machine Beast', usd: 1499 },
    sw24: { label: 'UniFi Pro Max 24 PoE switch', usd: 799 },
    sw16: { label: 'UniFi Lite 16 PoE switch', usd: 199 },
    ap: { label: 'UniFi U7 Pro access point', usd: 189 },
    drop: { label: 'Cat6 drop, installed', usd: 200 },
    upsSmall: { label: 'CyberPower CP1500PFCLCD UPS', usd: 275 },
    upsRack: { label: 'APC Smart-UPS 1500 rackmount', usd: 1085 },
    nas: { label: 'Synology DS925+ NAS + 4 drives', usd: 990, approx: true },
    server: { label: 'Dell PowerEdge T160 + Windows Server 2025', usd: 5485 },
    rack: { label: 'Wall rack + patch panel', usd: 250, approx: true },
    m365: { label: 'Microsoft 365 Business Premium', usd: 22 },
    b2: { label: 'Backblaze B2 cloud backup', usd: 6.95 },
    forti: { label: 'FortiGate 60F + 3-yr threat protection', usd: 1558 }
  };

  /* ---- Role plays ------------------------------------------------------ */
  function ep(id, label, qty, icon, via, vlan, extra) {
    var o = { id: id, label: label, qty: qty, icon: icon, via: via, vlan: vlan };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  TL.SCENARIOS = [
    {
      id: 'preschool', samples: ['1'],
      title: "Tomorrow's Future Preschool",
      client: 'Marsha Williamson, owner',
      tagline: 'Five rural sites sharing student records on a grant budget',
      brief: 'A rural preschool serving about 40 children wants to network its main site and open four more centers 20 to 50 miles away. Student records must be shared between the admin computer at every site and kept secure. A grant pays for the project, so the cost has to stay low and the price breakdown has to be clear.',
      facts: [
        'Main site: 10 student computers and 1 admin computer, none networked today',
        'Each of 4 new sites: 5 student computers, 1 admin computer, 1 networked all-in-one printer',
        'Student computers need internet; admin records are highly sensitive',
        'Sites connect inside and to each other, and must be manageable from off-site',
        'Limited downtime at the main site when new sites come online',
        'One software suite for email, fax, printing and word processing'
      ],
      cover: ['Price breakdown and total for the grant', 'Physical and logical diagram', 'Justify each choice'],
      assume: null,
      vlanNames: { 10: 'Staff', 20: 'Students', 30: 'Records', 40: 'Printers' },
      talk: { place: 'the preschool', guests: 'the student computers', sensitive: 'the student records', rule: 'student privacy' },
      star: {
        endpoints: [
          ep('students', 'Student PCs', 10, 'pc', 'wired', [20]),
          ep('admin', 'Admin PC', 1, 'pc', 'wired', [30]),
          ep('printer', 'All-in-one printer', 1, 'printer', 'wired', [40])
        ],
        aps: { draw: 0, real: 0 }, access: 0, servers: 0, nas: true,
        sites: [
          { id: 's2', label: 'Preschool 2' }, { id: 's3', label: 'Preschool 3' },
          { id: 's4', label: 'Preschool 4' }, { id: 's5', label: 'Preschool 5' }
        ],
        remote: { label: 'Off-site IT', sub: 'remote management' },
        why: [
          'The main site holds the records on the NAS; each new preschool reaches it through its own VPN tunnel. That is hub-and-spoke: four tunnels instead of ten.',
          'Student PCs sit on their own VLAN with internet only, so a child\'s game computer can never open student records.',
          'New sites join by adding one tunnel, so the main site stays up while they come online.',
          'Off-site management is a client VPN into the gateway, plus the cloud dashboard.'
        ]
      },
      mesh: {
        unit: 'site', cables: ['vpn', 'wan', 'fiber'],
        nodes: [
          { id: 'm1', label: 'Main preschool', kind: 'site' }, { id: 'm2', label: 'Preschool 2', kind: 'site' },
          { id: 'm3', label: 'Preschool 3', kind: 'site' }, { id: 'm4', label: 'Preschool 4', kind: 'site' },
          { id: 'm5', label: 'Preschool 5', kind: 'site' }
        ],
        scale: '5 sites need 10 tunnels. A sixth site makes it 15.'
      },
      bus: {
        pieces: [
          ep('b1', 'Student PCs 1-5', 5, 'pc'), ep('b2', 'Student PCs 6-10', 5, 'pc'),
          ep('b3', 'Admin PC', 1, 'pc'), ep('b4', 'Printer', 1, 'printer')
        ]
      },
      cost: { gateway: 'ucg', ups: 'upsSmall', users: 5, tb: 1, branch: { n: 4, drops: 8, label: 'Each new preschool (gateway, 16-port switch, UPS, 8 drops)' },
        note: 'Five Microsoft 365 seats, one per admin computer. New sites also need 6 computers and a printer each: about $800 to $1,000 per computer (approximate).' }
    },

    {
      id: 'warehouse', samples: ['2'],
      title: 'Exterminator branch warehouse',
      client: 'Your own company: you are its IT division',
      tagline: 'Metal building, 70 devices, sales reps coming and going',
      brief: 'A national exterminating company is opening a branch in a new metal warehouse with 10 offices, a reception area and a meeting room. Sales reps come and go all day, the software is data-heavy, and visiting reps from other branches should get the same access they have at home.',
      facts: [
        '10 wired computers, 30 wireless devices, 30 laptops (70 devices)',
        'Metal exterior, steel beams, drywall with little insulation, square floor plan',
        'Must handle programs that move large amounts of data',
        'Company-wide initiative: visiting reps get the same access here',
        'New suburban area with current infrastructure (fiber is available)',
        'Plan for expansion'
      ],
      cover: ['A backup system', 'How the plan is cost efficient', 'LAN versus wireless', 'Costs for equipment, servers, printers, software'],
      assume: 'One shared office printer is assumed; the prompt only says to price printers.',
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'Servers', 40: 'Devices' },
      talk: { place: 'the branch', guests: 'visitors', sensitive: 'company data', rule: 'company policy' },
      star: {
        endpoints: [
          ep('pcs', 'Office PCs', 10, 'pc', 'wired', [10]),
          ep('printer', 'Office printer', 1, 'printer', 'wired', [40], { assumed: true }),
          ep('laptops', 'Sales laptops', 30, 'laptop', 'wifi', [10]),
          ep('wdev', 'Wireless devices', 30, 'tablet', 'wifi', [10, 40])
        ],
        aps: { draw: 2, real: 4 }, access: 0, servers: 0, nas: true,
        sites: [{ id: 'hq', label: 'Company HQ', sub: 'same logins everywhere' }],
        why: [
          'Metal walls block and reflect Wi-Fi, so this site gets 4 access points instead of the 3 that 60 wireless devices would normally need. Say you would confirm it with a site survey.',
          'LAN versus wireless: the 10 office PCs and the printer are wired (faster, more secure, no interference). Laptops and handhelds are wireless because sales reps move.',
          'The tunnel to headquarters lets a visiting rep log in with the same account and reach the same files.',
          'Backup system: NAS on site, encrypted copy in the cloud, UPS on the core.'
        ]
      },
      mesh: {
        unit: 'device', cables: ['cat6', 'cat6a'],
        nodes: [
          ep('m1', 'Reception PC', 1, 'pc'), ep('m2', 'Office PC A', 1, 'pc'), ep('m3', 'Office PC B', 1, 'pc'),
          ep('m4', 'Meeting room PC', 1, 'pc'), ep('m5', 'Printer', 1, 'printer'), ep('m6', 'File server', 1, 'server')
        ],
        scale: '6 devices need 15 cables. All 70 devices would need 2,415.'
      },
      bus: {
        pieces: [
          ep('b1', 'Office PCs 1-5', 5, 'pc'), ep('b2', 'Office PCs 6-10', 5, 'pc'),
          ep('b3', 'Reception PC', 1, 'pc'), ep('b4', 'Printer', 1, 'printer')
        ],
        extra: 'A coax bus has no answer for the 60 wireless devices. That alone rules it out here.'
      },
      cost: { gateway: 'pro', ups: 'upsRack', users: 40, tb: 2, note: 'Forty Microsoft 365 seats assumed (10 office staff, 30 sales reps).' }
    },

    {
      id: 'restaurant', samples: ['3'],
      title: 'Restaurant point of sale',
      client: 'The restaurant owners',
      tagline: 'Five POS stations, a kitchen display, three manager laptops',
      brief: 'A restaurant needs a network for waitstaff to enter orders at 5 point-of-sale systems, print customer tickets and receipts, show orders on a kitchen monitor, and support 3 management laptops. The owners want to hear how you plan, configure and secure it, and how you keep it fast.',
      facts: [
        '5 point-of-sale systems for waitstaff',
        'Printers for customer tickets and receipts',
        '1 monitor that displays orders to the kitchen',
        '3 laptops for management'
      ],
      cover: ['Planning, configuration and topology', 'Security systems', 'Managing users, groups and printers', 'Segmenting and balancing load, and how many servers', 'Optional: port numbers, backup and recovery, peer-to-peer versus server-based, VLANs'],
      assume: 'Two ticket and receipt printers are assumed; the prompt gives no count.',
      vlanNames: { 10: 'Managers', 20: 'Guest', 30: 'POS', 40: 'Devices' },
      talk: { place: 'the restaurant', guests: 'anyone on the Wi-Fi', sensitive: 'the POS and card data', rule: 'PCI DSS' },
      star: {
        endpoints: [
          ep('pos', 'POS terminals', 5, 'pos', 'wired', [30]),
          ep('rprint', 'Ticket + receipt printers', 2, 'printer', 'wired', [30, 40], { assumed: true }),
          ep('kds', 'Kitchen display', 1, 'display', 'wired', [30, 40]),
          ep('mgr', 'Manager laptops', 3, 'laptop', 'wifi', [10])
        ],
        aps: { draw: 1, real: 1 }, access: 0, servers: 0, nas: true,
        why: [
          'POS terminals are wired: an order that drops during the dinner rush costs money, and wired is faster and harder to intercept.',
          'The POS VLAN only talks to the payment processor. That segmentation is a PCI DSS requirement and it also keeps the load balanced: order traffic never competes with a manager streaming video.',
          'How many servers: none. One NAS for backups is enough at this size, and logins live in the cloud. That is the server-based model without owning a server.',
          'The 5G backup line means card payments still clear when the main line is down.'
        ]
      },
      mesh: {
        unit: 'device', cables: ['cat6', 'cat6a'],
        nodes: [
          ep('m1', 'POS 1', 1, 'pos'), ep('m2', 'POS 2', 1, 'pos'), ep('m3', 'POS 3', 1, 'pos'),
          ep('m4', 'POS 4', 1, 'pos'), ep('m5', 'POS 5', 1, 'pos'), ep('m6', 'Kitchen display', 1, 'display')
        ],
        scale: '6 devices need 15 cables, and every POS would need 5 network ports.'
      },
      bus: {
        pieces: [
          ep('b1', 'POS 1-3', 3, 'pos'), ep('b2', 'POS 4-5', 2, 'pos'),
          ep('b3', 'Kitchen display', 1, 'display'), ep('b4', 'Receipt printer', 1, 'printer')
        ]
      },
      cost: { gateway: 'ucg', ups: 'upsSmall', users: 3, tb: 1, note: 'Three Microsoft 365 seats, one per manager.' }
    },

    {
      id: 'clinic', samples: ['4', '5'],
      title: 'Outpatient health center',
      client: 'The health center owners',
      tagline: '410 devices across departments, patient privacy first',
      brief: 'An outpatient health center with several departments is upgrading its infrastructure. Patient confidentiality is the top priority under federal rules. Samples 4 and 5 describe the same clinic; Sample 5 adds one challenge: explain the impact of modifying, adding or removing network services.',
      facts: [
        '200 desktops, 100 laptops, 50 tablets',
        '50 medical devices that need internet, 10 on-demand label printers',
        '410 devices in total, across multiple departments',
        'Must comply with federal patient privacy rules (HIPAA)'
      ],
      cover: ['Steps for determining design needs', 'Services and protocols', 'Topology', 'File and device naming conventions', 'Security systems', 'Managing users, groups and printers', 'Remote connectivity', 'Monitoring for rogue devices, VPN servers and access points', 'Backup and disaster recovery', 'Number of servers and balancing load', 'Sample 5: impact of changing services'],
      assume: null,
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'Records', 40: 'Medical + printers' },
      talk: { place: 'the clinic', guests: 'unknown devices', sensitive: 'patient records', rule: 'HIPAA' },
      star: {
        endpoints: [
          ep('desk', 'Desktops', 200, 'pc', 'wired', [10]),
          ep('med', 'Medical devices', 50, 'medical', 'wired', [40]),
          ep('label', 'Label printers', 10, 'printer', 'wired', [40]),
          ep('lap', 'Laptops', 100, 'laptop', 'wifi', [10]),
          ep('tab', 'Tablets', 50, 'tablet', 'wifi', [10])
        ],
        aps: { draw: 2, real: 6 }, access: 2, servers: 2, nas: true, fastUplink: true,
        remote: { label: 'Clinicians at home', sub: 'client VPN + MFA' },
        why: [
          'At 410 devices one switch is not enough. This is an extended star: a core switch, with an access switch in each department closet linked back over fiber or Cat6A. On the chart, two access switches stand in for about eight.',
          'Fast uplinks between switches remove the cable bottleneck the prompt asks about.',
          'Two servers share the records and login load, so one can fail or be patched without stopping the clinic.',
          'Medical devices and label printers get their own VLAN: they are hard to patch, so they are fenced off from patient records.',
          'An unknown device plugged into a wall jack lands on a quarantine VLAN (802.1X). That is how you answer "rogue devices."'
        ]
      },
      mesh: {
        unit: 'closet', cables: ['fiber', 'cat6a'],
        nodes: [
          { id: 'm1', label: 'Closet A', kind: 'switch' }, { id: 'm2', label: 'Closet B', kind: 'switch' },
          { id: 'm3', label: 'Closet C', kind: 'switch' }, { id: 'm4', label: 'Closet D', kind: 'switch' },
          { id: 'm5', label: 'Closet E', kind: 'switch' }
        ],
        scale: '5 department closets need 10 fiber runs. All 410 devices would need 83,845 cables.'
      },
      bus: {
        pieces: [
          ep('b1', 'Desktops, wing A', 100, 'pc'), ep('b2', 'Desktops, wing B', 100, 'pc'),
          ep('b3', 'Medical devices', 50, 'medical'), ep('b4', 'Label printers', 10, 'printer')
        ],
        extra: 'A 10BASE2 segment tops out at 30 devices and 185 meters. 410 devices on a bus is not even possible, let alone secure.'
      },
      cost: { gateway: 'beast', ups: 'upsRack', users: null, tb: 10, note: 'At this size the switches would be 48-port models and the firewall a Fortinet pair; these 24-port prices give a floor, not a quote. Software: Microsoft 365 Business Premium at $22 per user per month.' }
    },

    {
      id: 'lawbranch', samples: ['6'],
      title: 'Law firm: new branch office',
      client: "The firm's senior management",
      tagline: 'One new branch that has to fit the existing firm',
      brief: 'A regional law firm is opening a branch office and wants a reliable, secure network that connects seamlessly with its existing systems. Legal documents must be backed up, and there must be a disaster recovery plan.',
      facts: [
        'New branch office joining existing systems',
        'Remote access for the branch without weakening security',
        'Backups for critical legal documents',
        'Disaster recovery with minimal downtime',
        'File sharing, email and printer access',
        'Ongoing maintenance and troubleshooting'
      ],
      cover: ['Remote access with data security', 'Disaster recovery plan', 'Backup solution', 'Configuring internet resources for both offices', 'Key resources and services', 'The network administrator\'s role after install'],
      assume: 'The prompt gives no device counts. Assume about 20 people (8 desktops, 12 laptops, 1 copier) and say so out loud.',
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'Client files', 40: 'Printers' },
      talk: { place: 'the branch', guests: 'visitors', sensitive: 'client files', rule: 'attorney-client confidentiality' },
      star: {
        endpoints: [
          ep('desk', 'Staff desktops', 8, 'pc', 'wired', [10], { assumed: true }),
          ep('copier', 'Copier / printer', 1, 'printer', 'wired', [40], { assumed: true }),
          ep('lap', 'Attorney laptops', 12, 'laptop', 'wifi', [10], { assumed: true })
        ],
        aps: { draw: 1, real: 1 }, access: 0, servers: 0, nas: true,
        sites: [{ id: 'main', label: 'Main office', sub: 'existing systems' }],
        remote: { label: 'Attorneys at home', sub: 'client VPN + MFA' },
        why: [
          'The site-to-site tunnel to the main office is what makes the branch "connect seamlessly": same logins, same file shares, same email.',
          'Legal documents follow 3-2-1: the NAS on site, an encrypted cloud copy off-site.',
          'Remote access is a client VPN with multi-factor login, never an open remote-desktop port.',
          'Email lives in Microsoft 365, so there is no mail server to maintain at the branch.'
        ]
      },
      mesh: {
        unit: 'device', cables: ['cat6', 'cat6a'],
        nodes: [
          ep('m1', 'Reception PC', 1, 'pc'), ep('m2', 'Attorney office 1', 1, 'pc'), ep('m3', 'Attorney office 2', 1, 'pc'),
          ep('m4', 'Paralegal desk', 1, 'pc'), ep('m5', 'Copier', 1, 'printer'), ep('m6', 'File server', 1, 'server')
        ],
        scale: '6 devices need 15 cables. Twenty people would need 190.'
      },
      bus: {
        pieces: [
          ep('b1', 'Staff desktops 1-4', 4, 'pc'), ep('b2', 'Staff desktops 5-8', 4, 'pc'),
          ep('b3', 'Copier', 1, 'printer'), ep('b4', 'File server', 1, 'server')
        ]
      },
      cost: { gateway: 'ucg', ups: 'upsSmall', users: 20, tb: 2, note: 'Twenty Microsoft 365 seats assumed. For client files, swap in the Fortinet firewall (Package B).' }
    },

    {
      id: 'lawthree', samples: ['7'],
      title: 'Law firm: third office',
      client: "The firm's senior management",
      tagline: 'Three offices, one secure network that can grow',
      brief: 'A regional law firm with two offices is opening a third. It handles sensitive client data and wants secure access across all three branches, safe backups, a disaster recovery plan, and remote access for attorneys who work between locations.',
      facts: [
        'Two existing offices plus one new location',
        'Secure data access across all three',
        'Secure backups for legal documents',
        'Disaster recovery that minimizes downtime and data loss',
        'Attorneys move between offices and work remotely',
        'Must handle growth and more traffic'
      ],
      cover: ['Secure access across three branches', 'Backup solution', 'Disaster recovery plan', 'Internet resources for collaboration', 'Key resources and services', 'Future growth', 'The network administrator\'s role'],
      assume: 'The prompt gives no device counts. Assume about 20 people at the new office (8 desktops, 12 laptops, 1 copier) and say so.',
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'Client files', 40: 'Printers' },
      talk: { place: 'the firm', guests: 'visitors', sensitive: 'client files', rule: 'attorney-client confidentiality' },
      star: {
        endpoints: [
          ep('desk', 'Staff desktops', 8, 'pc', 'wired', [10], { assumed: true }),
          ep('copier', 'Copier / printer', 1, 'printer', 'wired', [40], { assumed: true }),
          ep('lap', 'Attorney laptops', 12, 'laptop', 'wifi', [10], { assumed: true })
        ],
        aps: { draw: 1, real: 1 }, access: 0, servers: 0, nas: true,
        sites: [{ id: 'o1', label: 'Office 1 (main)' }, { id: 'o2', label: 'Office 2' }],
        wanMesh: ['o1', 'o2'],
        remote: { label: 'Attorneys on the road', sub: 'client VPN + MFA' },
        why: [
          'With only three sites, a full mesh between offices costs just three tunnels, so we take it: any one office can go dark and the other two still reach each other.',
          'That is the "redundant core" idea in one picture: a star inside each office, mesh only between the sites.',
          'A fourth office later means three more tunnels. Past five or six sites you would switch to hub-and-spoke.',
          'Legal documents follow 3-2-1: NAS on site, encrypted cloud copy off-site.'
        ]
      },
      mesh: {
        unit: 'site', cables: ['vpn', 'wan', 'fiber'],
        nodes: [
          { id: 'm1', label: 'Office 1', kind: 'site' }, { id: 'm2', label: 'Office 2', kind: 'site' },
          { id: 'm3', label: 'Office 3 (new)', kind: 'site' }, { id: 'm4', label: 'Cloud recovery site', kind: 'site' }
        ],
        scale: '4 sites need 6 tunnels. At the device level, twenty people would need 190 cables.'
      },
      bus: {
        pieces: [
          ep('b1', 'Staff desktops 1-4', 4, 'pc'), ep('b2', 'Staff desktops 5-8', 4, 'pc'),
          ep('b3', 'Copier', 1, 'printer'), ep('b4', 'File server', 1, 'server')
        ]
      },
      cost: { gateway: 'ucg', ups: 'upsSmall', users: 20, tb: 2, note: 'Twenty Microsoft 365 seats assumed for the new office.' }
    },

    {
      id: 'telehealth', samples: ['8'],
      title: 'Outpatient clinic + hospital',
      client: "The healthcare provider's management team",
      tagline: 'A new clinic that plugs into the hospital and runs telehealth',
      brief: 'A growing regional healthcare provider is opening an outpatient clinic. Its network has to integrate with the existing hospital system, keep patient data secure, back up medical records, recover quickly from a disaster, and carry telehealth video reliably.',
      facts: [
        'New outpatient clinic joining an existing hospital system',
        'Secure access to patient data across locations',
        'Backup for medical records and a disaster recovery plan',
        'Internet configured for reliable telehealth',
        'Secure file sharing, printers, telehealth equipment',
        'Room to grow; healthcare compliance'
      ],
      cover: ['Secure multi-site access to patient data', 'Backup solution', 'Disaster recovery plan', 'Internet resources for telehealth', 'Key resources and services', 'Scalability', 'The administrator\'s role, including compliance'],
      assume: 'The prompt gives no device counts. Assume 6 exam-room PCs, 4 telehealth stations, 10 staff laptops, 8 medical devices and a waiting-room guest network, and say so.',
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'Telehealth', 40: 'Medical + printers' },
      talk: { place: 'the clinic', guests: 'patients on guest Wi-Fi', sensitive: 'patient records', rule: 'HIPAA' },
      star: {
        endpoints: [
          ep('exam', 'Exam room PCs', 6, 'pc', 'wired', [10], { assumed: true }),
          ep('tele', 'Telehealth stations', 4, 'display', 'wired', [30], { assumed: true }),
          ep('med', 'Medical devices', 8, 'medical', 'wired', [40], { assumed: true }),
          ep('lap', 'Staff laptops', 10, 'laptop', 'wifi', [10], { assumed: true }),
          ep('guest', 'Patient phones', null, 'phone', 'wifi', [20], { assumed: true })
        ],
        aps: { draw: 2, real: 2 }, access: 0, servers: 0, nas: true,
        sites: [{ id: 'hosp', label: 'Hospital', sub: 'existing system', cables: ['vpn', 'fiber', 'wan'] }],
        why: [
          'Telehealth stations are wired and on their own VLAN so the firewall can give video priority (QoS). A frozen video visit is the failure the client will remember.',
          'The backup internet line matters most here: telehealth stops the moment the internet does.',
          'The tunnel to the hospital is how the clinic reaches the existing records system. Every hop is encrypted, which is what HIPAA expects.',
          'Patients in the waiting room get a guest VLAN with internet only.'
        ]
      },
      mesh: {
        unit: 'site', cables: ['vpn', 'wan', 'fiber'],
        nodes: [
          { id: 'm1', label: 'New clinic', kind: 'site' }, { id: 'm2', label: 'Hospital', kind: 'site' },
          { id: 'm3', label: 'Cloud recovery site', kind: 'site' }, { id: 'm4', label: 'Future clinic', kind: 'site' }
        ],
        scale: '4 sites need 6 links. Each clinic the provider adds makes the next one more expensive.'
      },
      bus: {
        pieces: [
          ep('b1', 'Exam room PCs 1-3', 3, 'pc'), ep('b2', 'Exam room PCs 4-6', 3, 'pc'),
          ep('b3', 'Telehealth stations', 4, 'display'), ep('b4', 'Medical devices', 8, 'medical')
        ],
        extra: 'Telehealth video on shared bus bandwidth would stutter the moment anyone else used the network.'
      },
      cost: { gateway: 'ucg', ups: 'upsRack', users: 20, tb: 2, note: 'Twenty Microsoft 365 seats assumed. For patient data, swap in the Fortinet firewall (Package B).' }
    },

    {
      id: 'cafe', samples: ['9'],
      title: "Jordan's café",
      client: 'Jordan, the owner',
      tagline: 'Customer Wi-Fi and a secure POS, with no IT staff',
      brief: 'Jordan owns a local café and wants Wi-Fi that customers can use while the point-of-sale system stays secure. There is no IT staff, and Jordan is worried about cost and reliability.',
      facts: [
        'Customer Wi-Fi and a secure point-of-sale system on the same site',
        'No IT staff',
        'Cost and reliability are the worries'
      ],
      cover: ['Separate secure and guest networks', 'Security practices that protect sales data', 'How basic administration keeps it running with limited staff', 'A plan that balances performance, cost and reliability'],
      assume: 'The prompt gives no device counts. Assume 2 POS terminals, 1 receipt printer and 1 owner laptop, and say so.',
      vlanNames: { 10: 'Staff', 20: 'Guest', 30: 'POS', 40: 'Devices' },
      talk: { place: 'the café', guests: 'customers', sensitive: 'the POS and card data', rule: 'PCI DSS' },
      star: {
        endpoints: [
          ep('pos', 'POS terminals', 2, 'pos', 'wired', [30], { assumed: true }),
          ep('rprint', 'Receipt printer', 1, 'printer', 'wired', [30, 40], { assumed: true }),
          ep('owner', 'Owner laptop', 1, 'laptop', 'wifi', [10], { assumed: true }),
          ep('guest', 'Customer phones + laptops', null, 'phone', 'wifi', [20])
        ],
        aps: { draw: 1, real: 2 }, access: 0, servers: 0, nas: false,
        why: [
          'Customers and the POS share one access point but never one network: the guest VLAN gets internet only, with devices unable to see each other.',
          'No NAS here on purpose. A café POS keeps its data with the POS provider, so cloud backup covers it and Jordan has one less box to look after.',
          'No IT staff, so everything is cloud-managed from one app with automatic updates and alerts.',
          'The 5G backup line is the reliability answer: card payments keep working when the main line drops.'
        ]
      },
      mesh: {
        unit: 'device', cables: ['cat6', 'cat6a', 'wifi'],
        nodes: [
          ep('m1', 'POS 1', 1, 'pos'), ep('m2', 'POS 2', 1, 'pos'), ep('m3', 'Receipt printer', 1, 'printer'),
          ep('m4', 'Owner laptop', 1, 'laptop'), ep('m5', 'Back-office PC', 1, 'pc')
        ],
        scale: '5 devices need 10 links, and there is still nowhere to put the customers.'
      },
      bus: {
        pieces: [
          ep('b1', 'POS 1', 1, 'pos'), ep('b2', 'POS 2', 1, 'pos'),
          ep('b3', 'Receipt printer', 1, 'printer'), ep('b4', 'Back-office PC', 1, 'pc')
        ],
        extra: 'Customers bring phones. A coax bus cannot serve a single one of them.'
      },
      cost: { gateway: 'ucg', ups: 'upsSmall', users: 2, tb: 1, note: 'Two Microsoft 365 seats assumed (owner and manager).' }
    },

    {
      id: 'district', samples: ['10'],
      title: 'Small school district',
      client: 'Casey, the superintendent',
      tagline: 'Several campuses, heavy demand, limited budget',
      brief: 'A small school district has slow speeds, limited access for students and security concerns. Casey wants an upgrade that supports online learning, secures staff records and gives classrooms reliable connectivity, all within a limited budget.',
      facts: [
        'Multiple campuses with high user demand',
        'Online learning and reliable classroom connectivity',
        'Secure staff records; manage student and staff access separately',
        'VPNs, access control and cloud tools',
        'Limited budget, long-term scalability'
      ],
      cover: ['Planning for multiple campuses', 'Managing student and staff access', 'Security and recovery for sensitive data', 'Protocols and services that support education', 'Budget awareness with long-term scalability'],
      assume: 'The prompt gives no counts. Assume three campuses and draw one in detail. Say that E-rate can discount the equipment and internet.',
      vlanNames: { 10: 'Staff', 20: 'Students', 30: 'Records', 40: 'Devices' },
      talk: { place: 'the district', guests: 'students', sensitive: 'staff and student records', rule: 'FERPA and CIPA' },
      star: {
        endpoints: [
          ep('office', 'Office + lab PCs', null, 'pc', 'wired', [10]),
          ep('print', 'Printers + displays', null, 'printer', 'wired', [40]),
          ep('teach', 'Teacher laptops', null, 'laptop', 'wifi', [10]),
          ep('chrome', 'Student Chromebooks', null, 'laptop', 'wifi', [20])
        ],
        aps: { draw: 2, real: 0 }, access: 2, servers: 1, nas: true, fastUplink: true,
        sites: [{ id: 'c2', label: 'Campus 2', cables: ['vpn', 'fiber', 'wan'] }, { id: 'c3', label: 'Campus 3', cables: ['vpn', 'fiber', 'wan'] }],
        why: [
          'Slow speeds usually come from old copper between buildings. Fiber or Cat6A between the core and each classroom-wing switch fixes that first.',
          'Students and staff share the same access points but land on different VLANs. Student devices get filtered internet only, which also satisfies CIPA.',
          'The staff records server sits behind the firewall on its own VLAN, reachable only by staff accounts.',
          'Budget: cloud tools are free for schools, and E-rate discounts the switches, access points and internet.'
        ]
      },
      mesh: {
        unit: 'site', cables: ['vpn', 'wan', 'fiber'],
        nodes: [
          { id: 'm1', label: 'District office', kind: 'site' }, { id: 'm2', label: 'Campus 1', kind: 'site' },
          { id: 'm3', label: 'Campus 2', kind: 'site' }, { id: 'm4', label: 'Campus 3', kind: 'site' },
          { id: 'm5', label: 'Cloud data center', kind: 'site' }
        ],
        scale: '5 sites need 10 links. Leased fiber for all ten would eat the whole budget.'
      },
      bus: {
        pieces: [
          ep('b1', 'Classroom PCs, wing A', null, 'pc'), ep('b2', 'Classroom PCs, wing B', null, 'pc'),
          ep('b3', 'Office PCs', null, 'pc'), ep('b4', 'Printer', 1, 'printer')
        ],
        extra: 'The district already complains about slow speeds. A shared bus is the slowest layout there is.'
      },
      cost: null
    }
  ];

  /* ---- Field guide: topologies ---------------------------------------- */
  TL.TOPOLOGIES = [
    { id: 'bus', name: 'Bus', links: '1 backbone', pros: 'Least cable, cheapest to wire. Simple for a tiny, temporary setup.', cons: 'One break stops everything. Shared bandwidth slows as you add users. No VLANs, so no way to separate guests from sensitive data.', fit: 'A legacy lab, or as the option you rule out.' },
    { id: 'star', name: 'Star', links: 'n', pros: 'One bad cable affects one device. One point to secure and monitor. Easy to add a user. The Ethernet standard.', cons: 'The central switch is a single point of failure. More cable than a bus.', fit: 'Almost every office, school, clinic and store.' },
    { id: 'mesh', name: 'Full mesh', links: 'n(n-1)/2', pros: 'Maximum redundancy: traffic reroutes around any failure. Shortest paths.', cons: 'Cost and complexity explode. 25 devices need 300 cables.', fit: 'Links between a few critical sites, data center cores.' },
    { id: 'tree', name: 'Extended star (tree)', links: 'n + uplinks', pros: 'Stars linked to a core switch. Scales by floor, wing or building.', cons: 'A failed uplink isolates a whole branch unless it is doubled.', fit: 'Clinics, campuses, anything past one closet.' },
    { id: 'partial', name: 'Partial mesh', links: 'a few extra', pros: 'Redundancy only where downtime is expensive.', cons: 'More design work than a plain star.', fit: 'Our pick at the core and between sites.' },
    { id: 'ring', name: 'Ring', links: 'n', pros: 'Predictable traffic; a dual ring survives one break.', cons: 'A single ring stops on one break. Rare in offices.', fit: 'Metro fiber and some industrial networks.' }
  ];

  /* ---- Quiz ------------------------------------------------------------ */
  TL.QUIZ = [
    { q: 'Which topology runs every device to one central switch?', a: ['Star', 'Bus', 'Ring', 'Full mesh'], why: 'Star. Each device has its own home run to the switch.' },
    { q: 'How many links does a full mesh of n nodes need?', a: ['n(n-1)/2', 'n', 'n-1', '2n'], why: 'Every node pairs with every other node once: n(n-1)/2.' },
    { q: 'A full mesh between 5 sites needs how many tunnels?', a: ['10', '5', '20', '4'], why: '5 x 4 / 2 = 10.' },
    { q: 'A full mesh of 25 devices needs how many cables?', a: ['300', '25', '50', '625'], why: '25 x 24 / 2 = 300. At about $200 a drop that is $60,000 in cabling.' },
    { q: 'On a bus, what happens when the backbone breaks?', a: ['The whole segment goes down', 'Only the nearest device drops', 'Traffic reroutes the other way', 'Nothing, until a second break'], why: 'The break leaves two unterminated ends, signals reflect, and the whole segment fails.' },
    { q: 'What goes on each end of a bus backbone?', a: ['A terminator', 'A switch', 'A repeater', 'An access point'], why: 'A 50-ohm terminator absorbs the signal so it does not bounce back.' },
    { q: 'What is the biggest weakness of a star, and the fix?', a: ['The central switch is a single point of failure; add a UPS, a spare and a second uplink', 'It needs terminators; add two', 'It cannot use VLANs; add a hub', 'It shares bandwidth; add coax'], why: 'One switch failing stops the site, and that risk costs a few hundred dollars to remove.' },
    { q: 'How far can a Cat6 run go at 1 Gbps?', a: ['100 meters', '55 meters', '185 meters', '300 meters'], why: '100 m for copper Ethernet. Cat6 only holds 10 Gbps to about 55 m.' },
    { q: 'Which copper cable carries 10 Gbps for the full 100 meters?', a: ['Cat6A', 'Cat5e', 'Cat6', 'RG-6 coax'], why: 'Cat6A. Cat6 only manages 10 Gbps to about 55 m.' },
    { q: 'Two buildings are 2 km apart. Which cable links them?', a: ['Single-mode fiber', 'Cat6A', 'Multimode fiber', 'Coax'], why: 'Single-mode fiber runs 10 km and more. Multimode stops around 300 to 400 m at 10 Gbps.' },
    { q: 'Which of these cannot power an access point?', a: ['Fiber', 'Cat6', 'Cat6A', 'Cat5e'], why: 'PoE needs copper. Fiber carries light, not electricity.' },
    { q: 'PoE+ is which standard, and how many watts per port?', a: ['802.3at, 30 W', '802.3af, 15.4 W', '802.3bt, 90 W', '802.11be, 30 W'], why: '802.3af is 15.4 W, 802.3at (PoE+) is 30 W, 802.3bt reaches 60 to 90 W.' },
    { q: 'Which device forwards frames by MAC address?', a: ['Switch', 'Router', 'Modem', 'Firewall'], why: 'A switch works at Layer 2 and learns which MAC address is on which port.' },
    { q: 'Which device moves packets between networks by IP address?', a: ['Router', 'Switch', 'Hub', 'Access point'], why: 'A router works at Layer 3.' },
    { q: 'Why would you never specify a hub?', a: ['It repeats traffic to every port: shared bandwidth and no security', 'It needs fiber', 'It only works with Wi-Fi', 'It costs more than a switch'], why: 'A hub is one collision domain. A managed switch replaces it.' },
    { q: 'What connects Wi-Fi devices to the wired network?', a: ['An access point', 'A terminator', 'A modem', 'A UPS'], why: 'The access point bridges radio clients onto the switch.' },
    { q: 'About how many wireless users per access point?', a: ['25 to 30', '5 to 10', '100 to 150', '250'], why: 'Plan about 25 to 30 active users each, and more access points in metal buildings.' },
    { q: 'Wi-Fi 7 is which IEEE standard?', a: ['802.11be', '802.11ax', '802.11ac', '802.3bt'], why: '802.11n is Wi-Fi 4, ac is 5, ax is 6 and 6E, be is 7.' },
    { q: 'Which wireless security should you recommend?', a: ['WPA3', 'WEP', 'WPA', 'An open network with a hidden name'], why: 'WEP is broken and WPA is deprecated. WPA2 is the minimum, WPA3 the recommendation.' },
    { q: 'How do you keep café customers off the POS?', a: ['Separate VLANs with firewall rules between them', 'A longer Wi-Fi password', 'A hub for the POS', 'Turn off DHCP'], why: 'Guest and POS traffic live on different VLANs and the firewall blocks traffic between them.' },
    { q: 'What does the 3-2-1 backup rule mean?', a: ['3 copies, 2 kinds of media, 1 off-site', '3 servers, 2 switches, 1 firewall', '3 backups a day, 2 a week, 1 a month', '3 sites, 2 tunnels, 1 hub'], why: 'Three copies of the data, on two types of media, with one copy off-site.' },
    { q: 'RPO measures what?', a: ['How much data you can afford to lose', 'How long you can be down', 'How many backups you keep', 'How fast the internet is'], why: 'Recovery point objective: an RPO of 1 hour means you lose at most an hour of work.' },
    { q: 'RTO measures what?', a: ['How long you can be down', 'How much data you can lose', 'How many users can log in', 'How long a backup takes'], why: 'Recovery time objective: how quickly you must be running again.' },
    { q: 'How does a UPS connect to the switch?', a: ['A power cord', 'Cat6', 'Fiber', 'A VPN tunnel'], why: 'It is a battery. It supplies power, not data.' },
    { q: 'An IPS differs from an IDS because it...', a: ['Blocks the attack, not just reports it', 'Works only on Wi-Fi', 'Replaces the firewall', 'Encrypts backups'], why: 'Detection alerts you. Prevention sits inline and stops the traffic.' },
    { q: 'Which port should never be open to the internet?', a: ['3389 (remote desktop)', '443 (HTTPS)', '53 (DNS)', '80 (HTTP)'], why: 'Exposed RDP is a favorite way in for ransomware. Use a VPN instead.' },
    { q: 'Which port carries HTTPS?', a: ['443', '80', '22', '25'], why: '443 is HTTPS, 80 is HTTP, 22 is SSH, 25 is SMTP.' },
    { q: 'What does DHCP do?', a: ['Hands out IP addresses automatically', 'Turns names into IP addresses', 'Encrypts Wi-Fi', 'Blocks malicious sites'], why: 'Discover, Offer, Request, Acknowledge: DORA.' },
    { q: 'A laptop shows 169.254.x.x. What happened?', a: ['It could not reach a DHCP server', 'It is on the guest VLAN', 'It has a static address', 'It is using a VPN'], why: 'That is an automatic private address (APIPA), the fallback when DHCP fails.' },
    { q: 'How many usable addresses are in a /24?', a: ['254', '256', '126', '510'], why: '2 to the 8th is 256, minus the network and broadcast addresses.' },
    { q: 'What joins two offices securely over the public internet?', a: ['A site-to-site VPN', 'A longer Cat6 run', 'A coax backbone', 'A second access point'], why: 'An encrypted IPsec or WireGuard tunnel between the two gateways.' },
    { q: 'Which rule applies to a restaurant taking cards?', a: ['PCI DSS', 'HIPAA', 'FERPA', 'CIPA'], why: 'PCI DSS covers card data. It expects the POS on its own network segment.' },
    { q: 'Which rule protects patient records?', a: ['HIPAA', 'PCI DSS', 'FERPA', 'E-rate'], why: 'HIPAA: encrypt patient data and log who accesses it.' },
    { q: 'Which rule protects student records?', a: ['FERPA', 'HIPAA', 'PCI DSS', 'WPA3'], why: 'FERPA covers student records. CIPA requires content filtering for schools that take E-rate discounts.' },
    { q: 'Wi-Fi in a metal warehouse needs what?', a: ['A site survey and more access points', 'Fewer access points', 'A hub in each office', 'Coax between access points'], why: 'Metal blocks and reflects radio, so coverage needs more access points placed by survey.' },
    { q: 'A clinic has 410 devices. Which layout fits?', a: ['An extended star: a core switch with an access switch per closet', 'One 24-port switch', 'A coax bus per department', 'A full mesh of every device'], why: 'An extended star scales by adding access switches, linked to the core with fiber or Cat6A.' },
    { q: 'When does peer-to-peer make sense?', a: ['Two to five devices with no central security needs', 'Any office under 100 people', 'Whenever there is a server', 'Only on fiber'], why: 'It has no central logins, policies or backups, so it stops scaling almost at once.' },
    { q: 'Which phrase sums up Zero Trust?', a: ['Never trust, always verify', 'Trust the LAN, check the WAN', 'Block everything by default', 'Encrypt first, ask later'], why: 'Never trust, always verify: check every user and device, grant least privilege, assume breach.' },
    { q: 'In hub-and-spoke between sites, what is the weak point?', a: ['The hub site', 'Every spoke equally', 'The newest site', 'There is none'], why: 'Every branch depends on the hub. A second internet line at the hub, or a few direct links, fixes it.' },
    { q: 'Three offices in a full mesh need how many tunnels?', a: ['3', '6', '9', '2'], why: '3 x 2 / 2 = 3. With so few sites, meshing the WAN is cheap.' }
  ];

  /* Ranks: total points earned across every board plus the quiz. */
  TL.RANKS = [
    { at: 0, name: 'Chapter member' },
    { at: 300, name: 'District competitor' },
    { at: 900, name: 'District champion' },
    { at: 1600, name: 'State qualifier' },
    { at: 2300, name: 'State champion' },
    { at: 2800, name: 'National champion' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
