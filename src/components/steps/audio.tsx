import { type MutableRefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Mic, Pause, Play, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicGenerator } from "@/components/steps/topic-generator";
import { CheckRow } from "@/components/ui/checkbox";
import { decodeToWav, mergeAudioFiles, mergeToWav } from "@/lib/meeting/audio-convert";
import { addAudioFile, getAudioSnapshot, removeAudioClip, setAudioFile, subscribeAudio } from "@/lib/meeting/audio";
import { requestTranscription } from "@/lib/meeting/client-ai";
import { micErrorMessage, startMicRecording, type RecorderHandle } from "@/lib/meeting/live-record";
import { useMeetingStore } from "@/lib/meeting/store";
import { logUsage } from "@/lib/meeting/usage";
import { clock, downloadBlob } from "@/lib/utils";

type RecState = "idle" | "recording" | "paused";

type Props = {
  abortRef: MutableRefObject<AbortController | null>;
  setBusy: (v: boolean) => void;
  aiAvailable: boolean | null;
};

export function AudioStep({ abortRef, setBusy, aiAvailable }: Props) {
  const consent = useMeetingStore((s) => s.consentRecord);
  const setConsent = useMeetingStore((s) => s.setConsentRecord);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const setTranscript = useMeetingStore((s) => s.setTranscript);
  const setChecked = useMeetingStore((s) => s.setCheckedTranscript);
  const setStep = useMeetingStore((s) => s.setStep);
  const meta = useMeetingStore((s) => s.meta);
  const busy = useMeetingStore((s) => s.busy);

  const audio = useSyncExternalStore(subscribeAudio, getAudioSnapshot, getAudioSnapshot);
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const liveRef = useRef<RecorderHandle | null>(null);
  const recStateRef = useRef<RecState>("idle");
  const spentRef = useRef(0);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      void liveRef.current?.stop().catch(() => undefined);
    };
  }, []);

  function setRec(next: RecState) {
    recStateRef.current = next;
    setRecState(next);
  }

  function durationMs() {
    return (
      spentRef.current +
      (recStateRef.current === "recording" ? performance.now() - startedRef.current : 0)
    );
  }

  function tick() {
    setElapsed(durationMs());
  }

  async function startRecord() {
    if (recStateRef.current !== "idle" || busy) return;
    if (!consent) {
      setNotice("Conferma l’accordo dei partecipanti prima di registrare.", true);
      return;
    }
    if (audio.clips.length) {
      setNotice("Nuovo spezzone. Si aggiunge a quelli già registrati.");
    }
    setRec("recording");
    setElapsed(0);
    spentRef.current = 0;
    startedRef.current = performance.now();
    try {
      const handle = await startMicRecording();
      liveRef.current = handle;
      startedRef.current = performance.now();
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(tick, 250);
      setNotice("Registrazione avviata. Mantieni aperta questa pagina fino al termine.");
      logUsage("registrazione", "Avvio registrazione audio");
    } catch (err) {
      liveRef.current = null;
      if (timerRef.current) window.clearInterval(timerRef.current);
      setRec("idle");
      setElapsed(0);
      setNotice(micErrorMessage(err), true);
    }
  }

  function pauseRecord() {
    const handle = liveRef.current;
    if (!handle || recStateRef.current === "idle") return;
    if (recStateRef.current === "recording") {
      spentRef.current = durationMs();
      handle.pause();
      setRec("paused");
    } else {
      startedRef.current = performance.now();
      handle.resume();
      setRec("recording");
    }
  }

  async function stopRecord() {
    const handle = liveRef.current;
    if (!handle || recStateRef.current === "idle") return;
    spentRef.current = durationMs();
    liveRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRec("idle");
    setElapsed(spentRef.current);
    setBusy(true);
    setNotice("Salvo la registrazione in MP3…");
    try {
      const file = await handle.stop();
      addAudioFile(file, spentRef.current);
      const n = getAudioSnapshot().clips.length;
      setNotice(
        n > 1
          ? `Spezzone ${n} salvato. Puoi registrarne un altro, poi trascrivi tutto insieme.`
          : "Spezzone salvato. Puoi registrarne un altro oppure trascrivere.",
      );
      logUsage("registrazione", n > 1 ? `Spezzone audio ${n} salvato` : "Spezzone audio salvato");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Registrazione non salvata.", true);
    } finally {
      setBusy(false);
    }
  }

  function onUpload(file: File | undefined) {
    if (!file) return;
    if (recState !== "idle") {
      setNotice("Termina prima la registrazione.", true);
      return;
    }
    if (audio.clips.length) {
      setNotice("File aggiunto come spezzone della stessa discussione.");
    }
    addAudioFile(file);
    setNotice("Audio caricato. Puoi aggiungere altri spezzoni prima di trascrivere.");
  }

  async function transcribe(source?: File) {
    const clips = source ? [source] : audio.clips.map((c) => c.file);
    if (!clips.length) {
      setNotice("Registra uno o più spezzoni, carica un audio oppure prova l’esempio.", true);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      let working = source ?? null;
      if (!working) {
        setNotice(
          clips.length > 1
            ? `Unisco ${clips.length} spezzoni in un’unica discussione…`
            : "Preparazione audio…",
        );
        working = await mergeToWav(clips, `incontro-${Date.now()}`);
      } else if (!working.type.includes("wav")) {
        working = await decodeToWav(working);
      }
      if (working.size > 20_000_000) {
        setNotice(
          "Per la trascrizione l’audio unito deve stare sotto 20 MB. Salva gli spezzoni e riduci la durata.",
          true,
        );
        return;
      }
      setNotice("Trascrizione in corso. Gli audio lunghi possono richiedere alcuni minuti.");
      const names = [meta.nameA, meta.nameB, meta.companyA, meta.companyB, meta.chapter];
      let text = "";
      try {
        text = await requestTranscription(working, names, controller.signal);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        if (clips.length > 1) {
          const parts: string[] = [];
          for (let i = 0; i < clips.length; i++) {
            setNotice(`Trascrivo lo spezzone ${i + 1} di ${clips.length}…`);
            const wav = await decodeToWav(clips[i]);
            parts.push(await requestTranscription(wav, names, controller.signal));
          }
          text = parts.filter(Boolean).join("\n\n");
        } else {
          setNotice("Primo tentativo non riuscito, converto l’audio e riprovo…");
          const wav = await decodeToWav(working);
          text = await requestTranscription(wav, names, controller.signal);
        }
      }
      if (!text.trim()) {
        throw new Error(
          "Le tracce ci sono, ma il parlato non è stato riconosciuto. Registra di nuovo tenendo il microfono vicino, poi trascrivi.",
        );
      }
      setTranscript(text);
      setChecked(false);
      setNotice(
        clips.length > 1
          ? "Trascrizione unica pronta: tutti gli spezzoni sono una sola discussione."
          : "Trascrizione pronta. Assegna i nomi alle voci e correggi eventuali errori.",
      );
      logUsage("trascrizione", "Trascrizione completata");
      setStep(2);
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      setNotice(
        aborted
          ? "Richiesta interrotta. I dati già presenti sono conservati."
          : err instanceof Error
            ? err.message
            : "Trascrizione non riuscita.",
        !aborted,
      );
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function saveAll() {
    const clips = audio.clips.map((c) => c.file);
    if (!clips.length) return;
    setBusy(true);
    try {
      const file = await mergeAudioFiles(clips, `incontro-${Date.now()}`);
      downloadBlob(file, file.name);
      setNotice(
        clips.length > 1
          ? "Audio unico scaricato: tutti gli spezzoni sono nello stesso MP3."
          : "Audio scaricato.",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Salvataggio non riuscito.", true);
    } finally {
      setBusy(false);
    }
  }

  async function transcribeSample() {
    if (recState !== "idle") {
      setNotice("Termina prima la registrazione.", true);
      return;
    }
    setConsent(true);
    setNotice("Carico un audio di prova e avvio la trascrizione…");
    try {
      const res = await fetch("/sample-incontro.mp3");
      if (!res.ok) throw new Error("Audio di prova non disponibile.");
      const blob = await res.blob();
      const file = new File([blob], "sample-incontro.mp3", { type: "audio/mpeg" });
      setAudioFile(file);
      await transcribe(file);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Prova di trascrizione non riuscita.", true);
    }
  }

  const recording = recState === "recording";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
    <section className="panel step-enter sm:p-8">
      <h2 className="font-display text-2xl">Ascolta. Registra. Conserva.</h2>
      <p className="text-muted mt-1">
        Registra più spezzoni: la trascrizione li unisce in un’unica discussione.
      </p>

      <CheckRow id="consent" checked={consent} onChange={setConsent} className="mt-5">
        Entrambi i partecipanti sono informati e d’accordo con la registrazione.
      </CheckRow>

      <div
        className={
          "mt-5 rounded-xl border px-5 py-8 text-center " +
          (recording ? "border-danger/30 bg-danger-soft" : "border-line bg-sky")
        }
      >
        <div
          className={
            "mx-auto mb-3 grid size-16 place-items-center rounded-full border-8 bg-surface " +
            (recording ? "border-danger/40 text-danger" : "border-accent-soft text-accent")
          }
          aria-hidden="true"
        >
          <Mic className="size-6" />
        </div>
        <div className="text-muted text-sm">
          {recState === "recording"
            ? "Registrazione in corso"
            : recState === "paused"
              ? "In pausa"
              : "Pronto per registrare"}
        </div>
        <div className="font-display mt-1 text-4xl tabular-nums tracking-wide sm:text-5xl">
          {clock(elapsed / 1000)}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={() => void startRecord()} disabled={recState !== "idle" || busy}>
            <Play className="size-4" />
            {audio.clips.length ? "Registra un altro spezzone" : "Avvia registrazione"}
          </Button>
          <Button
            variant="secondary"
            disabled={recState === "idle"}
            onClick={pauseRecord}
          >
            {recState === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
            {recState === "paused" ? "Riprendi" : "Pausa"}
          </Button>
          <Button variant="danger" disabled={recState === "idle"} onClick={() => void stopRecord()}>
            <Square className="size-3.5 fill-current" />
            Termina
          </Button>
        </div>
      </div>

      {audio.clips.length ? (
        <div className="mt-5 rounded-lg border border-line bg-sky p-4">
          <p className="text-sm font-semibold">
            {audio.clips.length === 1
              ? "1 spezzone pronto"
              : `${audio.clips.length} spezzoni della stessa discussione`}
          </p>
          <ol className="mt-3 grid gap-3">
            {audio.clips.map((clip, index) => (
              <li key={clip.id} className="rounded-md border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    Spezzone {index + 1}
                    {clip.durationMs
                      ? ` · ${clock(clip.durationMs / 1000)}`
                      : ` · ${(clip.file.size / 1_000_000).toFixed(1)} MB`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={recState !== "idle"}
                    onClick={() => {
                      removeAudioClip(clip.id);
                      setNotice("Spezzone rimosso.");
                    }}
                  >
                    <Trash2 className="size-4" />
                    Elimina
                  </Button>
                </div>
                <audio className="mt-2 w-full" src={clip.url} controls />
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-muted mt-4 text-sm">Nessun spezzone ancora. Registra o carica il primo.</p>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-5 flex w-full flex-col items-start rounded-lg border border-dashed border-accent/40 bg-sky px-5 py-5 text-left"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <Upload className="size-4" />
          Hai già registrato l’incontro?
        </span>
        <span className="text-muted mt-1 text-sm">
          Il file si aggiunge agli spezzoni già presenti (MP3, M4A, WEBM, WAV).
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp4,.webm,.m4a"
        hidden
        onChange={(e) => {
          onUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={captureInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          onUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button onClick={() => void transcribe()} disabled={!audio.clips.length}>
          Trascrivi con AI
        </Button>
        <Button
          variant="secondary"
          disabled={!audio.clips.length}
          onClick={() => void saveAll()}
        >
          <Download className="size-4" />
          Salva audio unico
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => captureInputRef.current?.click()}>
          Registra dal dispositivo
        </Button>
        <Button variant="ghost" onClick={() => void transcribeSample()}>
          Prova con un esempio
        </Button>
        <Button variant="ghost" onClick={() => setStep(2)}>
          Inserisci il testo
        </Button>
      </div>
      <p className="text-muted mt-5 text-sm leading-relaxed">
        Conserva gli spezzoni prima di chiudere. L’unione va salvata in MP3 sotto 20 MB.
      </p>
    </section>
    <TopicGenerator />
    </div>
  );
}
