import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emptyDerived,
  emptyMeta,
  emptyReports,
  sourceFingerprint,
  type MeetingBackup,
  type MeetingMeta,
  META_KEYS,
  DERIVED_TITLES,
  REPORT_TITLES,
} from "./types";
import { SAMPLE_BACKUP } from "./sample";
import { setAudioFile } from "./audio";

export type Notice = { text: string; error: boolean };

type MeetingState = {
  step: number;
  meta: MeetingMeta;
  transcript: string;
  reports: string[];
  derived: string[];
  consentRecord: boolean;
  consentCloud: boolean;
  checkedTranscript: boolean;
  reviewedDoc: boolean;
  includeAppendix: boolean;
  reportSource: string;
  dirty: boolean;
  notice: Notice;
  busy: boolean;
  setStep: (n: number) => void;
  patchMeta: (patch: Partial<MeetingMeta>) => void;
  setTranscript: (value: string) => void;
  setReport: (index: number, value: string) => void;
  setReports: (reports: string[]) => void;
  setDerived: (index: number, value: string) => void;
  setDerivedAll: (derived: string[]) => void;
  setConsentRecord: (v: boolean) => void;
  setConsentCloud: (v: boolean) => void;
  setCheckedTranscript: (v: boolean) => void;
  setReviewedDoc: (v: boolean) => void;
  setIncludeAppendix: (v: boolean) => void;
  setNotice: (text: string, error?: boolean) => void;
  setBusy: (v: boolean) => void;
  markAnalyzed: () => void;
  confirmReview: () => void;
  loadBackup: (data: MeetingBackup) => void;
  loadSample: () => void;
  resetMeeting: () => void;
  exportBackup: () => MeetingBackup;
};

const defaultNotice: Notice = {
  text: "",
  error: false,
};

function normalizeDerived(value?: string[]) {
  const next = emptyDerived();
  if (!Array.isArray(value)) return next;
  for (let i = 0; i < DERIVED_TITLES.length; i++) {
    next[i] = typeof value[i] === "string" ? value[i] : "";
  }
  return next;
}

