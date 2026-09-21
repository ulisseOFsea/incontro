import { REPORT_TITLES, type MeetingMeta } from "./types";

const ACCENT = "146EA8";
const INK = "152433";
const MUTED = "5B6E80";
const LINE = "D5E2EC";
const DECLARED = "216797";
const AGREED = "266B4C";
const PROPOSAL = "855514";

function xml(s: string) {
  const amp = "\u0026amp;";
  const lt = "\u0026lt;";
  const gt = "\u0026gt;";
  const quot = "\u0026quot;";
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
}

function run(text: string, rPr = "") {
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function p(inner: string, pPr = "") {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;
}

function styleP(style: string) {
  return `<w:pStyle w:val="${style}"/>`;
}

function para(text: string, style?: string) {
  return p(run(text), style ? styleP(style) : "");
}

function empty() {
  return "<w:p/>";
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function rule() {
  return p(
    "",
    '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="' +
      ACCENT +
      '"/></w:pBdr><w:spacing w:before="80" w:after="280"/>',
  );
}

function bookmark(id: number, name: string, inner: string) {
  return (
    `<w:bookmarkStart w:id="${id}" w:name="${name}"/>` +
    inner +
    `<w:bookmarkEnd w:id="${id}"/>`
  );
}

function formatDateIT(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function personLine(name: string, company: string, role: string) {
  return [name, company, role].filter(Boolean).join(" · ");
}

function sectionTitles(includeAppendix: boolean) {
  const items: Array<{ n: string; title: string; bookmark: string }> = REPORT_TITLES.map(
    (title, i) => ({
      n: String(i + 1).padStart(2, "0"),
      title,
      bookmark: `sec${i + 1}`,
    }),
  );
  if (includeAppendix) {
    items.push({
      n: String(items.length + 1).padStart(2, "0"),
      title: "Appendice — Trascrizione revisionata",
      bookmark: "secAppendix",
    });
  }
  return items;
}

function tocEntry(n: string, title: string, anchor: string) {
  return p(
    `<w:hyperlink w:anchor="${anchor}">` +
      run(`${n}    ${title}`, `<w:rStyle w:val="Hyperlink"/><w:sz w:val="22"/>`) +
      "</w:hyperlink>",
    styleP("TOC1") +
      '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9360"/></w:tabs>',
  );
}

function cell(inner: string) {
  return (
    "<w:tc><w:tcPr>" +
    '<w:tcW w:w="4680" w:type="dxa"/>' +
    '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/>' +
    '<w:bottom w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>' +
    "</w:tcPr>" +
    inner +
    "</w:tc>"
  );
}

function peopleTable(meta: MeetingMeta) {
  const block = (label: string, name: string, company: string, role: string, email: string) =>
    para(label, "Label") +
    para(name || "—", "Name") +
    (company || role ? para(personLine("", company, role).replace(/^ · /, ""), "Muted") : "") +
    (email ? para(email, "Muted") : "");
  return (
    "<w:tbl><w:tblPr>" +
    '<w:tblW w:w="9360" w:type="dxa"/>' +
    '<w:tblBorders>' +
    `<w:top w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>` +
    `<w:left w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>` +
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>` +
    `<w:right w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>` +
    `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="${LINE}"/>` +
    "</w:tblBorders>" +
    '<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>' +
    '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>' +
    "</w:tblPr>" +
    '<w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>' +
    "<w:tr>" +
    cell(block("Partecipante A", meta.nameA, meta.companyA, meta.roleA, meta.emailA)) +
    cell(block("Partecipante B", meta.nameB, meta.companyB, meta.roleB, meta.emailB)) +
    "</w:tr></w:tbl>"
  );
}

function taggedLine(line: string) {
  const tags: Array<{ prefix: string; color: string }> = [
    { prefix: "[DICHIARATO]", color: DECLARED },
    { prefix: "[CONCORDATO]", color: AGREED },
    { prefix: "[PROPOSTA AI]", color: PROPOSAL },
  ];
  const hit = tags.find((t) => line.startsWith(t.prefix));
  if (!hit) return p(run(line || " "));
  const rest = line.slice(hit.prefix.length).trim();
  return p(
    run(hit.prefix + " ", `<w:b/><w:color w:val="${hit.color}"/><w:sz w:val="21"/>`) +
      run(rest || " ", `<w:color w:val="${INK}"/>`),
  );
}

function bodyLines(text: string) {
  const value = text.trim() || "Non compilato in questo incontro.";
  if (value === "Non compilato in questo incontro." || value === "Non compilato.") {
    return para("Non compilato in questo incontro.", "Muted");
  }
  return value.split("\n").map(taggedLine).join("");
}

function bytes(s: string) {
  return new TextEncoder().encode(s);
}

function crc32(a: Uint8Array) {
  let c = 0xffffffff;
  for (const b of a) {
    c ^= b;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: Record<string, string>) {
  const chunks: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  let size = 0;
  const header = (n: number) => new Uint8Array(n);

  for (const [name, text] of Object.entries(files)) {
    const n = bytes(name);
    const d = bytes(text);
    const crc = crc32(d);
    const h = header(30);
    const v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, d.length, true);
    v.setUint32(22, d.length, true);
    v.setUint16(26, n.length, true);
    const c = header(46);
    const w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x800, true);
    w.setUint16(14, 33, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, d.length, true);
    w.setUint32(24, d.length, true);
    w.setUint16(28, n.length, true);
    w.setUint32(42, offset, true);
    chunks.push(h, n, d);
    directory.push(c, n);
    offset += h.length + n.length + d.length;
    size += c.length + n.length;
  }

  const e = header(22);
  const v = new DataView(e.buffer);
  const count = Object.keys(files).length;
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  const all = [...chunks, ...directory, e];
  const out = new Uint8Array(offset + size + 22);
  let pos = 0;
  for (const a of all) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

export function reportPlainText(
  meta: MeetingMeta,
  reports: string[],
  transcript: string,
  includeAppendix: boolean,
) {
  const who = [meta.nameA, meta.nameB].filter(Boolean).join(" e ");
  const date = formatDateIT(meta.date);
  const index = sectionTitles(includeAppendix)
    .map((s) => `${s.n}. ${s.title}`)
    .join("\n");
  return (
    "ONE TO ONE CLOUD\n" +
    "Report incontro 1-to-1\n" +
    (who ? `${who}\n` : "") +
    (date ? `${date}\n` : "") +
    (meta.chapter ? `${meta.chapter}\n` : "") +
    "\nINDICE\n" +
    index +
    "\n\nPARTECIPANTI\n" +
    `${personLine(meta.nameA, meta.companyA, meta.roleA)}` +
    (meta.emailA ? `\n${meta.emailA}` : "") +
    `\n${personLine(meta.nameB, meta.companyB, meta.roleB)}` +
    (meta.emailB ? `\n${meta.emailB}` : "") +
    (meta.goal ? `\n\nOBIETTIVO\n${meta.goal}` : "") +
    "\n\nCome leggere questo report\nDICHIARATO: riportato nell’incontro. CONCORDATO: impegno reciproco. PROPOSTA AI: ipotesi da validare.\n\n" +
    REPORT_TITLES.map(
      (t, i) => `${i + 1}. ${t}\n${reports[i]?.trim() || "Non compilato in questo incontro."}`,
    ).join("\n\n") +
    (includeAppendix
      ? `\n\nAppendice — Trascrizione revisionata\n${transcript}`
      : "")
  );
}

function headerXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    p(
      run("ONE TO ONE CLOUD", `<w:b/><w:color w:val="${ACCENT}"/><w:sz w:val="16"/>`) +
        run("  ·  Report incontro 1-to-1", `<w:color w:val="${MUTED}"/><w:sz w:val="16"/>`),
      `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="${LINE}"/></w:pBdr>`,
    ) +
    "</w:hdr>"
  );
}

function footerXml(who: string) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    p(
      run(who ? `${who}  ·  ` : "", `<w:color w:val="${MUTED}"/><w:sz w:val="16"/>`) +
        run("Documento riservato  ·  Pagina ", `<w:color w:val="${MUTED}"/><w:sz w:val="16"/>`) +
        '<w:r><w:rPr><w:color w:val="' +
        MUTED +
        '"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>' +
        '<w:r><w:rPr><w:color w:val="' +
        MUTED +
        '"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
        run("1", `<w:color w:val="${MUTED}"/><w:sz w:val="16"/>`) +
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
      `<w:pBdr><w:top w:val="single" w:sz="6" w:space="8" w:color="${LINE}"/></w:pBdr><w:jc w:val="right"/>`,
    ) +
    "</w:ftr>"
  );
}

export function buildDocx(
  meta: MeetingMeta,
  reports: string[],
  transcript: string,
  includeAppendix: boolean,
) {
  const who = [meta.nameA, meta.nameB].filter(Boolean).join(" e ");
  const date = formatDateIT(meta.date);
  const sections = sectionTitles(includeAppendix);
  const title = who ? `Report 1-to-1 — ${who}` : "Report incontro 1-to-1";

  let body = "";
  body += para("ONE TO ONE CLOUD", "Kicker");
  body += para(title, "Title");
  body += para("Documento di sintesi dell’incontro professionale", "Subtitle");
  body += rule();
  body += para(
    [date, meta.chapter].filter(Boolean).join("  ·  ") || "Data da confermare",
    "Meta",
  );
  body += empty();
  body += para("Partecipanti", "Heading2");
  body += peopleTable(meta);
  body += empty();
  if (meta.goal.trim()) {
    body += para("Obiettivo dell’incontro", "Heading2");
    body += para(meta.goal.trim(), "Quote");
  }
  body += para("Come leggere questo report", "Heading2");
  body += taggedLine("[DICHIARATO] informazione riportata nell’incontro.");
  body += taggedLine("[CONCORDATO] impegno reciproco assunto dalle parti.");
  body += taggedLine("[PROPOSTA AI] ipotesi da validare prima di qualsiasi azione.");
  body += pageBreak();

  body += para("Indice", "TOCHeading");
  body += para("Sezioni del documento", "Muted");
  sections.forEach((s) => {
    body += tocEntry(s.n, s.title, s.bookmark);
  });
  body += pageBreak();

  REPORT_TITLES.forEach((t, i) => {
    const heading = para(`${String(i + 1).padStart(2, "0")}  ${t}`, "Heading1");
    body += bookmark(i + 1, `sec${i + 1}`, heading);
    body += bodyLines(reports[i] || "");
  });

  if (includeAppendix) {
    body += bookmark(
      20,
      "secAppendix",
      para("Appendice — Trascrizione revisionata", "Heading1"),
    );
    body += para(
      "Testo integrale revisionato della conversazione, in coda al report.",
      "Muted",
    );
    (transcript.trim() || "Nessuna trascrizione disponibile.")
      .split("\n")
      .forEach((line) => {
        body += para(line || " ", "Appendix");
      });
  }

  const prefix = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const files: Record<string, string> = {
    "[Content_Types].xml":
      prefix +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      "</Types>",
    "_rels/.rels":
      prefix +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
    "word/_rels/document.xml.rels":
      prefix +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
      '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      "</Relationships>",
    "word/document.xml":
      prefix +
      `<w:document xmlns:w="${w}" xmlns:r="${r}"><w:body>` +
      body +
      "<w:sectPr>" +
      '<w:headerReference w:type="default" r:id="rId2"/>' +
      '<w:footerReference w:type="default" r:id="rId3"/>' +
      '<w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1418" w:right="1276" w:bottom="1418" w:left="1276" w:header="709" w:footer="709"/>' +
      "</w:sectPr></w:body></w:document>",
    "word/header1.xml": headerXml(),
    "word/footer1.xml": footerXml(who),
    "word/settings.xml":
      prefix +
      `<w:settings xmlns:w="${w}">` +
      '<w:displayBackgroundShape/>' +
      "</w:settings>",
    "word/styles.xml":
      prefix +
      `<w:styles xmlns:w="${w}">` +
      "<w:docDefaults><w:rPrDefault><w:rPr>" +
      '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
      `<w:sz w:val="22"/><w:color w:val="${INK}"/>` +
      "</w:rPr></w:rPrDefault>" +
      '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/>' +
      "</w:pPr></w:pPrDefault></w:docDefaults>" +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Kicker"><w:name w:val="Kicker"/>' +
      '<w:pPr><w:spacing w:after="40"/></w:pPr>' +
      `<w:rPr><w:smallCaps/><w:color w:val="${ACCENT}"/><w:sz w:val="20"/><w:spacing w:val="80"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>' +
      '<w:pPr><w:spacing w:before="40" w:after="80"/></w:pPr>' +
      `<w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="${INK}"/><w:sz w:val="52"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/>' +
      '<w:pPr><w:spacing w:after="120"/></w:pPr>' +
      `<w:rPr><w:i/><w:color w:val="${MUTED}"/><w:sz w:val="24"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/>' +
      `<w:rPr><w:color w:val="${MUTED}"/><w:sz w:val="20"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="140"/>' +
      `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="${LINE}"/></w:pBdr>` +
      '<w:outlineLvl w:val="0"/></w:pPr>' +
      `<w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="${ACCENT}"/><w:sz w:val="28"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr>' +
      `<w:rPr><w:b/><w:color w:val="${INK}"/><w:sz w:val="22"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/>' +
      '<w:pPr><w:spacing w:after="80"/></w:pPr>' +
      `<w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="${INK}"/><w:sz w:val="36"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/>' +
      '<w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr>' +
      `<w:rPr><w:color w:val="${INK}"/><w:sz w:val="22"/></w:rPr></w:style>` +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/>' +
      `<w:rPr><w:color w:val="${ACCENT}"/><w:u w:val="none"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Label"><w:name w:val="Label"/>' +
      '<w:pPr><w:spacing w:after="40"/></w:pPr>' +
      `<w:rPr><w:smallCaps/><w:color w:val="${ACCENT}"/><w:sz w:val="16"/><w:spacing w:val="40"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Name"><w:name w:val="Name"/>' +
      '<w:pPr><w:spacing w:after="40"/></w:pPr>' +
      `<w:rPr><w:b/><w:color w:val="${INK}"/><w:sz w:val="24"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Muted"><w:name w:val="Muted"/>' +
      `<w:rPr><w:i/><w:color w:val="${MUTED}"/><w:sz w:val="20"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/>' +
      `<w:pPr><w:spacing w:after="200"/><w:ind w:left="200"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="${ACCENT}"/></w:pBdr></w:pPr>` +
      `<w:rPr><w:i/><w:color w:val="${INK}"/><w:sz w:val="22"/></w:rPr></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Appendix"><w:name w:val="Appendix"/>' +
      '<w:pPr><w:spacing w:after="60" w:line="260" w:lineRule="auto"/></w:pPr>' +
      `<w:rPr><w:color w:val="${INK}"/><w:sz w:val="18"/></w:rPr></w:style>` +
      "</w:styles>",
  };

  const packed = zip(files);
  return new Blob([packed], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
