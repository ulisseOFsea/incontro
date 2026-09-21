import { createFileRoute } from "@tanstack/react-router";
import { transcribeWithXai } from "@/lib/ai/xai.server";

function asAudioBlob(
  value: FormDataEntryValue | null,
): { blob: Blob; name: string } | null {
  if (!value || typeof value === "string") return null;
  const blob = value as Blob;
  if (typeof blob.size !== "number" || blob.size === 0) return null;
  const name = "name" in value && typeof value.name === "string" && value.name
    ? value.name
    : "incontro.webm";
  return { blob, name };
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") || "";
          let blob: Blob | null = null;
          let filename = "incontro.webm";
          let names = "";

          if (contentType.includes("application/json")) {
            const body = (await request.json()) as {
              name?: string;
              type?: string;
              data?: string;
              names?: string;
            };
            if (!body?.data || typeof body.data !== "string") {
              return Response.json(
                { error: "Registra o carica prima un audio." },
                { status: 400 },
              );
            }
            const bytes = Buffer.from(body.data, "base64");
            if (!bytes.length) {
              return Response.json(
                { error: "Registra o carica prima un audio." },
                { status: 400 },
              );
            }
            blob = new Blob([new Uint8Array(bytes)], {
              type: body.type || "application/octet-stream",
            });
            filename = body.name || filename;
            names = String(body.names ?? "");
          } else {
            const form = await request.formData();
            const audio = asAudioBlob(form.get("file"));
            if (!audio) {
              return Response.json(
                { error: "Registra o carica prima un audio." },
                { status: 400 },
              );
            }
            blob = audio.blob;
            filename = audio.name;
            names = String(form.get("names") ?? "");
          }

          const keyterms = ["BNI", "one to one", ...names.split("|")].filter(Boolean);
          const text = await transcribeWithXai(blob, filename, keyterms);
          return Response.json({ text });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Trascrizione non riuscita.";
          const status = message.includes("non sono disponibili") ? 503 : 400;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
