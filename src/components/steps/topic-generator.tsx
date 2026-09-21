import { useMemo, useState } from "react";
import {
  Check,
  Compass,
  GitMerge,
  Handshake,
  ListChecks,
  RefreshCw,
  Target,
  UserSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTopics } from "@/lib/meeting/topics";
import { useMeetingStore } from "@/lib/meeting/store";

const ICONS = {
  growth: Compass,
  value: Target,
  client: UserSearch,
  referral: Handshake,
  reciprocal: GitMerge,
  plan: ListChecks,
} as const;

export function TopicGenerator() {
  const meta = useMeetingStore((s) => s.meta);
  const [rotation, setRotation] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const topics = useMemo(() => buildTopics(meta, rotation), [meta, rotation]);
  const covered = topics.filter((t) => done[t.id]).length;

  function regenerate() {
    setRotation((n) => n + 1);
    setDone({});
  }

  return (
    <section className="panel step-enter flex min-h-0 flex-col sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Argomenti da coprire</h2>
          <p className="text-muted mt-1">
            Generatore per un 1-to-1 che produce referenze, non chiacchiere.
          </p>
        </div>
        <span className="rounded-full border border-line px-3 py-1.5 text-sm">
          {covered}/{topics.length} capisaldi
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={regenerate}>
          <RefreshCw className="size-4" />
          Genera una nuova serie
        </Button>
      </div>
      <p className="text-muted mt-3 text-sm">
        Le domande usano i profili di {meta.nameA || "A"} e {meta.nameB || "B"}. Segnate un
        caposaldo quando l’avete trattato.
      </p>

      <ol className="mt-5 grid gap-3">
        {topics.map((pillar, index) => {
          const Icon = ICONS[pillar.id as keyof typeof ICONS] ?? Compass;
          const checked = Boolean(done[pillar.id]);
          return (
            <li key={pillar.id}>
              <button
                type="button"
                onClick={() =>
                  setDone((current) => ({ ...current, [pillar.id]: !current[pillar.id] }))
                }
                className={
                  "w-full rounded-lg border p-4 text-left transition-colors duration-150 " +
                  (checked
                    ? "border-agreed/30 bg-agreed-bg"
                    : "border-line bg-sky hover:border-accent/40")
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold " +
                      (checked ? "bg-agreed text-accent-fg" : "bg-accent-soft text-accent")
                    }
                  >
                    {checked ? <Check className="size-4" /> : String(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="size-4 shrink-0" />
                      {pillar.title}
                    </p>
                    <ul className="mt-2 grid gap-1.5">
                      {pillar.prompts.map((prompt) => (
                        <li key={prompt} className="text-sm leading-relaxed">
                          {prompt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
