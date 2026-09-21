import type { MeetingBackup } from "./types";

export const SAMPLE_BACKUP: MeetingBackup = {
  version: 1,
  meta: {
    nameA: "Luca Ferrero",
    emailA: "luca.ferrero@example.com",
    companyA: "Ferrero Consulenza",
    roleA: "Commercialista, PMI e fiscale",
    nameB: "Elena Martini",
    emailB: "elena.martini@example.com",
    companyB: "Atelier Digitale",
    roleB: "Fondatrice, siti web e identità visiva",
    chapter: "BNI Milano Navigli",
    date: "2026-09-12",
    goal: "Conoscere i rispettivi clienti ideali e valutare una collaborazione su pacchetti sito + contabilità per nuovi imprenditori.",
  },
  transcript: `[00:00:08] Luca Ferrero: Grazie Elena per questo one to one. Io seguo PMI e professionisti su contabilità, bilancio e adempimenti. Il cliente ideale è chi ha appena aperto partita IVA o sta passando da un commercialista “di routine” a uno che ragiona anche su flussi e tasse.

[00:00:42] Elena Martini: Perfetto. Io progetto siti e identità visiva per studi professionali e artigiani. Il mio cliente ideale è chi ha già un passaparola ma un sito fermo da anni, o chi sta lanciando l’attività e vuole presentarsi in modo credibile.

[00:01:18] Luca Ferrero: Molti dei miei nuovi clienti arrivano da passaparola BNI. Quando aprono, hanno bisogno di un sito minimo: chi sono, servizi, contatto, e una pagina per il curriculum. Non vogliono un e-commerce.

[00:01:48] Elena Martini: Io ho tre pacchetti: visibilità, studio, e rebrand. Il pacchetto studio è pensato proprio per commercialisti, avvocati, consulenti. Tempi: quattro-sei settimane. Non faccio SEO aggressiva, ma sistemo Google Business e i testi.

[00:02:22] Luca Ferrero: Mi tornerebbe utile. Io non ho un grafico di fiducia da presentare. In cambio, posso seguirti su regime forfettario, soci e scadenze. I tuoi clienti creativi spesso arrivano in ritardo sui versamenti.

[00:02:54] Elena Martini: Sì, e io non voglio diventare il loro ufficio amministrativo. Se ho un commercialista di riferimento, è un sollievo. Possiamo fare un primo invio reciproco entro ottobre: io ti mando due titolari in apertura, tu mi presenti uno studio che vuole rifare il sito.

[00:03:28] Luca Ferrero: Concordo. Io ho in mente lo studio di Giulia Romano, consulente del lavoro, sito del 2018. Le chiedo il permesso e ti faccio un’introduzione scritta. Tu per me: coppia che apre un laboratorio di pasticceria a Porta Romana.

[00:04:02] Elena Martini: Va bene. Prima di presentare, ci scambiamo una bozza di email. Prossimo incontro: giovedì 2 ottobre, dopo la riunione di capitolo, 20 minuti per allineare le due presentazioni.

[00:04:28] Luca Ferrero: Perfetto. Se manca un dato lo segniamo come da concordare, senza inventare scadenze. Grazie.`,
  report: [
    `[DICHIARATO] Incontro 1-to-1 tra Luca Ferrero (Ferrero Consulenza, commercialista PMI) ed Elena Martini (Atelier Digitale, siti e identità visiva), capitolo BNI Milano Navigli, 12 settembre 2026.
[CONCORDATO] Obiettivo raggiunto: si sono definiti i clienti ideali e un primo scambio di referenze entro ottobre, con verifica il 2 ottobre.
[PROPOSTA AI] Il valore dell’incontro sta nel coprire due bisogni complementari all’apertura di un’attività: adempimenti fiscali e presenza digitale essenziale.`,
    `[DICHIARATO] Luca: commercialista per PMI e professionisti; target chi apre partita IVA o vuole un consulente orientato a flussi e tasse.
[DICHIARATO] Elena: fondatrice di Atelier Digitale; siti e identità visiva per studi e artigiani; tre pacchetti (visibilità, studio, rebrand); tempi 4–6 settimane; Google Business e testi, senza SEO aggressiva.
[PROPOSTA AI] I due profili si rivolgono allo stesso momento di vita dell’impresa (avvio o riqualificazione), con linguaggi diversi ma destinatari sovrapposti.`,
    `[DICHIARATO] I nuovi clienti di Luca arrivano da passaparola BNI e chiedono un sito minimo, non un e-commerce.
[DICHIARATO] Elena non vuole gestire l’amministrazione dei clienti creativi; Luca non ha un grafico di fiducia da presentare.
[CONCORDATO] Primo scambio di referenze entro ottobre e punto di verifica il 2 ottobre dopo la riunione di capitolo.
[DICHIARATO] Prima di presentare, si scambiano una bozza di email.`,
    `[DICHIARATO] Stesso bacino: professionisti e piccole attività in avvio o rinnovo di immagine.
[DICHIARATO] Complementarità esplicita: Luca porta disciplina fiscale, Elena porta presenza visiva credibile.
[CONCORDATO] Formato di collaborazione iniziale: presentazioni reciproche, non un’offerta congiunta già prezzata.`,
    `[DICHIARATO] Elena non fa SEO aggressiva; Luca non segue progetti e-commerce. Restano fuori i clienti che cercano solo traffico o vendita online.
[DICHIARATO] I creativi di Elena arrivano spesso in ritardo sui versamenti: rischio operativo se la referenza non è accompagnata da aspettative chiare.
[PROPOSTA AI] Non è emerso un listino condiviso né un responsabile unico del pacchetto combinato — da non presentare come già esistente.`,
    `[CONCORDATO] Scambio di referenze: Elena invia a Luca due titolari in apertura; Luca presenta a Elena uno studio che vuole rifare il sito.
[PROPOSTA AI] Pacchetto “apertura attività”: sito minimo (chi sono, servizi, contatto, curriculum) + avvio contabile. Da validare prezzo, chi fattura cosa, e destinatario.
[DICHIARATO] Destinatari citati: nuovi imprenditori BNI e studi professionali con sito datato.`,
    `[CONCORDATO] Luca presenta Giulia Romano, consulente del lavoro, sito del 2018 — dopo aver chiesto il permesso, con introduzione scritta.
[CONCORDATO] Elena presenta una coppia che apre un laboratorio di pasticceria a Porta Romana.
[DICHIARATO] Bozza email di presentazione da scambiarsi prima dell’invio.
[PROPOSTA AI] Formula di apertura: “Vi presento un collega di capitolo con cui ho appena fatto un 1-to-1, per un bisogno concreto che hai citato.”`,
    `[CONCORDATO] Entro ottobre: due invii da Elena verso Luca; una presentazione da Luca verso Elena (Giulia Romano, previo consenso).
[CONCORDATO] Giovedì 2 ottobre, 20 minuti dopo la riunione di capitolo: allineamento delle due presentazioni.
[CONCORDATO] Scambio preventivo delle bozze email.
[DICHIARATO] Dati mancanti (orario esatto, luogo, template email): da concordare.
Responsabile presentazioni Luca: Luca Ferrero. Responsabile presentazioni Elena: Elena Martini. Scadenza verifica: 2 ottobre 2026.`,
    `[DICHIARATO] Prossimo incontro: giovedì 2 ottobre, dopo la riunione, 20 minuti.
[PROPOSTA AI] Da definire: orario preciso, canale delle bozze (WhatsApp o email), e se il pacchetto combinato verrà mai offerto o resterà solo referral.
[DICHIARATO] Accordo esplicito a non inventare scadenze se un dato manca.`,
  ],
};
