const DB_NAME = "one-to-one-cloud";
const STORE = "audio";
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type AudioClip = {
  id: string;
  file: File;
  url: string;
  durationMs?: number;
};

type StoredClip = { name: string; type: string; blob: Blob; durationMs?: number };

function clipId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toClip(file: File, durationMs?: number): AudioClip {
  return {
    id: clipId(),
    file,
    url: URL.createObjectURL(file),
    durationMs,
  };
}

async function persistClips(clips: AudioClip[]) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        {
          version: 2,
          clips: clips.map((c) => ({
            name: c.file.name,
            type: c.file.type,
            blob: c.file,
            durationMs: c.durationMs,
          })),
        },
        KEY,
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB may be blocked; in-memory audio still works for the session.
  }
}

export async function loadPersistedAudio(): Promise<AudioClip[]> {
  try {
    const db = await openDb();
    const record = await new Promise<
      | { version?: number; clips?: StoredClip[]; name?: string; type?: string; blob?: Blob }
      | undefined
    >((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record) return [];
    const stored = Array.isArray(record.clips)
      ? record.clips
      : record.blob
        ? [{ name: record.name || "incontro.mp3", type: record.type || record.blob.type, blob: record.blob }]
        : [];
    return stored
      .filter((c) => c?.blob)
      .map((c) =>
        toClip(
          new File([c.blob], c.name || "incontro.mp3", { type: c.type || c.blob.type }),
          c.durationMs,
        ),
      );
  } catch {
    return [];
  }
}

export async function clearPersistedAudio() {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export type AudioSnapshot = {
  clips: AudioClip[];
  file: File | null;
  url: string | null;
};

const emptySnapshot: AudioSnapshot = { clips: [], file: null, url: null };
let snapshot: AudioSnapshot = emptySnapshot;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function fromClips(clips: AudioClip[]): AudioSnapshot {
  const last = clips[clips.length - 1];
  return { clips, file: last?.file ?? null, url: last?.url ?? null };
}

function revokeAll(clips: AudioClip[]) {
  for (const c of clips) URL.revokeObjectURL(c.url);
}

function commit(clips: AudioClip[]) {
  snapshot = fromClips(clips);
  emit();
  if (clips.length) void persistClips(clips);
  else void clearPersistedAudio();
}

export function getAudioSnapshot() {
  return snapshot;
}

export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setAudioFile(file: File | null, durationMs?: number) {
  revokeAll(snapshot.clips);
  commit(file ? [toClip(file, durationMs)] : []);
}

export function addAudioFile(file: File, durationMs?: number) {
  commit([...snapshot.clips, toClip(file, durationMs)]);
}

export function removeAudioClip(id: string) {
  const keep: AudioClip[] = [];
  for (const clip of snapshot.clips) {
    if (clip.id === id) URL.revokeObjectURL(clip.url);
    else keep.push(clip);
  }
  commit(keep);
}

export async function restoreAudioFromDb() {
  if (snapshot.clips.length) return;
  const clips = await loadPersistedAudio();
  if (!clips.length) return;
  snapshot = fromClips(clips);
  emit();
}
