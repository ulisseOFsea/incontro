import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMeetingStore } from "@/lib/meeting/store";
import { STEPS } from "@/lib/meeting/types";
import {
  allEvents,
  chapterLabel,
  formatDuration,
  formatWhen,
  personLabel,
  totalsByChapter,
  totalsByPerson,
  totalsByStep,
  totalsByWeek,
  useUsageStore,
} from "@/lib/meeting/usage";

export function UsageTracker() {
  const step = useMeetingStore((s) => s.step);
  const meta = useMeetingStore((s) => s.meta);
  const silent = useRef(true);
  const acc = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    void Promise.resolve(useUsageStore.persist.rehydrate()).then(() => {
      useUsageStore.getState().ensureSession(useMeetingStore.getState().meta);
      useUsageStore.getState().setActiveStep(useMeetingStore.getState().step, true);
    });
  }, []);

  useEffect(() => {
    useUsageStore.getState().ensureSession(meta);
  }, [meta.nameA, meta.nameB, meta.emailA, meta.emailB, meta.chapter, meta.date]);

  useEffect(() => {
    useUsageStore.getState().setActiveStep(step, silent.current);
    silent.current = false;
  }, [step]);

  useEffect(() => {
    last.current = performance.now();
    const flush = () => {
      if (acc.current > 0) {
        useUsageStore.getState().addTime(acc.current);
        acc.current = 0;
      }
    };
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(now - last.current, 4000);
      last.current = now;
      if (document.visibilityState === "visible") acc.current += dt;
      if (acc.current >= 5000) flush();
    };
    const timer = window.setInterval(tick, 1000);
    const onVis = () => {
      last.current = performance.now();
      if (document.visibilityState !== "visible") flush();
    };
    const onLeave = () => flush();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onLeave);
    return () => {
      flush();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return null;
}

function Th({ children }: { children: string }) {
  return <th>{children}</th>;
}

function Td({ children, numeric }: { children: string; numeric?: boolean }) {
  return <td className={numeric ? "num" : undefined}>{children}</td>;
}

const LOG_PIN = "2020";
const LOG_UNLOCK = "one-to-one-cloud-log-unlock";

function isUnlocked() {
  try {
    return sessionStorage.getItem(LOG_UNLOCK) === "1";
  } catch {
    return false;
  }
}

