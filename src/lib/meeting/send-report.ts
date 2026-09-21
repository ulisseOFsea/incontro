import { createServerFn } from "@tanstack/react-start";
import { ConnectorType, GmailTools } from "@/lib/app-data";
import { isEmail } from "@/lib/utils";

export const REPORT_CC = "info@consulentesmart.com";
export const REPORT_FROM = "info@consulentesmart.com";

export type SendReportResult =
  | { ok: true; to: string[]; cc: string[] }
  | {
      ok: false;
      error: string;
      loginUrl?: string;
      pending?: boolean;
      loginRequired?: boolean;
    };

type SendInput = {
  to: string[];
  cc: string[];
  names: string[];
  subject: string;
  body: string;
  html: string;
  filename: string;
  docxBase64: string;
};

type CallTool = (
  tool: string,
  args: Record<string, unknown>,
  options: { connectorType: string },
) => Promise<{
  ok: boolean;
  data: unknown;
  errorMessage?: string;
  loginUrl?: string;
  pending?: boolean;
  loginRequired?: boolean;
}>;

function italianError(kind: string | undefined, fallback: string) {
  switch (kind) {
    case "pending":
      return "Collegamento a Gmail in corso. Attendi e riprova.";
    case "login":
      return "Continua con Grok per autorizzare l’invio da Gmail.";
    case "not_connected":
      return "Collega Gmail in Grok per inviare il documento ai partecipanti.";
    case "scope_denied":
      return "Gmail non consente l’invio da questa app. Controlla i permessi.";
    case "access_denied":
      return "Accesso a Gmail non disponibile.";
    default:
      return fallback;
  }
}

function unwrap(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const o = input as Record<string, unknown>;
  if (Array.isArray(o.to) || typeof o.docxBase64 === "string") return o;
  if (o.data && typeof o.data === "object") return o.data;
  return o;
}

function parseInput(input: unknown): SendInput {
  const d = unwrap(input) as Partial<SendInput>;
  const to = [...new Set((d.to ?? []).map((s) => String(s).trim().toLowerCase()))].filter(
    isEmail,
  );
  const cc = [
    ...new Set(
      [REPORT_CC, ...(d.cc ?? [])].map((s) => String(s).trim().toLowerCase()).filter(isEmail),
    ),
  ].filter((email) => !to.includes(email));
  if (to.length < 1) throw new Error("Inserisci almeno un’email valida.");
  if (to.length > 4) throw new Error("Troppe email.");
  if (!d.docxBase64 || typeof d.docxBase64 !== "string") {
    throw new Error("Documento Word mancante.");
  }
  const docxBase64 = d.docxBase64.replace(/\s/g, "");
  if (docxBase64.length < 80) throw new Error("Documento Word mancante.");
  if (docxBase64.length > 6_000_000) throw new Error("Documento troppo grande per l’invio.");
  return {
    to,
    cc,
    names: (d.names ?? []).map((n) => String(n).slice(0, 80)),
    subject: String(d.subject || "Report incontro 1-to-1").slice(0, 180),
    body: String(d.body || "").slice(0, 20_000),
    html: String(d.html || "").slice(0, 80_000),
    filename: String(d.filename || "Report-1to1.docx")
      .replace(/[^\w.\- ()]+/g, "_")
      .slice(0, 80),
    docxBase64,
  };
}

function pickDraftId(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as Record<string, unknown>;
  for (const key of ["draft_id", "draftId", "id"]) {
    if (typeof o[key] === "string" && o[key]) return o[key];
  }
  if (o.draft && typeof o.draft === "object") {
    const draft = o.draft as Record<string, unknown>;
    if (typeof draft.id === "string" && draft.id) return draft.id;
    if (typeof draft.draft_id === "string" && draft.draft_id) return draft.draft_id;
  }
  return "";
}

