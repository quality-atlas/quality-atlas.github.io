/* Exam 2 Written Part, version E2-v1 (frozen).
   Generates a personal company case from a participation code.
   The same code + version always produces exactly the same case, in any browser or in Node. */
(function (root) {
  "use strict";
  var VERSION = "E2-v1";

  // ---------- deterministic randomness ----------
  function hash32(str) {            // FNV-1a
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function makeRng(seed) {          // mulberry32
    var a = seed >>> 0;
    var r = function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    r.normal = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.shuffle = function (arr) { var a2 = arr.slice(); for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t2 = a2[i]; a2[i] = a2[j]; a2[j] = t2; } return a2; };
    return r;
  }
  function normCode(code) { return String(code || "").toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, ""); }
  function round(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function mean(a) { return sum(a) / a.length; }
  function sd(a) { var m = mean(a); return Math.sqrt(sum(a.map(function (x) { return (x - m) * (x - m); })) / (a.length - 1)); }

  // ---------- company templates ----------
  var T = [
    {
      key: "mixers", sec: [[0, 1], [1, 1], [4, 1], [0, 3], [1, 0]], company: "Northfield Appliances", product: "stand mixers", unit: "mixer",
      defects: [["Scratched housing", 1, 18, 40], ["Loose bowl lock", 2, 30, 70], ["Gearbox noise", 3, 160, 260], ["Speed control failure", 3, 190, 320],
                ["Wrong accessory packed", 1, 22, 45], ["Power cord damage", 2, 60, 110], ["Missing manual", 1, 4, 9], ["Paint blemish", 1, 15, 35]],
      problem: "Customers return mixers because the gearbox becomes noisy. The problem has been “fixed” several times in the last six months, but it keeps coming back.",
      fixes: ["replaced the gear set in each returned mixer", "re-greased every gearbox on the line for a week", "retrained two gearbox assemblers", "switched to a different grease brand", "added a 100% noise check at final test", "replaced the gearbox press fixture"],
      chain: ["Returned mixers are noisy because their gears wear quickly in normal use.",
              "The worn gears are softer than the drawing intends; almost all come from lots made on the supplier’s furnace line B.",
              "The supplier moved furnace line B last spring and never re-qualified its heat-treatment temperature profile.",
              "Our purchase contract and incoming inspection check gear dimensions only; the hardness requirement exists only as an old note on the engineering drawing.",
              "We have no procedure that makes sure every critical design requirement is written into supplier contracts and checked."],
      herrings: ["Night shift assembled 52% of the returned mixers (night shift builds 50% of all mixers).",
                 "Returns are slightly higher in the winter months, when sales are also higher."],
      spc: { name: "bowl-lock torque", unit: "N·m", target: 4.50, lsl: 4.20, usl: 4.80, sigma: 0.075, dec: 3 },
      needs: ["Mixes heavy dough without stalling", "Quiet operation", "Easy to clean", "Stays put on the counter", "Lasts for years"],
      hows: ["Motor power (W)", "Gear hardness (HRC)", "Number of sealed seams", "Base weight and suction feet", "Life-test hours"],
      extraNeed: "Available in more colors", extraHow: "Carton print quality",
      impede: [0, 4, "Raising motor power tends to shorten life-test hours (more heat and wear)."],
      support: [1, 4, "Harder gears support longer life-test results."],
      stations: ["Stamping", "Gearbox assembly", "Motor assembly", "Final assembly", "Pack and ship"],
      partner: { "Warehousing": "a catalog retailer famous for warehouse speed and accuracy", "Press changeover": "a packaging plant known for 5-minute die changes", "Incoming inspection": "a Baldrige-recipient auto supplier that certifies its suppliers", "Order processing": "a large online retailer", "Final test": "an aerospace electronics plant", "Supplier auditing": "a medical-device maker with a certified supplier base" }
    },
    {
      key: "bikes", sec: [[4, 0], [0, 4], [2, 1], [3, 4], [4, 3]], company: "Ridgeline Bicycles", product: "bicycles", unit: "bicycle",
      defects: [["Paint chips", 1, 25, 55], ["Misaligned brakes", 2, 30, 60], ["Wheel out of true", 2, 45, 90], ["Loose headset", 2, 35, 70],
                ["Frame weld crack", 3, 380, 620], ["Shifter misadjusted", 1, 20, 40], ["Missing reflectors", 1, 6, 12], ["Scratched rims", 1, 18, 38]],
      problem: "Rear-derailleur shifting goes out of adjustment within the first month of riding. Dealers complain, and the problem has been “fixed” several times.",
      fixes: ["re-adjusted the shifting on every bike in dealer stock", "added a second shifting check at final inspection", "retrained the final-assembly mechanics", "switched to a different cable lubricant", "issued a dealer bulletin on adjustment", "replaced the cable-cutting tool"],
      chain: ["Shifting drifts because the cable housing compresses (settles) under load during the first rides.",
              "Bikes that drift almost all use housing from the new low-cost supplier introduced in March.",
              "The new housing is a cheaper, non-compressionless type.",
              "Purchasing switched suppliers to cut cost; the purchase specification lists only length and color, not compression performance.",
              "Supplier selection is based on price alone; there is no procedure requiring functional requirements and trials before a supplier change."],
      herrings: ["One mechanic’s bikes are 18% of the drifting bikes; he builds 17% of all bikes.",
                 "Drifting is most common on the medium frame size, which is also the best-selling size."],
      spc: { name: "spoke tension", unit: "kgf", target: 120.0, lsl: 110.0, usl: 130.0, sigma: 2.8, dec: 2 },
      needs: ["Smooth, reliable shifting", "Light enough to carry", "Comfortable ride", "Stops confidently in the rain", "Easy to maintain at home"],
      hows: ["Shifting tolerance (mm)", "Frame weight (kg)", "Fit range of geometry", "Wet braking friction", "Tool-free adjustment points"],
      extraNeed: "Matches my car’s paint color", extraHow: "Decal gloss level",
      impede: [1, 2, "Lowering frame weight tends to reduce the comfort the frame can provide."],
      support: [0, 4, "Tighter shifting tolerance makes tool-free adjustment easier."],
      stations: ["Frame preparation", "Painting", "Wheel building", "Final assembly", "Pack and ship"],
      partner: { "Warehousing": "a catalog retailer famous for warehouse speed and accuracy", "Paint changeover": "a racing pit crew known for fast changeovers", "Incoming inspection": "a Baldrige-recipient auto supplier that certifies its suppliers", "Order processing": "a large online retailer", "Wheel building": "a motorcycle maker known for precision wheel lines", "Supplier auditing": "a medical-device maker with a certified supplier base" }
    },
    {
      key: "pumps", sec: [[1, 0], [4, 2], [0, 1], [4, 3]], company: "Bayside Medical", product: "infusion pumps", unit: "pump",
      defects: [["Display pixel defects", 1, 40, 80], ["Occlusion alarm fault", 3, 420, 700], ["Door latch misfit", 2, 55, 110], ["Label misprint", 1, 12, 25],
                ["Battery fails to hold charge", 3, 210, 340], ["Keypad sticking", 2, 45, 90], ["Scratched case", 1, 18, 35], ["Missing accessory kit", 1, 15, 30]],
      problem: "Hospitals report that occlusion (blockage) alarms trigger falsely during use. The problem has been “fixed” several times, but the reports continue.",
      fixes: ["re-calibrated the occlusion sensor on returned pumps", "added a software filter to delay alarms", "retrained hospital staff on tubing loading", "replaced sensors from one sensor lot", "added a 100% alarm test at final test", "re-trained final-test technicians"],
      chain: ["False alarms happen when the tubing wall is at the thin end of its tolerance.",
              "Thin-wall tubing comes mostly from the supplier’s second extrusion die.",
              "The supplier put the second die into service without a capability study.",
              "Our incoming inspection samples tubing length only, and our alarm threshold was validated using only mid-tolerance tubing.",
              "Our design-verification and supplier-change procedures do not require testing across the full tolerance range."],
      herrings: ["The three largest hospitals sent most reports; they also use 60% of all pumps.",
                 "At one hospital, two nurses submitted half of the reports."],
      spc: { name: "delivered flow at the 100 mL/h setting", unit: "mL/h", target: 100.0, lsl: 95.0, usl: 105.0, sigma: 1.25, dec: 2 },
      needs: ["Alarms I can trust", "Easy to program at the bedside", "Battery lasts a full shift", "Quick to clean between patients", "Light to carry"],
      hows: ["Occlusion sensor accuracy", "Menu steps per order", "Battery capacity (h)", "Sealed, smooth housing", "Device weight (kg)"],
      extraNeed: "Comes in hospital brand colors", extraHow: "Shipping-box print quality",
      impede: [2, 4, "A larger battery capacity tends to increase device weight."],
      support: [0, 1, "A more accurate sensor needs fewer confirmation steps in the menu."],
      stations: ["Circuit-board assembly", "Pump mechanism", "Display module", "Final assembly", "Test and pack"],
      partner: { "Warehousing": "a catalog retailer famous for warehouse speed and accuracy", "Line changeover": "a packaging plant known for 5-minute changeovers", "Incoming inspection": "a Baldrige-recipient auto supplier that certifies its suppliers", "Order processing": "a large online retailer", "Final functional test": "an aerospace electronics plant", "Supplier auditing": "a Baldrige-recipient auto supplier with a certified supplier base" }
    },
    {
      key: "snacks", sec: [[3, 0], [2, 1], [0, 3], [1, 2]], company: "Harbor Foods", product: "bagged snacks", unit: "bag",
      defects: [["Underweight bag", 1, 2, 5], ["Seal leak", 2, 9, 18], ["Broken product", 1, 1, 3], ["Wrong date code", 2, 12, 25],
                ["Foreign material", 3, 900, 1500], ["Label misplaced", 1, 1, 3], ["Crushed carton", 1, 6, 12], ["Off-flavor", 2, 20, 40]],
      problem: "Bags leak at the seal, so chips go stale on store shelves. The problem has been “fixed” several times on the bagging line, but it keeps returning.",
      fixes: ["reworked and re-sealed the leaking cases", "slowed the bagging line for a week", "retrained bagging operators", "replaced the sealing jaws", "added an extra leak check every hour", "cleaned the jaws twice per shift"],
      chain: ["Leaking bags have wrinkles (channels) across the seal.",
              "Wrinkled seals happen mostly in the first 40 minutes after a film-roll change.",
              "After a roll change, operators set jaw temperature by feel; the new supplier’s film needs about 8 °C more heat than the old film.",
              "Nobody updated the work instructions or settings when the film supplier changed.",
              "We have no change-management procedure linking material changes to process settings and standards."],
      herrings: ["Leaks are slightly higher on Mondays, when volume is also highest.",
                 "Line 2 has 55% of the leaks and runs 54% of the volume."],
      spc: { name: "bag fill weight", unit: "g", target: 170.0, lsl: 165.0, usl: 175.0, sigma: 1.3, dec: 2 },
      needs: ["Stays fresh after opening", "Bag isn’t half air", "Chips arrive whole", "Easy to open", "Clear nutrition labeling"],
      hows: ["Seal strength (N/15 mm)", "Fill-to-volume ratio", "Drop-test breakage (%)", "Tear-notch opening force", "Label legibility score"],
      extraNeed: "More flavors in the store", extraHow: "Pallet wrap color",
      impede: [1, 2, "Filling bags fuller (less air) tends to raise breakage in drop tests."],
      support: [0, 3, "A well-designed tear notch lets seal strength stay high without making bags hard to open."],
      stations: ["Frying", "Seasoning", "Bagging", "Case packing", "Palletizing"],
      partner: { "Warehousing": "a catalog retailer famous for warehouse speed and accuracy", "Flavor changeover": "a racing pit crew known for fast changeovers", "Incoming inspection": "a Baldrige-recipient auto supplier that certifies its suppliers", "Order processing": "a large online retailer", "Sanitation": "a hospital known for infection-control practice", "Supplier auditing": "a Baldrige-recipient auto supplier with a certified supplier base" }
    }
  ];

  // ---------- question 5 problem pool ----------
  function q5Pool(r, t) {
    var lead = r.int(9, 21), hands = r.int(4, 9), queues = r.int(5, 9);
    var ppm = r.int(9, 26) * 1000, inputs = r.int(5, 8);
    var cap = r.int(140, 260), idle = r.int(25, 45);
    var mins = r.int(12, 30);
    var lt2 = r.int(12, 25), ret = round(r.int(30, 60) / 10, 1);
    return [
      { id: "lean", method: "Lean", text: "Order-to-shipment lead time for " + t.product + " is " + lead + " days, but the hands-on work on each " + t.unit + " totals only " + hands + " hours. Work waits in " + queues + " queues between steps, and the warehouse is full." },
      { id: "sixsigma", method: "Six Sigma (DMAIC)", text: "One critical characteristic varies so much that the defect rate is about " + ppm.toLocaleString("en-US") + " parts per million. The team has listed " + inputs + " input variables that might matter but has no data on which ones do." },
      { id: "toc", method: "Theory of Constraints", text: "One station (" + t.stations[1].toLowerCase() + ") runs around the clock and limits plant output to " + cap + " units a day, while the other stations stand idle about " + idle + "% of the time." },
      { id: "kaizen", method: "Kaizen (with Five-S)", text: "Assemblers report many small, everyday annoyances: searching for tools, cluttered benches, walking to fetch parts. Each costs only a few minutes, but together they add up to about " + mins + " minutes per person per shift." },
      { id: "lss", method: "Lean Six Sigma", text: "The same process has both a long lead time (" + lt2 + " days, mostly waiting) and a high return rate (" + ret + "%) caused by variation in one key dimension." }
    ];
  }

  // ---------- the case ----------
  function makeCase(rawCode) {
    var code = normCode(rawCode);
    var r = makeRng(hash32(VERSION + "|" + code));
    var t = T[hash32("tpl|" + code) % T.length];
    var C = { version: VERSION, code: code, company: t.company, product: t.product, unit: t.unit, template: t.key };

    // Q1 Pareto + stratification
    var q1;
    for (var tries = 0; tries < 200; tries++) {
      var rows = t.defects.map(function (d) {
        var tier = d[1];
        var count = tier === 1 ? r.int(70, 190) : tier === 2 ? r.int(30, 80) : r.int(8, 26);
        var cost = r.int(d[2], d[3]);
        return { name: d[0], count: count, cost: cost, total: count * cost };
      });
      var byCount = rows.slice().sort(function (a, b) { return b.count - a.count; });
      var byCost = rows.slice().sort(function (a, b) { return b.total - a.total; });
      var top2c = byCount.slice(0, 2).map(function (x) { return x.name; });
      var top2k = byCost.slice(0, 2).map(function (x) { return x.name; });
      var overlap = top2c.filter(function (n) { return top2k.indexOf(n) >= 0; }).length;
      var gaps = byCount[0].count !== byCount[1].count && byCost[0].total !== byCost[1].total && byCount[1].count !== byCount[2].count;
      if (overlap === 0 && gaps) { q1 = { rows: rows, byCount: byCount, byCost: byCost }; break; }
    }
    // stratify the top-cost category by line x shift
    var topCost = q1.byCost[0];
    var lines = ["Line 1", "Line 2", "Line 3"], shifts = ["Day", "Night"];
    var hot = { line: r.int(0, 2), shift: r.int(0, 1) };
    var share = r.int(52, 64) / 100;
    var hotN = Math.round(topCost.count * share), rest = topCost.count - hotN;
    var cells = [], weights = [];
    for (var li = 0; li < 3; li++) for (var si = 0; si < 2; si++) { if (li === hot.line && si === hot.shift) weights.push(0); else weights.push(0.6 + r()); }
    var wsum = sum(weights);
    var alloc = weights.map(function (w) { return Math.floor(rest * w / wsum); });
    var left = rest - sum(alloc), order = weights.map(function (w, ii) { return [rest * w / wsum - alloc[ii], ii]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var q = 0; q < left; q++) alloc[order[q][1]]++;
    for (li = 0; li < 3; li++) for (si = 0; si < 2; si++) {
      var idx = li * 2 + si;
      cells.push({ line: lines[li], shift: shifts[si], n: (li === hot.line && si === hot.shift) ? hotN : alloc[idx] });
    }
    q1.strat = { category: topCost.name, cells: cells, hot: lines[hot.line] + ", " + shifts[hot.shift] + " shift", hotShare: Math.round(100 * hotN / topCost.count) };
    var totalCost = sum(q1.rows.map(function (x) { return x.total; })), totalCount = sum(q1.rows.map(function (x) { return x.count; }));
    q1.totalCost = totalCost; q1.totalCount = totalCount;
    C.q1 = q1;

    // Q2 recurring problem
    var kRec = r.int(4, 6);
    var fixes = r.shuffle(t.fixes).slice(0, kRec);
    var months = ["May", "June", "July", "August", "September", "October"];
    var log = fixes.map(function (f, i) { return { month: months[Math.min(5, Math.floor(i * 6 / kRec))], fix: f, returns: r.int(18, 46) }; });
    var costPer = r.int(60, 240);
    var facts = r.shuffle(t.chain.map(function (s, i) { return { text: s, role: "chain" + (i + 1) }; })
      .concat(t.herrings.map(function (s) { return { text: s, role: "herring" }; })));
    facts.forEach(function (f, i) { f.label = String.fromCharCode(65 + i); });
    C.q2 = { problem: t.problem, log: log, costPer: costPer, facts: facts, chain: t.chain, totalReturns: sum(log.map(function (x) { return x.returns; })) };

    // Q3 QFD
    var nNeed = t.needs.length, nHow = t.hows.length;
    var needRows = t.needs.map(function (nm) {
      var imp = r.int(2, 5), cur = r.int(2, 4), pl = Math.min(5, cur + r.int(0, 2));
      return { need: nm, importance: imp, current: cur, compA: r.int(2, 5), compB: r.int(2, 5), planned: pl, salesPoint: r.pick([1.0, 1.0, 1.2, 1.5]) };
    });
    var rel = [];
    for (var i = 0; i < nNeed; i++) { rel.push([]); for (var j = 0; j < nHow; j++) rel[i].push(0); }
    for (i = 0; i < nNeed; i++) rel[i][i] = 9;
    r.shuffle(t.sec).slice(0, r.int(2, 3)).forEach(function (pr) { rel[pr[0]][pr[1]] = r.pick([1, 3, 3]); });
    var plantType = r() < 0.5 ? "emptyRow" : "emptyCol";
    var q3 = { needs: needRows, hows: t.hows.slice(), rel: rel, plant: plantType, impede: t.impede, support: t.support };
    if (plantType === "emptyRow") { q3.needs.push({ need: t.extraNeed, importance: r.int(2, 4), current: 3, compA: r.int(3, 4), compB: r.int(3, 4), planned: 3, salesPoint: 1.0 }); q3.rel.push(t.hows.map(function () { return 0; })); }
    else { q3.hows.push(t.extraHow); q3.rel.forEach(function (row) { row.push(0); }); }
    q3.needs.forEach(function (n) { n.impFactor = round((n.planned - n.current) * 0.2 + 1, 2); n.weight = round(n.importance * n.impFactor * n.salesPoint, 2); });
    var wTot = sum(q3.needs.map(function (n) { return n.weight; }));
    q3.needs.forEach(function (n) { n.pct = round(100 * n.weight / wTot, 1); });
    q3.techPriority = q3.hows.map(function (h, jj) { return round(sum(q3.needs.map(function (n, ii) { return q3.rel[ii][jj] * n.weight; })), 2); });
    var tpTot = sum(q3.techPriority);
    q3.techPct = q3.techPriority.map(function (p) { return round(100 * p / tpTot, 1); });
    C.q3 = q3;

    // Q4 SPC: X-bar R, n=5, 25 subgroups, one planted special cause
    var s = t.spc, nSub = 25, nPer = 5;
    var A2 = 0.577, D3 = 0, D4 = 2.114, d2 = 2.326;
    var type = r() < 0.5 ? "point" : "run";
    var mu = s.target + (r() - 0.5) * 0.6 * s.sigma;
    var q4 = null;
    for (var att = 0; att < 400 && !q4; att++) {
      var at = type === "point" ? r.int(11, 22) : r.int(9, 16);
      var groups = [];
      for (var g = 0; g < nSub; g++) {
        var shiftAmt = 0;
        if (type === "point" && g === at) shiftAmt = 3.8 * s.sigma / Math.sqrt(nPer);
        if (type === "run" && g >= at && g < at + 9) shiftAmt = 1.3 * s.sigma / Math.sqrt(nPer);
        var vals = [];
        for (var v = 0; v < nPer; v++) vals.push(round(mu + shiftAmt + s.sigma * r.normal(), s.dec));
        groups.push(vals);
      }
      var means = groups.map(mean), ranges = groups.map(function (x) { return Math.max.apply(null, x) - Math.min.apply(null, x); });
      var xbb = mean(means), rbar = mean(ranges);
      var ucl = xbb + A2 * rbar, lcl = xbb - A2 * rbar, uclR = D4 * rbar;
      var beyond = []; means.forEach(function (m, ii) { if (m > ucl || m < lcl) beyond.push(ii); });
      var rBeyond = []; ranges.forEach(function (x, ii) { if (x > uclR) rBeyond.push(ii); });
      var runs = [], cur2 = 0, side = 0, start = 0;
      means.forEach(function (m, ii) { var sgn = m > xbb ? 1 : -1; if (sgn === side) cur2++; else { if (cur2 >= 8) runs.push([start, ii - 1, side]); side = sgn; cur2 = 1; start = ii; } });
      if (cur2 >= 8) runs.push([start, nSub - 1, side]);
      var ok;
      if (type === "point") ok = beyond.length === 1 && beyond[0] === at && runs.length === 0 && rBeyond.length === 0;
      else ok = beyond.length === 0 && runs.length === 1 && runs[0][2] === 1 && runs[0][0] <= at + 1 && rBeyond.length === 0;
      if (ok) {
        var sigHat = rbar / d2;
        q4 = { name: s.name, unit: s.unit, lsl: s.lsl, usl: s.usl, target: s.target, dec: s.dec, n: nPer, groups: groups,
               means: means.map(function (m) { return round(m, s.dec + 1); }), ranges: ranges.map(function (x) { return round(x, s.dec); }),
               xbb: round(xbb, s.dec + 1), rbar: round(rbar, s.dec + 1), ucl: round(ucl, s.dec + 1), lcl: round(lcl, s.dec + 1), uclR: round(uclR, s.dec + 1),
               type: type, at: type === "point" ? at + 1 : null, run: type === "run" ? [runs[0][0] + 1, runs[0][1] + 1] : null,
               sigmaHat: round(sigHat, s.dec + 1), cp: round((s.usl - s.lsl) / (6 * sigHat), 2),
               cpk: round(Math.min(s.usl - xbb, xbb - s.lsl) / (3 * sigHat), 2) };
      }
    }
    // tampering: funnel rule 2 simulation on individual checks
    var base = [], tamp = [], adj = 0;
    for (i = 0; i < 400; i++) { base.push(mu + s.sigma * r.normal()); var y = mu + adj + s.sigma * r.normal(); tamp.push(y); adj -= (y - s.target); }
    q4.sdBefore = round(sd(base), s.dec + 1); q4.sdDuring = round(sd(tamp), s.dec + 1);
    q4.tampRatio = round(q4.sdDuring / q4.sdBefore, 2);
    C.q4 = q4;

    // Q5 method selection
    var pool = q5Pool(r, t);
    C.q5 = { problems: r.shuffle(pool).slice(0, 3).map(function (p, ii) { p.label = "Problem " + (ii + 1); return p; }) };

    // Q6 benchmarking
    var procs = Object.keys(t.partner);
    var avg = procs.map(function () { return r.int(18, 90) * 10000; });
    var mult = r.shuffle([r.int(26, 38) / 10, r.int(19, 25) / 10, r.int(125, 150) / 100, r.int(95, 108) / 100, r.int(90, 104) / 100, r.int(45, 65) / 100]);
    var q6rows = procs.map(function (p, ii) { var ours = Math.round(avg[ii] * mult[ii] / 1000) * 1000; return { process: p, industry: avg[ii], ours: ours, gap: ours - avg[ii] }; });
    var sortedGap = q6rows.slice().sort(function (a, b) { return b.gap - a.gap; });
    var focus = sortedGap[0].process;
    C.q6 = { rows: q6rows, focus: focus, second: sortedGap[1].process, under: sortedGap[sortedGap.length - 1].process,
      partners: r.shuffle([
        { name: "Partner A", text: "Your largest direct competitor, which has much lower costs overall.", best: false },
        { name: "Partner B", text: t.partner[focus].charAt(0).toUpperCase() + t.partner[focus].slice(1) + " (outside your industry), widely cited as best-in-class at this kind of process.", best: true },
        { name: "Partner C", text: "A friendly company nearby in your own industry, whose " + focus.toLowerCase() + " costs are about 15% lower than yours.", best: false }
      ]),
      totalGap: sum(q6rows.map(function (x) { return x.gap; })) };
    C.q6.partners.forEach(function (p, ii) { p.name = "Partner " + String.fromCharCode(65 + ii); });

    // Q7 push -> pull
    var wip = r.int(18, 42) * 100, out = r.int(12, 30) * 10, va = r.int(3, 8), hrsDay = 8;
    var parts = 4, demand = r.int(16, 30) * 10, rate = Math.round(demand / (r.int(10, 14) / 10) / 10) * 10;
    var runPerDay = demand / rate;                   // hours to run one day's demand of one part
    var setupNow = r.int(4, 7), setupNew = r.pick([0.25, 0.33, 0.5]), lotDays = r.pick([10, 15, 20]);
    var lotHours = lotDays * runPerDay;
    C.q7 = { wip: wip, out: out, va: va, hrsDay: hrsDay, stations: t.stations,
      cycleDays: round(wip / out, 1), vaRatio: round(100 * va / (wip / out * hrsDay), 1),
      parts: parts, demand: demand, rate: rate, setupNow: setupNow, setupNew: setupNew, lotDays: lotDays,
      runPerDay: round(runPerDay, 2), setupShareNow: round(100 * setupNow / (setupNow + lotHours), 1),
      dailyNow: round(parts * (runPerDay + setupNow), 1), dailyNew: round(parts * (runPerDay + setupNew), 1),
      avgInvNow: Math.round(parts * lotDays * demand / 2), avgInvNew: Math.round(parts * demand / 2) };

    // Q8 JIT stoppages
    var causes = [["Supplier delivery late", 25, 70], ["Defective parts from a supplier", 30, 80], ["Machine breakdown", 60, 150],
                  ["Setup took longer than planned", 20, 45], ["Missing or miscounted kanban card", 8, 20], ["Operator absent, no one cross-trained", 30, 60]];
    var q8rows = r.shuffle(causes).map(function (c) { var n = r.int(3, 16); var m = r.int(c[1], c[2]); return { cause: c[0], count: n, minutes: n * m }; });
    var byMin = q8rows.slice().sort(function (a, b) { return b.minutes - a.minutes; });
    var invBefore = r.int(10, 18), invAfter = r.int(2, 4), ontimeBefore = r.int(91, 96), ontimeAfter = r.int(78, 86);
    C.q8 = { rows: q8rows, topByMinutes: [byMin[0].cause, byMin[1].cause], invBefore: invBefore, invAfter: invAfter, ontimeBefore: ontimeBefore, ontimeAfter: ontimeAfter,
             totalMin: sum(q8rows.map(function (x) { return x.minutes; })) };

    // Q9 TQM implementation that stalled
    C.q9 = { ceoPct: r.int(3, 9), delegate: r.pick(["the quality assurance director", "the human resources manager", "an outside consultant"]),
      trained: r.int(180, 420), trainedMonths: r.int(5, 11), teams: r.int(14, 30), teamsMonth: 1,
      meetingsHeld: r.int(1, 3), meetingsPlanned: 6, knowGoal: r.int(18, 38), ideasActed: r.int(9, 24),
      rewards: r.pick(["an individual “employee of the month” award", "individual annual merit raises only", "individual sales-style bonuses for supervisors"]),
      midQuote: r.pick(["“We’ve seen programs like this before. This too shall pass.”", "“Teams take my people off the line and cost me my numbers.”", "“I know their jobs better than they do; I don’t need their ideas.”"]),
      silo: r.pick(["Purchasing still buys on lowest price and was not part of any team.", "Engineering and manufacturing each run their own teams and do not share results.", "Accounting says the overhead rate went up and wants teams cut."]) };

    // receipt check code
    var keyStr = [C.code, VERSION, q1.byCost[0].name, C.q4.xbb, C.q4.ucl, C.q7.cycleDays, C.q3.techPriority.join(",")].join("|");
    var AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", enc = function (x) { var o = ""; for (var ii = 0; ii < 4; ii++) { o += AB[x % 32]; x = Math.floor(x / 32); } return o; };
    C.check = enc(hash32(keyStr)) + "-" + enc(hash32("x" + keyStr));
    return C;
  }

  var api = { VERSION: VERSION, makeCase: makeCase, normCode: normCode, hash32: hash32, templates: T };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CaseGen = api;
})(this);