export function UsageLog() {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const sessions = useUsageStore((s) => s.sessions);
  const activeId = useUsageStore((s) => s.activeId);
  const active = sessions.find((s) => s.id === activeId) || sessions[0];
  const stepTotals = totalsByStep(sessions);
  const people = totalsByPerson(sessions);
  const chapters = totalsByChapter(sessions);
  const weeks = totalsByWeek(sessions);
  const events = allEvents(sessions).slice(0, 80);

  function submitPin(e: FormEvent) {
    e.preventDefault();
    if (pin === LOG_PIN) {
      try {
        sessionStorage.setItem(LOG_UNLOCK, "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setWrong(false);
      setPin("");
      return;
    }
    setWrong(true);
  }

  if (!unlocked) {
    return (
      <section className="panel step-enter max-w-md sm:p-8">
        <h2 className="font-display text-2xl">Registro riservato</h2>
        <p className="text-muted mt-1">Inserisci la password per vedere tempi, persone e capitoli.</p>
        <form className="mt-6 max-w-sm" onSubmit={submitPin}>
          <Label htmlFor="log-pin">Password</Label>
          <Input
            id="log-pin"
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setWrong(false);
            }}
          />
          {wrong ? (
            <p className="mt-2 text-sm text-danger">Password non corretta.</p>
          ) : null}
          <div className="mt-4">
            <Button type="submit">Apri il registro</Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="panel step-enter sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl">Registro di utilizzo</h2>
        <p className="text-muted mt-1">
          Tempi per fase, persone, totali settimanali e aggregati per capitolo.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-sky p-4">
          <p className="text-muted text-xs font-semibold tracking-wide">TEMPO TOTALE</p>
          <p className="mt-1 text-xl font-semibold">{formatDuration(stepTotals.total)}</p>
        </div>
        <div className="rounded-lg bg-sky p-4">
          <p className="text-muted text-xs font-semibold tracking-wide">SESSIONI</p>
          <p className="mt-1 text-xl font-semibold">{String(sessions.length)}</p>
        </div>
        <div className="rounded-lg bg-sky p-4">
          <p className="text-muted text-xs font-semibold tracking-wide">IN CORSO</p>
          <p className="mt-1 text-xl font-semibold">
            {active && !active.endedAt ? formatDuration(active.totalMs) : "—"}
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-base font-semibold">Tempo per fase</h3>
      <div className="mb-8 overflow-x-auto rounded-lg border border-line">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Fase</Th>
              <Th>Sessione attuale</Th>
              <Th>Totale</Th>
              <Th>Quota</Th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((item, i) => (
              <tr key={item.n}>
                <Td>{`${item.n} ${item.label}`}</Td>
                <Td numeric>{formatDuration(active?.stepMs[i] || 0)}</Td>
                <Td numeric>{formatDuration(stepTotals.ms[i] || 0)}</Td>
                <Td numeric>
                  {stepTotals.total
                    ? `${Math.round(((stepTotals.ms[i] || 0) / stepTotals.total) * 100)}%`
                    : "0%"}
                </Td>
              </tr>
            ))}
            <tr>
              <Td>Totale</Td>
              <Td numeric>{formatDuration(active?.totalMs || 0)}</Td>
              <Td numeric>{formatDuration(stepTotals.total)}</Td>
              <Td numeric>100%</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-base font-semibold">Chi lo usa</h3>
      <div className="mb-8 overflow-x-auto rounded-lg border border-line">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Email</Th>
              <Th>Capitoli</Th>
              <Th>Incontri</Th>
              <Th>Tempo</Th>
            </tr>
          </thead>
          <tbody>
            {people.length ? (
              people.map((p) => (
                <tr key={p.email || p.name}>
                  <Td>{p.name || "Non indicato"}</Td>
                  <Td>{p.email || "—"}</Td>
                  <Td>{[...p.chapters].join(", ") || "—"}</Td>
                  <Td numeric>{String(p.sessions)}</Td>
                  <Td numeric>{formatDuration(p.ms)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td>Nessun utilizzo registrato.</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td numeric>—</Td>
                <Td numeric>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-base font-semibold">Totali settimanali</h3>
      <div className="mb-8 overflow-x-auto rounded-lg border border-line">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Settimana</Th>
              <Th>Incontri</Th>
              <Th>Capitoli</Th>
              <Th>Tempo</Th>
            </tr>
          </thead>
          <tbody>
            {weeks.length ? (
              weeks.map((w) => (
                <tr key={w.label}>
                  <Td>{w.label}</Td>
                  <Td numeric>{String(w.sessions)}</Td>
                  <Td>{[...w.chapters].join(", ") || "—"}</Td>
                  <Td numeric>{formatDuration(w.ms)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td>Nessuna settimana.</Td>
                <Td numeric>—</Td>
                <Td>—</Td>
                <Td numeric>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-base font-semibold">Aggregato per capitolo</h3>
      <div className="mb-8 overflow-x-auto rounded-lg border border-line">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Capitolo</Th>
              <Th>Incontri</Th>
              <Th>Persone</Th>
              <Th>Tempo</Th>
              <Th>Media</Th>
            </tr>
          </thead>
          <tbody>
            {chapters.length ? (
              chapters.map((c) => (
                <tr key={c.chapter}>
                  <Td>{c.chapter}</Td>
                  <Td numeric>{String(c.sessions)}</Td>
                  <Td numeric>{String(c.people.size)}</Td>
                  <Td numeric>{formatDuration(c.ms)}</Td>
                  <Td numeric>{formatDuration(c.sessions ? c.ms / c.sessions : 0)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td>Nessun capitolo.</Td>
                <Td numeric>—</Td>
                <Td numeric>—</Td>
                <Td numeric>—</Td>
                <Td numeric>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-base font-semibold">Log attività</h3>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="data-table">
          <thead>
            <tr>
              <Th>Quando</Th>
              <Th>Persone</Th>
              <Th>Capitolo</Th>
              <Th>Fase</Th>
              <Th>Attività</Th>
            </tr>
          </thead>
          <tbody>
            {events.length ? (
              events.map((e) => (
                <tr key={`${e.sessionId}-${e.at}-${e.label}`}>
                  <Td>{formatWhen(e.at)}</Td>
                  <Td>{e.people.map(personLabel).join(" · ") || "—"}</Td>
                  <Td>{chapterLabel(e.chapter)}</Td>
                  <Td>{STEPS[e.step]?.label || "—"}</Td>
                  <Td>{e.label}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td>Nessuna attività.</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
