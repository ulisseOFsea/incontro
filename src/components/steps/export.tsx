import { useRef, useState } from "react";
import { FileType, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  redirectToLoginIfRequired,
  useRefetchWhenConnectorReady,
} from "@/lib/app-data";
import { sendMeetingReport, REPORT_CC } from "@/lib/meeting/send-report";
import { useMeetingStore } from "@/lib/meeting/store";
import { logUsage } from "@/lib/meeting/usage";
import { REPORT_TITLES } from "@/lib/meeting/types";
import { buildDocx, reportPlainText } from "@/lib/meeting/word-export";
import { blobToBase64, downloadBlob, isEmail } from "@/lib/utils";

function emailCopy(names: string[], date: string) {
  const who = names.filter(Boolean).join(" e ");
  const subject = `Report 1-to-1${who ? ` — ${who}` : ""}${date ? ` · ${date}` : ""}`;
  const body =
    `Ciao${who ? ` ${who}` : ""},\n\n` +
    `in allegato il documento Word dell’incontro 1-to-1${date ? ` del ${date}` : ""}.\n\n` +
    `One to One Cloud`;
  const html = `<div style="font-family:Georgia,serif;line-height:1.55;color:#203653">
<p>Ciao${who ? ` ${who}` : ""},</p>
<p>in allegato trovi il documento Word dell’incontro 1-to-1${date ? ` del ${date}` : ""}.</p>
<p style="color:#5b6b7a">One to One Cloud</p>
</div>`;
  return { subject, body, html };
}

function openMailClient(to: string[], subject: string, body: string) {
  const href =
    `mailto:${to.join(",")}?cc=${encodeURIComponent(REPORT_CC)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body.slice(0, 1800))}`;
  window.location.assign(href);
}

