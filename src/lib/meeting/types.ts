import { todayISO } from "@/lib/utils";

export const REPORT_TITLES = [
  "Sintesi executive",
  "Profili professionali",
  "Punti chiave",
  "Punti di congiunzione",
  "Punti di distanza",
  "Collaborazioni possibili",
  "Referenze da attivare",
  "Piano d’azione",
  "Domande aperte e prossimo incontro",
] as const;

export type ReportIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type MeetingMeta = {
  nameA: string;
  emailA: string;
  companyA: string;
  roleA: string;
  nameB: string;
  emailB: string;
  companyB: string;
  roleB: string;
  chapter: string;
  date: string;
  goal: string;
};

export const META_KEYS = [
  "nameA",
  "emailA",
  "companyA",
  "roleA",
  "nameB",
  "emailB",
  "companyB",
  "roleB",
  "chapter",
  "date",
  "goal",
] as const;

export type MetaKey = (typeof META_KEYS)[number];

export const emptyMeta = (): MeetingMeta => ({
  nameA: "",
  emailA: "",
  companyA: "",
  roleA: "",
  nameB: "",
  emailB: "",
  companyB: "",
  roleB: "",
  chapter: "",
  date: todayISO(),
  goal: "",
});

export const emptyReports = () => REPORT_TITLES.map(() => "") as string[];

export type MeetingBackup = {
  version: 1;
  meta: MeetingMeta;
  transcript: string;
  report: string[];
};

export const STEPS = [
  { n: "01", label: "Preparazione", title: "Prepara l’incontro" },
  { n: "02", label: "Audio incontro", title: "Registra la conversazione" },
  { n: "03", label: "Trascrizione", title: "Rivedi la trascrizione" },
  { n: "04", label: "Analisi e opportunità", title: "Costruisci le opportunità" },
  { n: "05", label: "Documento Word", title: "Esporta il documento" },
] as const;

export function sourceFingerprint(meta: MeetingMeta, transcript: string) {
  return JSON.stringify({ meta, transcript });
}
