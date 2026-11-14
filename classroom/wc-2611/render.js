/* Renders a personal case (and, on the private key page, its answer key). */
(function (root) {
  "use strict";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
  function num(x, d) { return Number(x).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function table(head, rows, cls) {
    return '<div class="tbl-wrap"><table class="' + (cls || "") + '"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  function qBlock(q) {
    return '<div class="question"><p class="q-lead">' + esc(q.text) + '</p><ol type="a">' + q.parts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ol></div>";
  }
  function section(n, title, ch, dataHtml, q) {
    return '<section class="case" id="case' + n + '"><header><span class="badge">' + n + '</span><div><h2>' + esc(title) + '</h2><p class="ch">' + esc(ch) + "</p></div></header>" +
      '<div class="data"><h3>Your data</h3>' + dataHtml + '</div><div class="ask"><h3>Question ' + n + "</h3>" + qBlock(q) + "</div></section>";
  }

  // simple SVG control chart
  function chart(values, center, ucl, lcl, label, dec, mark) {
    var W = 720, H = 236, L = 104, R = 16, Tp = 14, B = 44, n = values.length;
    var lo = Math.min(lcl, Math.min.apply(null, values)), hi = Math.max(ucl, Math.max.apply(null, values));
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    var x = function (i) { return L + (W - L - R) * i / (n - 1); }, y = function (v) { return Tp + (H - Tp - B) * (hi - v) / (hi - lo); };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(label) + '">';
    [["UCL", ucl, "lim"], ["CL", center, "cl"], ["LCL", lcl, "lim"]].forEach(function (l) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(l[1]) + '" y2="' + y(l[1]) + '" class="' + l[2] + '"/>';
      s += '<text x="' + (L - 6) + '" y="' + (y(l[1]) + 4) + '" class="lab" text-anchor="end">' + l[0] + " " + num(l[1], dec) + "</text>";
    });
    s += '<polyline class="series" points="' + values.map(function (v, i) { return x(i) + "," + y(v); }).join(" ") + '"/>';
    values.forEach(function (v, i) { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.2" class="pt"/>'; });
    for (var i = 0; i < n; i += 2) s += '<text x="' + x(i) + '" y="' + (H - 24) + '" class="tick" text-anchor="middle">' + (i + 1) + "</text>";
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" class="tick" text-anchor="middle">Subgroup</text>';
    return s + "</svg>";
  }

  function renderCase(C, Q) {
    var q = Q.questions, h = "";
    // 1
    h += section(1, q[0].title, q[0].ch,
      "<p>" + esc(C.company) + " makes " + esc(C.product) + ". Defects found last quarter (internal checks and customer returns):</p>" +
      table(["Defect category", "Occurrences", "Average cost per occurrence"], C.q1.rows.map(function (r) { return [esc(r.name), num(r.count), money(r.cost)]; }), "num") +
      "<p>Occurrences of <b>" + esc(C.q1.strat.category) + "</b>, stratified by line and shift:</p>" +
      table(["", "Day shift", "Night shift"], ["Line 1", "Line 2", "Line 3"].map(function (ln) {
        return [ln].concat(["Day", "Night"].map(function (sh) { return num(C.q1.strat.cells.filter(function (c) { return c.line === ln && c.shift === sh; })[0].n); }));
      }), "num small") +
      '<p class="note">Each line runs a similar volume on each shift.</p>', q[0]);
    // 2
    h += section(2, q[1].title, q[1].ch,
      "<p>" + esc(C.q2.problem) + "</p>" +
      table(["Month", "Customer returns that month", "“Fix” applied"], C.q2.log.map(function (l) { return [l.month, num(l.returns), esc(l.fix)]; }), "num") +
      "<p>Each return costs about <b>" + money(C.q2.costPer) + "</b> (shipping, repair or replacement, handling).</p>" +
      "<p>Evidence collected by the investigation team (in no particular order):</p><ul class=\"facts\">" +
      C.q2.facts.map(function (f) { return "<li><b>" + f.label + ".</b> " + esc(f.text) + "</li>"; }).join("") + "</ul>", q[1]);
    // 3
    var q3 = C.q3;
    h += section(3, q[2].title, q[2].ch,
      "<p><b>Planning matrix</b> (customer satisfaction ratings on a 1–5 scale; 5 is best):</p>" +
      table(["Customer need (WHAT)", "Importance", "Our current rating", "Competitor A", "Competitor B", "Planned rating", "Sales point"],
        q3.needs.map(function (n) { return [esc(n.need), n.importance, n.current, n.compA, n.compB, n.planned, num(n.salesPoint, 1)]; }), "num") +
      "<p><b>Relationships</b> between customer needs and technical requirements (9 strong, 3 medium, 1 weak, blank none):</p>" +
      table(["Customer need"].concat(q3.hows.map(esc)), q3.needs.map(function (n, i) { return [esc(n.need)].concat(q3.rel[i].map(function (v) { return v ? String(v) : ""; })); }), "num rel") +
      '<p><b>Roof notes from engineering:</b> ' + esc(q3.impede[2]) + " " + esc(q3.support[2]) + "</p>", q[2]);
    // 4
    var q4 = C.q4;
    h += section(4, q[3].title, q[3].ch,
      "<p>Characteristic: <b>" + esc(q4.name) + "</b> (" + esc(q4.unit) + "). Specification: " + num(q4.lsl, q4.dec) + " to " + num(q4.usl, q4.dec) + ", target " + num(q4.target, q4.dec) +
      ". Five units are measured per subgroup.</p>" +
      '<p class="kv"><span>X̄̄ = ' + num(q4.xbb, q4.dec + 1) + "</span><span>R̄ = " + num(q4.rbar, q4.dec + 1) + "</span><span>UCL<sub>X̄</sub> = " + num(q4.ucl, q4.dec + 1) +
      "</span><span>LCL<sub>X̄</sub> = " + num(q4.lcl, q4.dec + 1) + "</span><span>UCL<sub>R</sub> = " + num(q4.uclR, q4.dec + 1) + "</span><span>LCL<sub>R</sub> = 0</span></p>" +
      "<h4>X̄ chart</h4>" + chart(q4.means, q4.xbb, q4.ucl, q4.lcl, "X-bar chart", q4.dec + 1) +
      "<h4>R chart</h4>" + chart(q4.ranges, q4.rbar, q4.uclR, 0, "R chart", q4.dec + 1) +
      "<details><summary>All 125 measurements</summary>" +
      table(["Subgroup", "1", "2", "3", "4", "5", "X̄", "R"], q4.groups.map(function (g, i) { return [i + 1].concat(g.map(function (v) { return num(v, q4.dec); })).concat([num(q4.means[i], q4.dec + 1), num(q4.ranges[i], q4.dec)]); }), "num small") +
      "</details>" +
      "<p>Individual checks before the adjust-after-every-check policy: standard deviation <b>" + num(q4.sdBefore, q4.dec + 1) + " " + esc(q4.unit) +
      "</b>. During the month of that policy: <b>" + num(q4.sdDuring, q4.dec + 1) + " " + esc(q4.unit) + "</b>.</p>", q[3]);
    // 5
    h += section(5, q[4].title, q[4].ch, C.q5.problems.map(function (p) { return '<p class="prob"><b>' + p.label + ".</b> " + esc(p.text) + "</p>"; }).join(""), q[4]);
    // 6
    h += section(6, q[5].title, q[5].ch,
      table(["Process", "Industry average (per year)", "Your company (per year)"], C.q6.rows.map(function (r) { return [esc(r.process), money(r.industry), money(r.ours)]; }), "num") +
      "<p>Possible partners for benchmarking your weakest process:</p><ul class=\"facts\">" + C.q6.partners.map(function (p) { return "<li><b>" + p.name + ".</b> " + esc(p.text) + "</li>"; }).join("") + "</ul>", q[5]);
    // 7
    var q7 = C.q7;
    h += section(7, q[6].title, q[6].ch,
      "<ul class=\"facts\"><li>Production flows through " + q7.stations.map(esc).join(" → ") + ". Each station works to its own schedule and pushes its output to the next.</li>" +
      "<li>Work-in-process on the floor and in staging: <b>" + num(q7.wip) + " units</b>. Finished output: <b>" + num(q7.out) + " units per day</b>.</li>" +
      "<li>Hands-on, value-adding work per unit totals <b>" + q7.va + " hours</b>. The plant runs one " + q7.hrsDay + "-hour shift a day.</li>" +
      "<li>The key machine makes <b>" + q7.parts + " different parts</b>. Each part’s demand is <b>" + num(q7.demand) + " units per day</b>, and the machine produces <b>" + num(q7.rate) + " units per hour</b>.</li>" +
      "<li>A changeover (setup) between parts takes <b>" + q7.setupNow + " hours</b> today, so each part is made in lots of <b>" + q7.lotDays + " days’ demand</b>. A setup-reduction project expects to cut setup to <b>" + num(q7.setupNew * 60) + " minutes</b>.</li></ul>", q[6]);
    // 8
    var q8 = C.q8;
    h += section(8, q[7].title, q[7].ch,
      "<p>Raw-material and work-in-process inventory fell from <b>" + q8.invBefore + " days</b> of supply to <b>" + q8.invAfter + " days</b>. On-time delivery fell from <b>" + q8.ontimeBefore + "%</b> to <b>" + q8.ontimeAfter + "%</b>. Stoppages in the last eight weeks:</p>" +
      table(["Cause", "Number of stoppages", "Total downtime (minutes)"], q8.rows.map(function (r) { return [esc(r.cause), num(r.count), num(r.minutes)]; }), "num"), q[7]);
    // 9
    var q9 = C.q9;
    h += section(9, q[8].title, q[8].ch,
      "<ul class=\"facts\"><li>The CEO announced the TQM initiative and asked " + esc(q9.delegate) + " to run it. The CEO spends about <b>" + q9.ceoPct + "%</b> of their time on it.</li>" +
      "<li>All <b>" + num(q9.trained) + " employees</b> were trained in the seven quality tools in one month, <b>" + q9.trainedMonths + " months</b> before any of them joined an improvement team.</li>" +
      "<li><b>" + q9.teams + " teams</b> were launched in the first month; employees volunteered and picked their own topics.</li>" +
      "<li>The executive steering committee met <b>" + q9.meetingsHeld + "</b> of the <b>" + q9.meetingsPlanned + "</b> times it planned to in the last six months.</li>" +
      "<li>Employee survey: <b>" + q9.knowGoal + "%</b> agree “I know what the initiative is trying to achieve”; <b>" + q9.ideasActed + "%</b> agree “my improvement ideas get acted on.”</li>" +
      "<li>Recognition is based on " + esc(q9.rewards) + ".</li><li>A middle manager says: " + esc(q9.midQuote) + "</li><li>" + esc(q9.silo) + "</li></ul>", q[8]);
    // 10
    h += section(10, q[9].title, q[9].ch, "<p>Use your data from Cases 1–9.</p>", q[9]);
    return h;
  }

  function renderKey(C) {
    var k = "", q4 = C.q4, q3 = C.q3, q7 = C.q7;
    var cum = function (arr, f, tot, fmt) { var s = 0; fmt = fmt || num; return arr.map(function (r) { s += f(r); return esc(r.name) + " " + fmt(f(r)) + " (" + num(100 * s / tot, 1) + "% cum.)"; }); };
    k += "<h3>1. Pareto and stratification</h3><p><b>By count:</b> " + cum(C.q1.byCount, function (r) { return r.count; }, C.q1.totalCount).join("; ") + "</p>";
    k += "<p><b>By total cost:</b> " + cum(C.q1.byCost, function (r) { return r.total; }, C.q1.totalCost, money).join("; ") + "</p>";
    k += "<p>Top two by count and top two by cost do not overlap. Budget should follow cost. Stratification: <b>" + esc(C.q1.strat.hot) + "</b> holds " + C.q1.strat.hotShare + "% of " + esc(C.q1.strat.category) + " occurrences (a localized symptom; next: cause-and-effect diagram for that line and shift, then a defect-factor check sheet).</p>";
    k += "<h3>2. Recurring problem</h3><p>Total returns in log: " + num(C.q2.totalReturns) + " × " + money(C.q2.costPer) + " = <b>" + money(C.q2.totalReturns * C.q2.costPer) + "</b>.</p><p>Five Whys chain (in order): " +
      C.q2.facts.filter(function (f) { return f.role.indexOf("chain") === 0; }).sort(function (a, b) { return a.role < b.role ? -1 : 1; }).map(function (f) { return f.label; }).join(" → ") +
      ". Irrelevant (red herrings): " + C.q2.facts.filter(function (f) { return f.role === "herring"; }).map(function (f) { return f.label; }).join(", ") + ".</p><p>Root cause (system level): " + esc(C.q2.chain[4]) + "</p>";
    k += "<h3>3. QFD</h3>" + table(["Need", "Improvement factor", "Overall weighting", "% of total"], q3.needs.map(function (n) { return [esc(n.need), num(n.impFactor, 2), num(n.weight, 2), num(n.pct, 1) + "%"]; }), "num small");
    k += table(["Technical requirement", "Priority", "% of total"], q3.hows.map(function (hh, j) { return [esc(hh), num(q3.techPriority[j], 2), num(q3.techPct[j], 1) + "%"]; }), "num small");
    k += "<p>Structural problem: <b>" + (q3.plant === "emptyRow" ? "empty row — the need “" + esc(q3.needs[q3.needs.length - 1].need) + "” is addressed by no technical requirement" : "empty column — the requirement “" + esc(q3.hows[q3.hows.length - 1]) + "” serves no customer need (wasted effort)") + "</b>.</p>";
    k += "<h3>4. SPC</h3><p>Limits check: " + num(q4.xbb, q4.dec + 1) + " ± 0.577 × " + num(q4.rbar, q4.dec + 1) + " = " + num(q4.lcl, q4.dec + 1) + " to " + num(q4.ucl, q4.dec + 1) + "; UCL<sub>R</sub> = 2.114 × R̄ = " + num(q4.uclR, q4.dec + 1) + ".</p>";
    k += "<p>Signal: <b>" + (q4.type === "point" ? "subgroup " + q4.at + " above UCL" : "run of " + (q4.run[1] - q4.run[0] + 1) + " points above the center line, subgroups " + q4.run[0] + "–" + q4.run[1]) + "</b>; no other signals. Tampering: SD rose from " + num(q4.sdBefore, q4.dec + 1) + " to " + num(q4.sdDuring, q4.dec + 1) + " (×" + num(q4.tampRatio, 2) + "; theory ≈ √2 = 1.41).</p>";
    k += "<p>Estimated σ = R̄/d₂ = " + num(q4.sigmaHat, q4.dec + 1) + "; Cp = <b>" + num(q4.cp, 2) + "</b>; Cpk = <b>" + num(q4.cpk, 2) + "</b> (1.33 preferred minimum).</p>";
    k += "<h3>5. Methods</h3><p>" + C.q5.problems.map(function (p) { return p.label + ": <b>" + esc(p.method) + "</b>"; }).join("; ") + ".</p>";
    k += "<h3>6. Benchmarking</h3><p>Largest gap: <b>" + esc(C.q6.focus) + "</b>; second: " + esc(C.q6.second) + "; below average: " + esc(C.q6.under) + ". Best partner: <b>" + C.q6.partners.filter(function (p) { return p.best; })[0].name + "</b> (best-in-class outside the industry). Total over-spend vs average: " + money(C.q6.totalGap) + ".</p>";
    k += "<h3>7. Push to pull</h3><p>Cycle time = " + num(q7.wip) + " ÷ " + num(q7.out) + " = <b>" + num(q7.cycleDays, 1) + " days</b>; value-added share = " + q7.va + " h ÷ (" + num(q7.cycleDays, 1) + " × 8 h) = <b>" + num(q7.vaRatio, 1) + "%</b>.</p>";
    k += "<p>Run time per part per day = " + num(q7.demand) + " ÷ " + num(q7.rate) + " = " + num(q7.runPerDay, 2) + " h. Daily lots today: 4 × (" + num(q7.runPerDay, 2) + " + " + q7.setupNow + ") = <b>" + num(q7.dailyNow, 1) + " h</b> &gt; 8 h, impossible; after setup reduction: 4 × (" + num(q7.runPerDay, 2) + " + " + num(q7.setupNew, 2) + ") = <b>" + num(q7.dailyNew, 1) + " h</b> ≤ 8 h, feasible. Average inventory: " + num(q7.avgInvNow) + " units today vs " + num(q7.avgInvNew) + " with daily lots. Setup share of machine time today: " + num(q7.setupShareNow, 1) + "%.</p>";
    k += "<h3>8. Stoppages</h3><p>Top causes by downtime: <b>" + C.q8.topByMinutes.map(esc).join("; ") + "</b> (total " + num(C.q8.totalMin) + " minutes).</p>";
    k += "<h3>9. TQM</h3><p>Expected citations: delegation to " + esc(C.q9.delegate) + " and CEO at " + C.q9.ceoPct + "% (vs ⅓–½); everyone trained at once " + C.q9.trainedMonths + " months early; " + C.q9.teams + " self-selected teams at once; steering committee met " + C.q9.meetingsHeld + "/6; survey " + C.q9.knowGoal + "% and " + C.q9.ideasActed + "%; individual rewards; middle-management resistance; silo.</p>";
    return k;
  }

  var api = { renderCase: renderCase, renderKey: renderKey, money: money, num: num, esc: esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CaseRender = api;
})(this);
