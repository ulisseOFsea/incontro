import { Mp3Encoder } from "@breezystack/lamejs";

function encodeWav(samples: Float32Array, sampleRate: number) {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + n * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function resample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const f = x - i0;
    out[i] = input[i0] * (1 - f) + input[i1] * f;
  }
  return out;
}

function mixToMono(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const mixed = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += buffer.getChannelData(c)[i];
    mixed[i] = s / channels;
  }
  return mixed;
}

function floatTo16(samples: Float32Array) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

const MP3_RATE = 44100;
const MP3_KBPS = 64;
const MP3_BLOCK = 1152;

export async function encodePcmToMp3(samples: Float32Array, sampleRate: number) {
  const pcm = resample(samples, sampleRate, MP3_RATE);
  const int16 = floatTo16(pcm);
  const encoder = new Mp3Encoder(1, MP3_RATE, MP3_KBPS);
  const parts: BlobPart[] = [];
  for (let i = 0; i < int16.length; i += MP3_BLOCK) {
    const end = Math.min(i + MP3_BLOCK, int16.length);
    const chunk =
      end - i === MP3_BLOCK ? int16.subarray(i, end) : int16.slice(i, end);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length) parts.push(Uint8Array.from(encoded));
    if (i > 0 && i % (MP3_BLOCK * 250) === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(Uint8Array.from(tail));
  if (!parts.length) throw new Error("Conversione MP3 non riuscita.");
  return new Blob(parts, { type: "audio/mpeg" });
}

export async function blobToMp3(blob: Blob, basename = "incontro") {
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mp3 = await encodePcmToMp3(mixToMono(decoded), decoded.sampleRate);
    const name = basename.replace(/\.[^.]+$/, "") || "incontro";
    return new File([mp3], `${name}.mp3`, { type: "audio/mpeg" });
  } catch (err) {
    if (err instanceof Error && err.message.includes("MP3")) throw err;
    throw new Error("Impossibile convertire la registrazione in MP3.");
  } finally {
    await ctx.close();
  }
}

export async function decodeToWav(file: Blob) {
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const pcm = resample(mixToMono(decoded), decoded.sampleRate, 16000);
    const wav = encodeWav(pcm, 16000);
    const base =
      "name" in file && typeof file.name === "string"
        ? file.name.replace(/\.[^.]+$/, "")
        : "incontro";
    return new File([wav], `${base}.wav`, { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}

export function floatPcmToWavFile(
  samples: Float32Array,
  sampleRate: number,
  basename = "incontro",
) {
  const pcm = resample(samples, sampleRate, 16000);
  const wav = encodeWav(pcm, 16000);
  const name = basename.replace(/\.[^.]+$/, "") || "incontro";
  return new File([wav], `${name}.wav`, { type: "audio/wav" });
}

export async function mergeToWav(files: File[], basename = "incontro") {
  if (files.length === 0) throw new Error("Nessun audio da unire.");
  if (files.length === 1) return decodeToWav(files[0]);
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const rate = 16000;
    const parts: Float32Array[] = [];
    for (const file of files) {
      const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
      parts.push(resample(mixToMono(decoded), decoded.sampleRate, rate));
    }
    const gap = new Float32Array(Math.round(rate * 0.45));
    let total = 0;
    for (let i = 0; i < parts.length; i++) {
      total += parts[i].length;
      if (i < parts.length - 1) total += gap.length;
    }
    const all = new Float32Array(total);
    let offset = 0;
    parts.forEach((part, i) => {
      all.set(part, offset);
      offset += part.length;
      if (i < parts.length - 1) {
        all.set(gap, offset);
        offset += gap.length;
      }
    });
    const wav = encodeWav(all, rate);
    return new File([wav], `${basename}.wav`, { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}

export async function mergeAudioFiles(files: File[], basename = "incontro") {
  if (files.length === 0) throw new Error("Nessun audio da unire.");
  if (files.length === 1) {
    const only = files[0];
    if (only.type === "audio/mpeg" || only.name.toLowerCase().endsWith(".mp3")) return only;
    return blobToMp3(only, basename);
  }
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const rate = MP3_RATE;
    const parts: Float32Array[] = [];
    for (const file of files) {
      const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
      parts.push(resample(mixToMono(decoded), decoded.sampleRate, rate));
    }
    const gap = new Float32Array(Math.round(rate * 0.45));
    let total = 0;
    for (let i = 0; i < parts.length; i++) {
      total += parts[i].length;
      if (i < parts.length - 1) total += gap.length;
    }
    const all = new Float32Array(total);
    let offset = 0;
    parts.forEach((part, i) => {
      all.set(part, offset);
      offset += part.length;
      if (i < parts.length - 1) {
        all.set(gap, offset);
        offset += gap.length;
      }
    });
    const mp3 = await encodePcmToMp3(all, rate);
    return new File([mp3], `${basename}.mp3`, { type: "audio/mpeg" });
  } finally {
    await ctx.close();
  }
}