export const useMeetingStore = create<MeetingState>()(
  persist(
    (set, get) => ({
      step: 0,
      meta: emptyMeta(),
      transcript: "",
      reports: emptyReports(),
      derived: emptyDerived(),
      consentRecord: false,
      consentCloud: true,
      checkedTranscript: false,
      reviewedDoc: false,
      includeAppendix: true,
      reportSource: "",
      dirty: false,
      notice: defaultNotice,
      busy: false,
      setStep: (n) => {
        if (get().busy) return;
        set({ step: n });
      },
      patchMeta: (patch) =>
        set((s) => ({
          meta: { ...s.meta, ...patch },
          dirty: true,
          reviewedDoc: false,
        })),
      setTranscript: (value) =>
        set({
          transcript: value,
          checkedTranscript: false,
          dirty: true,
          reviewedDoc: false,
        }),
      setReport: (index, value) =>
        set((s) => {
          const reports = s.reports.slice();
          reports[index] = value;
          return { reports, dirty: true, reviewedDoc: false };
        }),
      setReports: (reports) => set({ reports, dirty: true, reviewedDoc: false }),
      setDerived: (index, value) =>
        set((s) => {
          const derived = normalizeDerived(s.derived);
          derived[index] = value;
          return { derived, dirty: true, reviewedDoc: false };
        }),
      setDerivedAll: (derived) =>
        set({ derived: normalizeDerived(derived), dirty: true, reviewedDoc: false }),
      setConsentRecord: (v) => set({ consentRecord: v }),
      setConsentCloud: () => set({ consentCloud: true }),
      setCheckedTranscript: (v) => set({ checkedTranscript: v }),
      setReviewedDoc: (v) => set({ reviewedDoc: v }),
      setIncludeAppendix: (v) => set({ includeAppendix: v }),
      setNotice: (text, error = false) => set({ notice: { text, error } }),
      setBusy: (v) => set({ busy: v }),
      markAnalyzed: () => {
        const { meta, transcript } = get();
        set({
          reportSource: sourceFingerprint(meta, transcript),
          dirty: true,
          reviewedDoc: false,
        });
      },
      confirmReview: () => {
        const { meta, transcript } = get();
        set({
          reviewedDoc: true,
          reportSource: sourceFingerprint(meta, transcript),
        });
      },
      loadBackup: (data) => {
        setAudioFile(null);
        set({
          meta: data.meta,
          transcript: data.transcript,
          reports: data.report.slice(),
          derived: normalizeDerived(data.derived),
          consentRecord: false,
          checkedTranscript: false,
          reviewedDoc: false,
          reportSource: "",
          dirty: true,
          step: 0,
          notice: {
            text: "Backup ripristinato. Verifica il contenuto e ricollega l’audio se necessario.",
            error: false,
          },
        });
      },
      loadSample: () => {
        setAudioFile(null);
        set({
          meta: { ...SAMPLE_BACKUP.meta },
          transcript: SAMPLE_BACKUP.transcript,
          reports: SAMPLE_BACKUP.report.slice(),
          derived: normalizeDerived(SAMPLE_BACKUP.derived),
          consentRecord: true,
          consentCloud: true,
          checkedTranscript: true,
          reviewedDoc: false,
          includeAppendix: true,
          reportSource: sourceFingerprint(SAMPLE_BACKUP.meta, SAMPLE_BACKUP.transcript),
          dirty: true,
          step: 0,
          notice: {
            text: "Incontro di esempio caricato. Puoi rivedere le fasi, esportare il Word o rigenerare l’analisi con l’AI.",
            error: false,
          },
        });
      },
      resetMeeting: () => {
        setAudioFile(null);
        set({
          step: 0,
          meta: emptyMeta(),
          transcript: "",
          reports: emptyReports(),
          derived: emptyDerived(),
          consentRecord: false,
          consentCloud: true,
          checkedTranscript: false,
          reviewedDoc: false,
          includeAppendix: true,
          reportSource: "",
          dirty: false,
          notice: defaultNotice,
          busy: false,
        });
      },
      exportBackup: () => ({
        version: 1,
        meta: get().meta,
        transcript: get().transcript,
        report: get().reports,
        derived: get().derived,
      }),
    }),
    {
      name: "one-to-one-cloud-v1",
      skipHydration: true,
      partialize: (s) => ({
        step: s.step,
        meta: s.meta,
        transcript: s.transcript,
        reports: s.reports,
        derived: s.derived,
        consentRecord: s.consentRecord,
        checkedTranscript: s.checkedTranscript,
        reviewedDoc: s.reviewedDoc,
        includeAppendix: s.includeAppendix,
        reportSource: s.reportSource,
        dirty: s.dirty,
      }),
    },
  ),
);

export function parseBackup(raw: unknown): MeetingBackup {
  if (!raw || typeof raw !== "object") throw new Error("Backup non valido.");
  const d = raw as Record<string, unknown>;
  if (d.version !== 1 || !d.meta || typeof d.transcript !== "string") {
    throw new Error("Backup non valido.");
  }
  if (!Array.isArray(d.report) || d.report.length !== REPORT_TITLES.length) {
    throw new Error("Backup non valido.");
  }
  if (d.report.some((x) => typeof x !== "string")) {
    throw new Error("Backup non valido.");
  }
  const meta = d.meta as Record<string, unknown>;
  const required = META_KEYS.filter((k) => k !== "emailA" && k !== "emailB");
  if (required.some((k) => typeof meta[k] !== "string")) {
    throw new Error("Backup non valido.");
  }
  return {
    version: 1,
    meta: {
      ...emptyMeta(),
      ...(meta as Partial<MeetingMeta>),
      emailA: typeof meta.emailA === "string" ? meta.emailA : "",
      emailB: typeof meta.emailB === "string" ? meta.emailB : "",
    },
    transcript: d.transcript,
    report: d.report as string[],
    derived: normalizeDerived(Array.isArray(d.derived) ? (d.derived as string[]) : []),
  };
}
