import { createFileRoute } from "@tanstack/react-router";
import { getApiKey } from "@/lib/ai/xai.server";

export const Route = createFileRoute("/api/ai-status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ available: Boolean(getApiKey()) });
      },
    },
  },
});