export function ExportStep() {
  const meta = useMeetingStore((s) => s.meta);
  const patchMeta = useMeetingStore((s) => s.patchMeta);
  const reports = useMeetingStore((s) => s.reports);
  const transcript = useMeetingStore((s) => s.transcript);
  const includeAppendix = useMeetingStore((s) => s.includeAppendix);
  const setIncludeAppendix = useMeetingStore((s) => s.setIncludeAppendix);
  const reviewed = useMeetingStore((s) => s.reviewedDoc);
  const confirmReview = useMeetingStore((s) => s.confirmReview);
  const setReviewedDoc = useMeetingStore((s) => s.setReviewedDoc);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const setStep = useMeetingStore((s) => s.setStep);
  const setBusy = useMeetingStore((s) => s.setBusy);
  const busy = useMeetingStore((s) => s.busy);
  const exportBackup = useMeetingStore((s) => s.exportBackup);

  const [waitingMail, setWaitingMail] = useState(false);
  const [sentTo, setSentTo] = useState<string[] | null>(null);
  const [fileHref, setFileHref] = useState("");
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const preview = reportPlainText(meta, reports, transcript, includeAppendix);
  const filename = `Report-1to1-${meta.date || "incontro"}.docx`;

  useRefetchWhenConnectorReady(waitingMail, () => {
    setWaitingMail(false);
    void sendEmail();
  });

  function ensureReady(forSend = false) {
    if (!REPORT_TITLES.some((_, i) => reports[i]?.trim()) && !transcript.trim()) {
      setNotice("Compila almeno una sezione del report, oppure genera l’analisi.", true);
      return false;
    }
    if (!reviewed) {
      if (forSend) confirmReview();
      else {
        setNotice("Conferma la revisione del report prima di esportare.", true);
        return false;
      }
    }
    return true;
  }

  function exportWord() {
    try {
      const blob = buildDocx(meta, reports, transcript, includeAppendix);
      if (fileHref) URL.revokeObjectURL(fileHref);
      const url = URL.createObjectURL(blob);
      setFileHref(url);
      const link = downloadRef.current;
      if (link) {
        link.href = url;
        link.download = filename;
        link.click();
      } else {
        downloadBlob(blob, filename);
      }
      setNotice("Download del Word avviato. Se il browser lo blocca, usa il link sotto.");
      logUsage("export", "Download documento Word");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Impossibile creare il documento Word.",
        true,
      );
    }
  }

  async function sendEmail() {
    if (busy) return;
    if (!ensureReady(true)) return;
    if (!isEmail(meta.emailA) || !isEmail(meta.emailB)) {
      setNotice("Controlla le email dei partecipanti prima dell’invio.", true);
      return;
    }
    const to = [meta.emailA.trim(), meta.emailB.trim()];
    const copy = emailCopy([meta.nameA, meta.nameB], meta.date);
    const blob = buildDocx(meta, reports, transcript, includeAppendix);
    setBusy(true);
    setNotice("Invio del Word alle due email in corso…");
    try {
      const docxBase64 = await blobToBase64(blob);
      const result = await sendMeetingReport({
        data: {
          to,
          cc: [REPORT_CC],
          names: [meta.nameA, meta.nameB],
          subject: copy.subject,
          body: copy.body,
          html: copy.html,
          filename,
          docxBase64,
        },
      });
      if (result.ok) {
        setSentTo(result.to);
        setNotice(
          `Word inviato a ${result.to.join(" e ")} (cc ${result.cc.join(", ")}).`,
        );
        logUsage("invio", `Word inviato a ${result.to.join(" e ")}`);
        return;
      }
      if (result.loginRequired) {
        redirectToLoginIfRequired({
          ok: false,
          data: null,
          loginRequired: true,
          loginUrl: result.loginUrl,
        });
      }
      if (result.pending) {
        setWaitingMail(true);
        setNotice(result.error, true);
        return;
      }
      downloadBlob(blob, filename);
      openMailClient(to, copy.subject, copy.body);
      setNotice(
        `${result.error} Ho aperto il programma di posta e scaricato il Word da allegare.`,
        true,
      );
    } catch (err) {
      downloadBlob(blob, filename);
      openMailClient(to, copy.subject, copy.body);
      setNotice(
        (err instanceof Error ? err.message : "Invio Gmail non riuscito.") +
          " Ho aperto il programma di posta e scaricato il Word da allegare.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <section className="panel step-enter sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Il vostro prossimo passo, in Word.</h2>
          <p className="text-muted mt-1">
            Quando premi il pulsante, il Word parte da {REPORT_CC} alle due email dell’inizio.
          </p>
        </div>
        <div
          className="grid size-14 place-items-center rounded-lg bg-accent-soft text-accent"
          aria-hidden="true"
        >
          <FileType className="size-7" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sendEmailA">Email partecipante A</Label>
          <Input
            id="sendEmailA"
            type="email"
            value={meta.emailA}
            placeholder="nome@azienda.it"
            onChange={(e) => patchMeta({ emailA: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="sendEmailB">Email partecipante B</Label>
          <Input
            id="sendEmailB"
            type="email"
            value={meta.emailB}
            placeholder="nome@azienda.it"
            onChange={(e) => patchMeta({ emailB: e.target.value })}
          />
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-sky px-4 py-3 text-sm">
        In copia (CC): {REPORT_CC}
      </p>
      <CheckRow
        id="appendix"
        checked={includeAppendix}
        onChange={setIncludeAppendix}
        className="mt-5"
      >
        Includi la trascrizione revisionata come appendice.
      </CheckRow>

      <pre
        aria-label="Anteprima del documento"
        className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-sky p-5 font-serif text-base leading-8 sm:max-h-[32rem] sm:p-6"
      >
        {preview}
      </pre>

      <CheckRow
        id="review"
        checked={reviewed}
        onChange={(v) => {
          if (v) confirmReview();
          else setReviewedDoc(false);
        }}
        className="mt-5"
      >
        Ho revisionato il documento, verificato le attribuzioni e distinto accordi e proposte.
      </CheckRow>

      {sentTo ? (
        <p className="mt-4 rounded-lg bg-sky px-4 py-3 text-sm">
          Inviato a {sentTo.join(" e ")} · cc {REPORT_CC}.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void sendEmail()} disabled={busy}>
          <Mail className="size-4" />
          Invia il Word alle due email
        </Button>
        <Button variant="secondary" onClick={exportWord} disabled={busy}>
          Scarica documento Word .docx
        </Button>
        <a ref={downloadRef} className="sr-only" download={filename}>
          Scarica
        </a>
        <Button variant="secondary" onClick={() => setStep(3)} disabled={busy}>
          Torna alla modifica
        </Button>
        <Button variant="secondary" onClick={saveBackup} disabled={busy}>
          Salva anche il backup
        </Button>
      </div>
      {fileHref ? (
        <p className="mt-4 text-sm">
          <a
            href={fileHref}
            download={filename}
            className="text-accent font-semibold underline-offset-2 hover:underline"
          >
            Se il file non parte, scaricalo da qui
          </a>
        </p>
      ) : null}
      <p className="text-muted mt-5 text-sm">
        Destinatari: le email della preparazione. Mittente e copia: {REPORT_CC}. Il file Word
        generato viene allegato e inviato da Gmail.
      </p>
    </section>
  );
}
