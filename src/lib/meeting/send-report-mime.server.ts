type MimeInput = {
  to: string[];
  cc?: string[];
  from?: string;
  subject: string;
  body: string;
  html: string;
  filename: string;
  docxBase64: string;
};

function encodeSubject(subject: string) {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function wrap(b64: string) {
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

function escapeHtml(s: string) {
  const amp = "\u0026amp;";
  const lt = "\u0026lt;";
  const gt = "\u0026gt;";
  const quot = "\u0026quot;";
  return s
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
}

export function buildRawMime(data: MimeInput) {
  const boundary = `mix${crypto.randomUUID().replace(/-/g, "")}`;
  const alt = `alt${crypto.randomUUID().replace(/-/g, "")}`;
  const textB64 = Buffer.from(data.body || data.subject, "utf8").toString("base64");
  const htmlB64 = Buffer.from(
    data.html || `<pre>${escapeHtml(data.body)}</pre>`,
    "utf8",
  ).toString("base64");
  const mime = [
    ...(data.from ? [`From: ${data.from}`] : []),
    `To: ${data.to.join(", ")}`,
    ...(data.cc?.length ? [`Cc: ${data.cc.join(", ")}`] : []),
    `Subject: ${encodeSubject(data.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(textB64),
    `--${alt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(htmlB64),
    `--${alt}--`,
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${data.filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${data.filename}"`,
    "",
    wrap(data.docxBase64),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}
