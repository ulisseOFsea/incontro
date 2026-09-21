import { createFileRoute } from "@tanstack/react-router";
import { analyzeWithXai } from "@/lib/ai/xai.server";
import { META_KEYS, type MeetingMeta } from "@/lib/meeting/types";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            meta?: MeetingMeta;
            transcript?: string;
          };
          if (!body?.meta || typeof body.transcript !== "string") {
            return Response.json({ error: "Dati mancanti." }, { status: 400 });
          }
          if (META_KEYS.some((k) => typeof body.meta?.[k] !== "string")) {
            return Response.json({ error: "Metadati non validi." }, { status: 400 });
          }
          const { reports, derived } = await analyzeWithXai(body.meta, body.transcript);
          return Response.json({ reports, derived });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Analisi non riuscita.";
          const status = message.includes("non sono disponibili") ? 503 : 400;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