async function writeArtifact(filename: string, docxBase64: string) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = "/home/workdir/artifacts";
  await mkdir(dir, { recursive: true });
  const safe = filename.replace(/[^\w.\-]+/g, "_") || "Report-1to1.docx";
  await writeFile(join(dir, safe), Buffer.from(docxBase64, "base64"));
  return `/${safe}`;
}

async function sendWithWord(
  callTool: CallTool,
  data: SendInput,
): Promise<{ ok: true } | { ok: false; result: Awaited<ReturnType<CallTool>> }> {
  const options = { connectorType: ConnectorType.Gmail };
  const mime =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const attachment = {
    filename: data.filename,
    name: data.filename,
    fileName: data.filename,
    mimeType: mime,
    mime_type: mime,
    content: data.docxBase64,
    data: data.docxBase64,
    bytes: data.docxBase64,
  };
  const { buildRawMime } = await import("./send-report-mime.server");
  const raw = buildRawMime({ ...data, from: REPORT_FROM });
  let artifactPath = "";
  try {
    artifactPath = await writeArtifact(data.filename, data.docxBase64);
  } catch {
    artifactPath = "";
  }

  const draft = await callTool(
    GmailTools.createDraft,
    {
      to: data.to,
      cc: data.cc,
      from: REPORT_FROM,
      subject: data.subject,
      body: data.body,
      body_html: data.html,
    },
    options,
  );
  if (draft.ok) {
    const draftId = pickDraftId(draft.data);
    if (draftId) {
      let attached = false;
      if (artifactPath) {
        const wrote = await callTool(
          GmailTools.writeAttachment,
          {
            draft_id: draftId,
            artifact_path: artifactPath,
            file_name: data.filename,
            mime_type: mime,
          },
          options,
        );
        attached = wrote.ok;
      }
      if (!attached) {
        await callTool(
          GmailTools.writeAttachment,
          {
            draft_id: draftId,
            file_name: data.filename,
            mime_type: mime,
            content: data.docxBase64,
            data: data.docxBase64,
          },
          options,
        );
      }
      const sent = await callTool(GmailTools.sendDraft, { draft_id: draftId }, options);
      if (sent.ok) return { ok: true };
      return { ok: false, result: sent };
    }
  }

  const withFile: Array<{ tool: string; args: Record<string, unknown> }> = [
    {
      tool: GmailTools.sendMessage,
      args: {
        to: data.to,
        cc: data.cc,
        from: REPORT_FROM,
        subject: data.subject,
        body: data.body,
        body_html: data.html,
        attachments: [attachment],
      },
    },
    {
      tool: GmailTools.sendMessage,
      args: {
        to: data.to,
        cc: data.cc,
        from: REPORT_FROM,
        subject: data.subject,
        body: data.body,
        raw,
      },
    },
    {
      tool: GmailTools.sendMessage,
      args: {
        to: data.to,
        cc: data.cc,
        from: REPORT_FROM,
        subject: data.subject,
        body: data.body,
        body_html: data.html,
      },
    },
  ];
  let last = draft.ok ? { ok: false, data: null, errorMessage: "Invio bozza non riuscito." } : draft;
  for (const attempt of withFile) {
    const result = await callTool(attempt.tool, attempt.args, options);
    if (result.ok) return { ok: true };
    last = result;
    if (result.loginRequired || result.pending) return { ok: false, result };
  }
  return { ok: false, result: last };
}

export const sendMeetingReport = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(input))
  .handler(async ({ data }): Promise<SendReportResult> => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const { classifyCallToolError } = await import("@/lib/app-data/errors");
    const sent = await sendWithWord(callTool as CallTool, data);
    if (sent.ok) return { ok: true, to: data.to, cc: data.cc };
    const classified = classifyCallToolError(sent.result);
    return {
      ok: false,
      error: italianError(
        classified?.kind,
        classified?.message || sent.result.errorMessage || "Invio non riuscito.",
      ),
      loginUrl: sent.result.loginUrl,
      pending: sent.result.pending,
      loginRequired: sent.result.loginRequired,
    };
  });
