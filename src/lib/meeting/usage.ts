import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STEPS, type MeetingMeta } from "./types";

export type UsagePerson = { name: string; email: string };

export type UsageEvent = {
  at: number;
  type: string;
  label: string;
  step: number;
};

export type UsageSession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  chapter: string;
  date: string;
  people: UsagePerson[];
  stepMs: number[];
  totalMs: number;
  events: UsageEvent[];
};

type UsageState = {
  sessions: UsageSession[];
  activeId: string | null;
  activeStep: number;
  ensureSession: (meta: MeetingMeta) => void;
  setActiveStep: (step: number, silent?: boolean) => void;
  addTime: (ms: number) => void;
  log: (type: string, label: string) => void;
  closeSession: () => void;
};

const MAX_SESSIONS = 200;
const MAX_EVENTS = 80;

function nid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function peopleFrom(meta: MeetingMeta): UsagePerson[] {
  return [
    { name: meta.nameA.trim(), email: meta.emailA.trim().toLowerCase() },
    { name: meta.nameB.trim(), email: meta.emailB.trim().toLowerCase() },
  ].filter((p) => p.name || p.email);
}

function emptySteps() {
  return STEPS.map(() => 0);
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${sec} s`;
  return `${sec} s`;
}

export function formatWhen(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function weekRange(ts: number) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const months = [
    "gen",
    "feb",
    "mar",
    "apr",
    "mag",
    "giu",
    "lug",
    "ago",
    "set",
    "ott",
    "nov",
    "dic",
  ];
  const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const label = `${monday.getDate()}–${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`;
  return { key, label, start: monday.getTime(), end: sunday.getTime() + 86400000 - 1 };
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      activeStep: 0,
      ensureSession: (meta) => {
        const people = peopleFrom(meta);
        const chapter = meta.chapter.trim();
        const date = meta.date;
        const { sessions, activeId } = get();
        const open = sessions.find((s) => s.id === activeId && !s.endedAt);
        if (open) {
          set({
            sessions: sessions.map((s) =>
              s.id === open.id ? { ...s, people, chapter: chapter || s.chapter, date: date || s.date } : s,
            ),
          });
          return;
        }
        const session: UsageSession = {
          id: nid(),
          startedAt: Date.now(),
          endedAt: null,
          chapter,
          date,
          people,
          stepMs: emptySteps(),
          totalMs: 0,
          events: [
            {
              at: Date.now(),
              type: "sessione",
              label: "Inizio sessione",
              step: get().activeStep,
            },
          ],
        };
        set({
          sessions: [session, ...sessions].slice(0, MAX_SESSIONS),
          activeId: session.id,
        });
      },
      setActiveStep: (step, silent) => {
        const clamped = Math.max(0, Math.min(STEPS.length - 1, step));
        if (get().activeStep === clamped) return;
        const prev = get().activeStep;
        set({ activeStep: clamped });
        if (!silent) {
          get().log(
            "fase",
            `Passaggio a ${STEPS[clamped]?.label || "fase"} da ${STEPS[prev]?.label || "fase"}`,
          );
        }
      },
      addTime: (ms) => {
        if (ms <= 0) return;
        const { sessions, activeId, activeStep } = get();
        if (!activeId) return;
        set({
          sessions: sessions.map((s) => {
            if (s.id !== activeId || s.endedAt) return s;
            const stepMs = s.stepMs.slice();
            const i = Math.max(0, Math.min(stepMs.length - 1, activeStep));
            stepMs[i] = (stepMs[i] || 0) + ms;
            return { ...s, stepMs, totalMs: s.totalMs + ms };
          }),
        });
      },
      log: (type, label) => {
        const { sessions, activeId, activeStep } = get();
        if (!activeId) return;
        const event: UsageEvent = { at: Date.now(), type, label, step: activeStep };
        set({
          sessions: sessions.map((s) => {
            if (s.id !== activeId || s.endedAt) return s;
            return { ...s, events: [event, ...s.events].slice(0, MAX_EVENTS) };
          }),
        });
      },
      closeSession: () => {
        const { sessions, activeId } = get();
        if (!activeId) return;
        set({
          sessions: sessions.map((s) =>
            s.id === activeId && !s.endedAt ? { ...s, endedAt: Date.now() } : s,
          ),
          activeId: null,
        });
      },
    }),
    {
      name: "one-to-one-cloud-usage-v1",
      skipHydration: true,
      partialize: (s) => ({
        sessions: s.sessions,
        activeId: s.activeId,
        activeStep: s.activeStep,
      }),
    },
  ),
);

export function logUsage(type: string, label: string) {
  useUsageStore.getState().log(type, label);
}

export function personLabel(p: UsagePerson) {
  return p.name || p.email || "Non indicato";
}

export function chapterLabel(chapter: string) {
  return chapter.trim() || "Senza capitolo";
}

export function allEvents(sessions: UsageSession[]) {
  return sessions
    .flatMap((s) =>
      s.events.map((e) => ({
        ...e,
        sessionId: s.id,
        chapter: s.chapter,
        people: s.people,
      })),
    )
    .sort((a, b) => b.at - a.at);
}

export function totalsByStep(sessions: UsageSession[]) {
  const ms = emptySteps();
  let total = 0;
  for (const s of sessions) {
    s.stepMs.forEach((v, i) => {
      ms[i] = (ms[i] || 0) + v;
    });
    total += s.totalMs;
  }
  return { ms, total };
}

export function totalsByPerson(sessions: UsageSession[]) {
  const map = new Map<
    string,
    { name: string; email: string; ms: number; sessions: number; chapters: Set<string> }
  >();
  for (const s of sessions) {
    const people = s.people.length ? s.people : [{ name: "Non indicato", email: "" }];
    for (const p of people) {
      const key = (p.email || p.name || "anon").toLowerCase();
      const cur = map.get(key) || {
        name: p.name,
        email: p.email,
        ms: 0,
        sessions: 0,
        chapters: new Set<string>(),
      };
      cur.ms += s.totalMs;
      cur.sessions += 1;
      if (p.name && !cur.name) cur.name = p.name;
      if (s.chapter) cur.chapters.add(s.chapter);
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

export function totalsByChapter(sessions: UsageSession[]) {
  const map = new Map<
    string,
    { chapter: string; ms: number; sessions: number; people: Set<string> }
  >();
  for (const s of sessions) {
    const key = chapterLabel(s.chapter);
    const cur = map.get(key) || {
      chapter: key,
      ms: 0,
      sessions: 0,
      people: new Set<string>(),
    };
    cur.ms += s.totalMs;
    cur.sessions += 1;
    for (const p of s.people) cur.people.add(personLabel(p));
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

export function totalsByWeek(sessions: UsageSession[]) {
  const map = new Map<
    string,
    { label: string; start: number; ms: number; sessions: number; chapters: Set<string> }
  >();
  for (const s of sessions) {
    const w = weekRange(s.startedAt);
    const cur = map.get(w.key) || {
      label: w.label,
      start: w.start,
      ms: 0,
      sessions: 0,
      chapters: new Set<string>(),
    };
    cur.ms += s.totalMs;
    cur.sessions += 1;
    if (s.chapter) cur.chapters.add(s.chapter);
    map.set(w.key, cur);
  }
  return [...map.values()].sort((a, b) => b.start - a.start);
}
