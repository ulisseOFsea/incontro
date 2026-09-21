import { clock } from "@/lib/utils";

type Word = {
  text?: string;
  start?: number;
  end?: number;
  speaker?: number | string;
};

export function formatTranscription(payload: {
  text?: string;
  transcript?: string;
  words?: Word[];
  segments?: Array<{ start?: number; speaker?: number | string; text?: string }>;
  channels?: Array<{ text?: string; words?: Word[] }>;
}) {
  const direct = (payload.text || payload.transcript || "").trim();

  if (Array.isArray(payload.segments) && payload.segments.length) {
    const fromSegments = payload.segments
      .map((s) => {
        const t = (s.text ?? "").trim();
        if (!t) return "";
        return `[${clock(s.start || 0)}] Voce ${s.speaker ?? "?"}: ${t}`;
      })
      .filter(Boolean)
      .join("\n\n");
    if (fromSegments) return fromSegments;
  }

  const words = payload.words ?? [];
  if (words.length) {
    const lines: string[] = [];
    let speaker: number | string | undefined = words[0]?.speaker;
    let start = words[0]?.start ?? 0;
    let lastEnd = words[0]?.end ?? start;
    let buf: string[] = [];

    const flush = () => {
      if (!buf.length) return;
      lines.push(`[${clock(start)}] Voce ${speaker ?? "?"}: ${buf.join(" ")}`);
      buf = [];
    };

    for (const w of words) {
      const token = (w.text ?? "").trim();
      if (!token) continue;
      const gap = (w.start ?? 0) - lastEnd;
      const speakerChanged = w.speaker !== speaker && buf.length > 0;
      if (speakerChanged || (gap > 1.5 && buf.length)) {
        flush();
        speaker = w.speaker;
        start = w.start ?? lastEnd;
      }
      if (!buf.length) {
        speaker = w.speaker;
        start = w.start ?? 0;
      }
      buf.push(token);
      lastEnd = w.end ?? w.start ?? lastEnd;
    }
    flush();
    if (lines.length) return lines.join("\n\n");
  }

  if (Array.isArray(payload.channels) && payload.channels.length) {
    const fromChannels = payload.channels
      .map((ch, i) => {
        const t = (ch.text ?? "").trim();
        return t ? `Voce ${i + 1}: ${t}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (fromChannels) return fromChannels;
  }

  return direct;
}
