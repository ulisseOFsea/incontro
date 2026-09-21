import type { MeetingMeta } from "./types";

async function readJson(res: Response) {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Risposta del servizio non valida."
        : `Trascrizione non riuscita (HTTP ${res.status}).`,
    );
  }
}

function fileToBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Lettura audio non riuscita."));
    reader.readAsDataURL(file);
  });
}

export async function requestTranscription(
  file: File,
  names: string[],
  signal: AbortSignal,
) {
  const data = await fileToBase64(file);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name || "incontro.webm",
      type: file.type || "application/octet-stream",
      data,
      names: names.filter(Boolean).join("|"),
    }),
    signal,
  });
  const body = await readJson(res);
  const text = typeof body.text === "string" ? body.text : "";
  const error = typeof body.error === "string" ? body.error : "";
  if (!res.ok || !text) {
    throw new Error(error || "Trascrizione non riuscita.");
  }
  return text;
}

export type AnalysisResult = {
  reports: string[];
  derived: string[];
};

export async function requestAnalysis(
  meta: MeetingMeta,
  transcript: string,
  signal: AbortSignal,
): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meta, transcript }),
    signal,
  });
  const body = await readJson(res);
  const reports = Array.isArray(body.reports) ? body.reports : null;
  const derivedRaw = Array.isArray(body.derived) ? body.derived : [];
  const error = typeof body.error === "string" ? body.error : "";
  if (!res.ok || !reports || reports.some((x) => typeof x !== "string")) {
    throw new Error(error || "Analisi non riuscita.");
  }
  return {
    reports: reports as string[],
    derived: derivedRaw.map((x) => (typeof x === "string" ? x : "")),
  };
}
