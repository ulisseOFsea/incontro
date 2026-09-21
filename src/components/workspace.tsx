import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Check,
  ClipboardList,
  Cloud,
  FolderOpen,
  Loader2,
  Save,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrepareStep } from "@/components/steps/prepare";
import { AudioStep } from "@/components/steps/audio";
import { TranscriptStep } from "@/components/steps/transcript";
import { AnalysisStep } from "@/components/steps/analysis";
import { ExportStep } from "@/components/steps/export";
import { UsageLog, UsageTracker } from "@/components/usage-log";
import {
  getAudioSnapshot,
  restoreAudioFromDb,
  subscribeAudio,
} from "@/lib/meeting/audio";
import { parseBackup, useMeetingStore } from "@/lib/meeting/store";
import { useUsageStore } from "@/lib/meeting/usage";
import { STEPS, sourceFingerprint } from "@/lib/meeting/types";
import { downloadBlob, isEmail, todayISO } from "@/lib/utils";

export function Workspace() {
  const step = useMeetingStore((s) => s.step);
  const setStep = useMeetingStore((s) => s.setStep);
  const busy = useMeetingStore((s) => s.busy);
  const setBusy = useMeetingStore((s) => s.setBusy);
  const notice = useMeetingStore((s) => s.notice);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const dirty = useMeetingStore((s) => s.dirty);
  const meta = useMeetingStore((s) => s.meta);
  const patchMeta = useMeetingStore((s) => s.patchMeta);
  const loadBackup = useMeetingStore((s) => s.loadBackup);
  const loadSample = useMeetingStore((s) => s.loadSample);
  const resetMeeting = useMeetingStore((s) => s.resetMeeting);
  const exportBackup = useMeetingStore((s) => s.exportBackup);
  const reportSource = useMeetingStore((s) => s.reportSource);
  const transcript = useMeetingStore((s) => s.transcript);
  const reports = useMeetingStore((s) => s.reports);
  const reviewed = useMeetingStore((s) => s.reviewedDoc);

  const abortRef = useRef<AbortController | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [showLog, setShowLog] = useState(false);
  const audio = useSyncExternalStore(
    subscribeAudio,
    getAudioSnapshot,
    getAudioSnapshot,
  );

  useEffect(() => {
    void Promise.resolve(useMeetingStore.persist.rehydrate()).then(() => {
      useMeetingStore.setState({ consentCloud: true });
      const current = useMeetingStore.getState().meta;
      patchMeta({
        emailA: current.emailA ?? "",
        emailB: current.emailB ?? "",
        date: current.date || todayISO(),
      });
    });
    void restoreAudioFromDb();
    void fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d: { available?: boolean }) => setAiAvailable(Boolean(d.available)))
      .catch(() => setAiAvailable(false));
  }, [patchMeta]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, busy]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, showLog]);

  const stale =
    Boolean(reportSource) && reportSource !== sourceFingerprint(meta, transcript);

  const done = [
    isEmail(meta.emailA) && isEmail(meta.emailB),
    audio.clips.length > 0,
    Boolean(transcript.trim()),
    reports.some((r) => r.trim()),
    reviewed,
  ];

  const who = [meta.nameA, meta.nameB].filter(Boolean).join(" · ");

  function saveBackup() {
    downloadBlob(
      JSON.stringify(exportBackup(), null, 2),
      "incontro-backup.json",
      "application/json",
    );
    setNotice(
      "Backup salvato senza audio. Salva separatamente l’audio se lo hai registrato.",
    );
  }

  async function onBackupFile(file: File | undefined) {
    if (!file || busy) return;
    try {
      if (file.size > 3_000_000) throw new Error("Backup troppo grande.");
      const parsed = parseBackup(JSON.parse(await file.text()));
      if (!confirm("Sostituire i dati attuali con questo backup? L’audio corrente sarà scollegato.")) {
        return;
      }
      loadBackup(parsed);
      useUsageStore.getState().closeSession();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Backup non valido.", true);
    }
  }

  function onNewMeeting() {
    if (!confirm("Iniziare un nuovo incontro? I dati non salvati in un backup andranno persi.")) {
      return;
    }
    useUsageStore.getState().closeSession();
    resetMeeting();
    patchMeta({ date: todayISO() });
    setShowLog(false);
    setNotice("Nuovo incontro. Compila i partecipanti per iniziare.");
  }

  function cancelJob() {
    abortRef.current?.abort();
  }

  return (
    <>
      <UsageTracker />
      <div className="grid min-h-dvh min-w-0 overflow-x-hidden lg:grid-cols-[var(--width-sidebar)_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-line bg-surface px-5 py-5 lg:border-b-0 lg:border-r lg:py-6">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 place-items-center rounded-lg bg-accent text-accent-fg"
              aria-hidden="true"
            >
              <Cloud className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <strong className="font-display block truncate text-lg leading-tight">
                One to One Cloud
              </strong>
              <small className="text-muted text-sm">Spazio 1-to-1 · AI attiva</small>
            </div>
          </div>

          {who ? (
            <p className="mt-4 truncate rounded-md bg-sky px-3 py-2 text-sm font-medium">{who}</p>
          ) : null}

          <p className="text-muted mt-6 mb-2 hidden text-xs font-semibold tracking-widest lg:block">
            FASI
          </p>
          <nav
            aria-label="Fasi dell’incontro"
            className="flex max-w-full gap-1.5 overflow-x-auto pb-1 lg:grid lg:gap-1 lg:overflow-visible"
          >
            {STEPS.map((item, i) => {
              const selected = !showLog && step === i;
              const complete = done[i];
              return (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => {
                    setShowLog(false);
                    setStep(i);
                  }}
                  className={
                    "flex min-h-11 shrink-0 items-center gap-3 rounded-md px-2.5 text-left text-sm transition-colors duration-150 " +
                    (selected
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-muted hover:bg-sky hover:text-ink")
                  }
                  aria-current={selected ? "step" : undefined}
                >
                  <span
                    className={
                      "grid size-7 place-items-center rounded-sm text-xs " +
                      (selected
                        ? "bg-accent text-accent-fg"
                        : complete
                          ? "bg-success-soft text-success"
                          : "border border-line bg-surface")
                    }
                    aria-hidden="true"
                  >
                    {complete && !selected ? <Check className="size-3.5" /> : item.n}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 hidden h-1 overflow-hidden rounded-full bg-sky lg:block">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="mt-5 grid gap-2 border-t border-line pt-4">
            <Button
              variant={showLog ? "default" : "secondary"}
              size="full"
              onClick={() => setShowLog((v) => !v)}
            >
              <ClipboardList className="size-4" />
              {showLog ? "Torna all’incontro" : "Registro attività"}
            </Button>
            <details className="rounded-md bg-sky px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">File e sessioni</summary>
              <div className="mt-2 grid gap-2 pb-1">
                <Button variant="ghost" size="full" onClick={saveBackup} disabled={busy}>
                  <Save className="size-4" />
                  Salva backup
                </Button>
                <Button
                  variant="ghost"
                  size="full"
                  disabled={busy}
                  onClick={() => backupInputRef.current?.click()}
                >
                  <FolderOpen className="size-4" />
                  Apri backup
                </Button>
                <Button variant="ghost" size="full" disabled={busy} onClick={onNewMeeting}>
                  Nuovo incontro
                </Button>
                <Button
                  variant="ghost"
                  size="full"
                  disabled={busy}
                  onClick={() => {
                    useUsageStore.getState().closeSession();
                    loadSample();
                    setShowLog(false);
                  }}
                >
                  Carica esempio
                </Button>
              </div>
            </details>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                void onBackupFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <p className="text-muted mt-5 hidden text-xs leading-relaxed lg:block">
            Strumento indipendente per incontri 1-to-1. Non è un’applicazione ufficiale BNI.
          </p>
        </aside>

        <main
          ref={mainRef}
          className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-8 lg:max-h-dvh lg:overflow-y-auto lg:px-12 lg:py-8"
        >
          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-accent text-xs font-semibold tracking-widest">
                {showLog
                  ? "REGISTRO"
                  : `FASE ${STEPS[step]?.n} · ${step + 1} DI ${STEPS.length}`}
              </p>
              <h1 className="font-display text-title mt-1 leading-tight">
                {showLog ? "Registro di utilizzo" : STEPS[step]?.title}
              </h1>
              {!showLog && meta.chapter ? (
                <p className="text-muted mt-1 text-sm">{meta.chapter}</p>
              ) : null}
            </div>
            {busy ? (
              <Button variant="danger" onClick={cancelJob}>
                <Square className="size-3.5 fill-current" />
                Interrompi
              </Button>
            ) : null}
          </header>

          {notice.text ? (
            <div
              id="notice"
              role="status"
              aria-live="polite"
              className={
                "mb-4 rounded-lg px-4 py-3 text-sm " +
                (notice.error
                  ? "bg-danger-soft text-danger"
                  : "bg-accent-soft text-accent")
              }
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {notice.text}
                </span>
              ) : (
                notice.text
              )}
            </div>
          ) : null}

          {stale && !showLog ? (
            <div className="mb-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
              Trascrizione o partecipanti sono cambiati dopo l’analisi. Rigenera il report
              oppure rivedilo prima di esportare.
            </div>
          ) : null}

          {showLog ? (
            <UsageLog />
          ) : (
            <div className={busy ? "pointer-events-none opacity-60" : undefined}>
              {step === 0 ? <PrepareStep /> : null}
              {step === 1 ? (
                <AudioStep abortRef={abortRef} setBusy={setBusy} aiAvailable={aiAvailable} />
              ) : null}
              {step === 2 ? (
                <TranscriptStep abortRef={abortRef} setBusy={setBusy} aiAvailable={aiAvailable} />
              ) : null}
              {step === 3 ? (
                <AnalysisStep abortRef={abortRef} setBusy={setBusy} aiAvailable={aiAvailable} />
              ) : null}
              {step === 4 ? <ExportStep /> : null}
            </div>
          )}

          {audio.clips.length && step !== 1 && !showLog ? (
            <p className="text-muted mt-4 text-sm">
              {audio.clips.length === 1
                ? `Audio in sessione: ${audio.clips[0].file.name}`
                : `${audio.clips.length} spezzoni audio della stessa discussione`}
            </p>
          ) : null}
        </main>
      </div>
    </>
  );
}
