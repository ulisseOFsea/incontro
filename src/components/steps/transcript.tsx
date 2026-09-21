import { type MutableRefObject, useRef } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestAnalysis } from "@/lib/meeting/client-ai";
import { useMeetingStore } from "@/lib/meeting/store";
import { downloadBlob } from "@/lib/utils";

type Props = {
  abortRef: MutableRefObject<AbortController | null>;
  setBusy: (v: boolean) => void;
  aiAvailable: boolean | null;
};

export function TranscriptStep({ abortRef, setBusy, aiAvailable }: Props) {
  const transcript = useMeetingStore((s) => s.transcript);
  const setTranscript = useMeetingStore((s) => s.setTranscript);
  const checked = useMeetingStore((s) => s.checkedTranscript);
  const setChecked = useMeetingStore((s) => s.setCheckedTranscript);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const setStep = useMeetingStore((s) => s.setStep);
  const meta = useMeetingStore((s) => s.meta);
  const reports = useMeetingStore((s) => s.reports);
  const setReports = useMeetingStore((s) => s.setReports);
  const markAnalyzed = useMeetingStore((s) => s.markAnalyzed);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImport(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setNotice("File di testo troppo grande.", true);
      return;
    }
    if (transcript && !confirm("Sostituire la trascrizione?")) return;
    setTranscript(await file.text());
    setNotice("Trascrizione importata. Verifica nomi e attribuzione delle voci.");
  }

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
      setStep(3);
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
      <h2 className="font-display text-2xl">La conversazione, nero su bianco.</h2>
      <p className="text-muted mt-1">
        Rivedi nomi, numeri, passaggi incerti e attribuzione delle voci.
      </p>
      <div className="mt-4 rounded-md border-l-[3px] border-accent bg-sky px-4 py-3 text-sm text-ink">
        L’AI distingue le voci con etichette. Sostituiscile con i nomi corretti dopo l’ascolto;
        conserva i riferimenti temporali. Se l’identità è incerta, scrivi “voce da verificare”.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <FileText className="size-4" />
          Importa trascrizione TXT
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          hidden
          onChange={(e) => {
            void onImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          onClick={() =>
            downloadBlob(transcript, "trascrizione.txt", "text/plain;charset=utf-8")
          }
        >
          <Download className="size-4" />
          Salva testo
        </Button>
      </div>

      <Label htmlFor="transcript" className="mt-5">
        Trascrizione revisionabile
      </Label>
      <Textarea
        id="transcript"
        rows={16}
        className="min-h-80"
        value={transcript}
        placeholder="[00:00:05] Nome partecipante: …&#10;&#10;Puoi anche incollare una trascrizione già disponibile."
        onChange={(e) => setTranscript(e.target.value)}
      />

      <CheckRow
        id="checkedTranscript"
        checked={checked}
        onChange={setChecked}
        className="mt-4"
      >
        Ho verificato la trascrizione e l’attribuzione degli interlocutori.
      </CheckRow>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void analyze()}>Genera analisi e opportunità</Button>
        <Button variant="secondary" onClick={() => setStep(3)}>
          Compila il report manualmente
        </Button>
      </div>
    </section>
  );
}
