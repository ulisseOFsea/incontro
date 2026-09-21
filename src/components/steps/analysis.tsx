import { type MutableRefObject } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestAnalysis } from "@/lib/meeting/client-ai";
import { useMeetingStore } from "@/lib/meeting/store";
import { logUsage } from "@/lib/meeting/usage";
import { REPORT_TITLES } from "@/lib/meeting/types";

type Props = {
  abortRef: MutableRefObject<AbortController | null>;
  setBusy: (v: boolean) => void;
  aiAvailable: boolean | null;
};

export function AnalysisStep({ abortRef, setBusy, aiAvailable }: Props) {
  const reports = useMeetingStore((s) => s.reports);
  const setReport = useMeetingStore((s) => s.setReport);
  const setReports = useMeetingStore((s) => s.setReports);
  const markAnalyzed = useMeetingStore((s) => s.markAnalyzed);
  const transcript = useMeetingStore((s) => s.transcript);
  const meta = useMeetingStore((s) => s.meta);
  const checked = useMeetingStore((s) => s.checkedTranscript);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const setStep = useMeetingStore((s) => s.setStep);

  async function analyze() {
    const text = transcript.trim();
    if (!text) {
      setNotice("Inserisci prima la trascrizione.", true);
      return;
    }
    if (!meta.nameA.trim() || !meta.nameB.trim()) {
      setNotice("Inserisci i nomi dei due partecipanti.", true);
      return;
    }
    if (!checked) {
      setNotice("Rivedi interlocutori e trascrizione, poi conferma la verifica.", true);
      return;
    }
    if (reports.some((r) => r.trim()) && !confirm("Rigenerare e sostituire il report attuale?")) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setNotice("Analisi dell’incontro e delle opportunità in corso…");
    try {
      const next = await requestAnalysis(meta, text, controller.signal);
      setReports(next);
      markAnalyzed();
      setNotice("Analisi pronta. Rivedi le sezioni e conferma il report prima dell’esportazione.");
      logUsage("analisi", "Analisi e opportunità generate");
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      setNotice(
        aborted
          ? "Richiesta interrotta. I dati già presenti sono conservati."
          : err instanceof Error
            ? err.message
            : "Analisi non riuscita.",
        !aborted,
      );
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <section className="panel step-enter sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Dalle parole alle opportunità.</h2>
          <p className="text-muted mt-1">Rivedi ogni sezione e trasforma gli spunti in azioni concrete.</p>
        </div>
        <Button variant="secondary" onClick={() => void analyze()}>
          <RefreshCw className="size-4" />
          Rigenera con AI
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-sm bg-declared-bg px-2.5 py-1 text-xs font-bold text-declared">
          DICHIARATO
        </span>
        <span className="rounded-sm bg-agreed-bg px-2.5 py-1 text-xs font-bold text-agreed">
          CONCORDATO
        </span>
        <span className="rounded-sm bg-proposal-bg px-2.5 py-1 text-xs font-bold text-proposal">
          PROPOSTA AI
        </span>
      </div>

      <div className="mt-4 rounded-md border-l-[3px] border-accent bg-sky px-4 py-3 text-sm">
        Gli impegni richiedono conferma esplicita. Le proposte AI sono ipotesi da validare. Se
        responsabili o scadenze non sono stati definiti, indica “da concordare”.
      </div>

      <div className="mt-6 grid gap-5">
        {REPORT_TITLES.map((title, i) => (
          <article key={title}>
            <Label htmlFor={`r${i}`} className="text-accent">
              {String(i + 1).padStart(2, "0")} · {title}
            </Label>
            <Textarea
              id={`r${i}`}
              rows={6}
              value={reports[i] ?? ""}
              placeholder="Scrivi qui o genera l’analisi AI."
              onChange={(e) => setReport(i, e.target.value)}
            />
          </article>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={() => setStep(4)}>Rivedi il documento finale</Button>
      </div>
    </section>
  );
}
