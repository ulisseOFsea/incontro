import { floatPcmToWavFile } from "./audio-convert";

export type RecorderHandle = {
  pause: () => void;
  resume: () => void;
  stop: () => Promise<File>;
};

function audioContextCtor() {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || w.webkitAudioContext;
}

export function micErrorMessage(err: unknown) {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  const framed = typeof window !== "undefined" && window.self !== window.top;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return framed
      ? "Il microfono è bloccato in questa anteprima. Consenti il microfono al sito, oppure carica un file audio."
      : "Autorizzazione microfono negata. Consenti il microfono nelle impostazioni del browser e riprova.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Nessun microfono trovato. Collega un microfono oppure carica un file.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Il microfono è già in uso da un’altra applicazione.";
  }
  if (name === "SecurityError" || name === "TypeError") {
    return "Il browser blocca il microfono in questo contesto. Apri l’app in una scheda dedicata oppure carica un file.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Impossibile avviare la registrazione.";
}

async function getMicStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Microfono non disponibile in questo browser. Carica un file audio oppure apri l’app in una scheda dedicata.",
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "OverconstrainedError") {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw err;
  }
}

function fileFromBlob(blob: Blob, mime: string) {
  const type = mime || blob.type || "audio/webm";
  const ext = type.includes("wav")
    ? "wav"
    : type.includes("mp4") || type.includes("aac") || type.includes("m4a")
      ? "m4a"
      : type.includes("mpeg") || type.includes("mp3")
        ? "mp3"
        : type.includes("ogg")
          ? "ogg"
          : "webm";
  return new File([blob], `incontro-${Date.now()}.${ext}`, { type });
}

function startPcmRecorder(stream: MediaStream, ctx: AudioContext): RecorderHandle {
  if (typeof ctx.createScriptProcessor !== "function") {
    throw new Error("ScriptProcessor non disponibile.");
  }
  const source = ctx.createMediaStreamSource(stream);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let paused = false;
  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (paused || stopped) return;
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };

  source.connect(processor);
  processor.connect(gain);
  gain.connect(ctx.destination);

  const cleanup = () => {
    stopped = true;
    processor.onaudioprocess = null;
    try {
      processor.disconnect();
      source.disconnect();
      gain.disconnect();
    } catch {
      /* already closed */
    }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };

  return {
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
      if (ctx.state === "suspended") void ctx.resume();
    },
    stop: async () => {
      const sampleRate = ctx.sampleRate;
      cleanup();
      let total = 0;
      for (const c of chunks) total += c.length;
      if (!total) throw new Error("Nessun audio catturato. Riprova la registrazione.");
      const samples = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) {
        samples.set(c, offset);
        offset += c.length;
      }
      return floatPcmToWavFile(samples, sampleRate, `incontro-${Date.now()}`);
    },
  };
}

function startMediaRecorder(stream: MediaStream): RecorderHandle {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Registrazione non supportata da questo browser.");
  }
  const mimes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "",
  ];
  let rec: MediaRecorder | null = null;
  for (const mime of mimes) {
    try {
      if (
        mime &&
        typeof MediaRecorder.isTypeSupported === "function" &&
        !MediaRecorder.isTypeSupported(mime)
      ) {
        continue;
      }
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      break;
    } catch {
      rec = null;
    }
  }
  if (!rec) throw new Error("Nessun formato di registrazione disponibile. Carica un file audio.");
  const chunks: Blob[] = [];
  rec.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  try {
    rec.start(250);
  } catch {
    rec.start();
  }
  return {
    pause: () => {
      try {
        if (rec.state === "recording") rec.pause();
      } catch {
        /* pause not supported */
      }
    },
    resume: () => {
      try {
        if (rec.state === "paused") rec.resume();
      } catch {
        /* resume not supported */
      }
    },
    stop: async () => {
      const mime = rec.mimeType;
      await new Promise<void>((resolve) => {
        if (rec.state === "inactive") {
          resolve();
          return;
        }
        rec.onstop = () => resolve();
        rec.stop();
      });
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mime || "audio/webm" });
      if (!blob.size) throw new Error("Nessun audio catturato. Riprova la registrazione.");
      return fileFromBlob(blob, mime || blob.type);
    },
  };
}

export async function startMicRecording(): Promise<RecorderHandle> {
  const stream = await getMicStream();
  try {
    return startMediaRecorder(stream);
  } catch {
    const Ctor = audioContextCtor();
    if (!Ctor) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Registrazione non supportata da questo browser.");
    }
    const ctx = new Ctor();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* continue */
      }
    }
    return startPcmRecorder(stream, ctx);
  }
}
