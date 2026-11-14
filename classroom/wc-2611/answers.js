/* Exam 2 Written Part E2-v1: builds the student's answer file (.docx) in the browser and reads it back.
   No libraries and no network: a small ZIP writer/reader and plain WordprocessingML. */
(function (root) {
  "use strict";
  var LETTERS = "abcdefgh";
  var NONE = "[No answer]";
  var enc = new TextEncoder();

  // ---------------------------------------------------------------- CRC32 + ZIP (stored)
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // files: [{name, data(Uint8Array)}]
    var d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var parts = [], central = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true);
      c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + f.data.length;
    });
    var csize = central.reduce(function (s, a) { return s + a.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  function unzipEntry(buf, want) { // returns Promise<string|null>
    var v = new DataView(buf), i = buf.byteLength - 22;
    while (i >= 0 && v.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) return Promise.resolve(null);
    var n = v.getUint16(i + 10, true), p = v.getUint32(i + 16, true), dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      var method = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true),
        el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      var name = dec.decode(new Uint8Array(buf, p + 46, nl));
      if (name === want) {
        var start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), data = new Uint8Array(buf, start, csz);
        if (method === 0) return Promise.resolve(dec.decode(data));
        if (method === 8 && typeof DecompressionStream !== "undefined")
          return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
        return Promise.resolve(null);
      }
      p += 46 + nl + el + cl;
    }
    return Promise.resolve(null);
  }

  // ---------------------------------------------------------------- WordprocessingML
  function x(s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function run(text, o) {
    o = o || {};
    var pr = '<w:rFonts w:ascii="' + (o.font || "Calibri") + '" w:hAnsi="' + (o.font || "Calibri") + '" w:cs="' + (o.font || "Calibri") + '"/>' +
      (o.b ? "<w:b/>" : "") + (o.i ? "<w:i/>" : "") + (o.color ? '<w:color w:val="' + o.color + '"/>' : "") + '<w:sz w:val="' + (o.sz || 22) + '"/>';
    return '<w:r><w:rPr>' + pr + '</w:rPr><w:t xml:space="preserve">' + x(text) + "</w:t></w:r>";
  }
  function para(runs, o) {
    o = o || {};
    // child order follows the OOXML schema: keepNext, pBdr, spacing, ind
    return '<w:p><w:pPr>' + (o.keep ? "<w:keepNext/>" : "") + (o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="D9D8D3"/></w:pBdr>' : "") +
      '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 120 : o.after) + '" w:line="276" w:lineRule="auto"/>' +
      (o.indent ? '<w:ind w:left="' + o.indent + '"/>' : "") + "</w:pPr>" + runs + "</w:p>";
  }
  function stamp() {
    var d = new Date();
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }
  function key(n, j) { return n + LETTERS[j]; }

  function buildDocx(C, Q, ans) {
    var body = "", bid = 0;
    body += para(run("EXAM 2 · WRITTEN PART · VERSION " + C.version, { b: true, color: "0F5F6B", sz: 18 }), { after: 60 });
    body += para(run("My answers", { b: true, sz: 40, font: "Cambria" }), { after: 120 });
    body += para(run("Code " + C.code + " · Version " + C.version + " · Check " + C.check, { font: "Consolas", sz: 21, b: true }), { after: 60 });
    body += para(run("Company case: " + C.company + " · Downloaded " + stamp(), { color: "5D6670", sz: 19 }), { after: 240, border: true });
    Q.questions.forEach(function (q) {
      body += para(run(q.n + ". " + q.title + "  (" + q.ch + ")", { b: true, sz: 26, font: "Cambria", color: "0F5F6B" }), { before: 240, after: 80, keep: true });
      q.parts.forEach(function (p, j) {
        var k = key(q.n, j), a = (ans[k] || "").replace(/\r/g, "").trim(), id = bid++;
        body += para(run("(" + LETTERS[j] + ") ", { b: true, sz: 20, color: "5D6670" }) + run(p, { i: true, sz: 20, color: "5D6670" }), { before: 80, after: 60, keep: true });
        body += '<w:bookmarkStart w:id="' + id + '" w:name="ans_' + q.n + "_" + LETTERS[j] + '"/>';
        (a ? a.split(/\n/) : [NONE]).forEach(function (line) { body += para(run(line, a ? {} : { i: true, color: "B3261E" }), { indent: 360, after: 80 }); });
        body += '<w:bookmarkEnd w:id="' + id + '"/>';
      });
    });
    body += '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + "</w:body></w:document>";
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    return zip([{ name: "[Content_Types].xml", data: enc.encode(ct) }, { name: "_rels/.rels", data: enc.encode(rels) }, { name: "word/document.xml", data: enc.encode(doc) }]);
  }

  function textOf(xml) { // paragraphs -> lines
    return xml.split(/<\/w:p>/).map(function (p) {
      var s = "", m, re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g;
      while ((m = re.exec(p))) s += m[1] != null ? m[1] : (m[0] === "<w:tab/>" ? "\t" : "\n");
      return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    });
  }
  function readDocx(file, Q) { // Promise<{code, ans}>; finds each answer between its printed prompt and the next prompt or heading
    return file.arrayBuffer().then(function (buf) { return unzipEntry(buf, "word/document.xml"); }).then(function (xml) {
      if (!xml) throw new Error("This file could not be read. Use a .docx file downloaded from this page.");
      var lines = textOf(xml), cm = lines.join("\n").match(/Code\s+(QL-[A-Z2-9]{5})/);
      if (!cm) throw new Error("No code was found in this file. Use a .docx file downloaded from this page.");
      var norm = function (t) { return t.replace(/\s+/g, " ").trim(); }, N = lines.map(norm), marks = [], ans = {};
      Q.questions.forEach(function (q) {
        var hi = N.indexOf(norm(q.n + ". " + q.title + "  (" + q.ch + ")"));
        if (hi >= 0) marks.push(hi);
        q.parts.forEach(function (p, j) { var pi = N.indexOf(norm("(" + LETTERS[j] + ") " + p), Math.max(hi, 0)); if (pi >= 0) marks.push({ k: key(q.n, j), i: pi }); });
      });
      var idx = marks.map(function (m) { return typeof m === "number" ? m : m.i; }).sort(function (a, b) { return a - b; });
      marks.forEach(function (m) {
        if (typeof m === "number") return;
        var next = idx.filter(function (i) { return i > m.i; })[0]; if (next == null) next = lines.length;
        var t = lines.slice(m.i + 1, next).join("\n").replace(/^\s*\n|\n\s*$/g, "").replace(/^\n+|\n+$/g, "");
        ans[m.k] = norm(t) === NONE ? "" : t;
      });
      if (!Object.keys(ans).length) throw new Error("No answers were found in this file. Use a .docx file downloaded from this page.");
      return { code: cm[1], ans: ans };
    });
  }

  var api = { buildDocx: buildDocx, readDocx: readDocx, key: key, LETTERS: LETTERS, NONE: NONE, stamp: stamp };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Answers = api;
})(this);
