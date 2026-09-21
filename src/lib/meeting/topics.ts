import type { MeetingMeta } from "./types";

export type TopicPillar = {
  id: string;
  title: string;
  prompts: string[];
};

function who(name: string, fallback: string) {
  const n = name.trim();
  return n || fallback;
}

function of(name: string, company: string, role: string, fallback: string) {
  const n = name.trim();
  const c = company.trim();
  const r = role.trim();
  if (n && c) return `${n} (${c})`;
  if (n && r) return `${n}, ${r}`;
  if (n) return n;
  if (c) return c;
  return fallback;
}

function pick<T>(items: T[], rotation: number, salt: number, count: number) {
  const out: T[] = [];
  if (!items.length) return out;
  const start = Math.abs(rotation + salt) % items.length;
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}

export function buildTopics(meta: MeetingMeta, rotation = 0): TopicPillar[] {
  const a = who(meta.nameA, "il primo partecipante");
  const b = who(meta.nameB, "il secondo partecipante");
  const aFull = of(meta.nameA, meta.companyA, meta.roleA, "il primo partecipante");
  const bFull = of(meta.nameB, meta.companyB, meta.roleB, "il secondo partecipante");
  const aCo = meta.companyA.trim() || `l’attività di ${a}`;
  const bCo = meta.companyB.trim() || `l’attività di ${b}`;
  const goal = meta.goal.trim() || "far uscire da qui referenze utili e un piano chiaro";

  const pillars: { id: string; title: string; pool: string[] }[] = [
    {
      id: "growth",
      title: "Partire dall’attività e dalla direzione di crescita",
      pool: [
        `${a}, in che direzione vuoi far crescere ${aCo} nei prossimi 12 mesi?`,
        `${b}, cosa deve essere vero tra 90 giorni perché tu consideri l’anno riuscito per ${bCo}?`,
        `Quale parte del lavoro ${a} vuole fare di più, e quale vuole lasciare?`,
        `${bFull}: qual è il pezzo di mercato in cui volete diventare il riferimento, non uno dei tanti?`,
        `Da dove partiamo oggi, rispetto all’obiettivo: ${goal}?`,
        `${aFull}, cosa è cambiato nella vostra attività dall’ultimo trimestre e cosa non può più restare uguale?`,
      ],
    },
    {
      id: "value",
      title: "Capire quali opportunità hanno più valore",
      pool: [
        `${a}, tra le richieste che ti arrivano, quali ti fanno fatturato e quali solo occupano tempo?`,
        `Quale opportunità, se arrivasse questa settimana, sposterebbe il trimestre di ${bCo}?`,
        `${b}, dov’è il «sì» che vale una vendita, e dov’è quello detto solo per educazione?`,
        `Quali tre tipi di introduzione ${aFull} non vuole più ricevere?`,
        `Se poteste scegliere una sola porta da aprire per ${aCo}, quale sarebbe e perché vale di più delle altre?`,
        `${bFull}, quale segnale ti fa capire subito che un contatto ha valore reale?`,
      ],
    },
    {
      id: "client",
      title: "Definire il cliente da cercare",
      pool: [
        `${a}, descrivi il cliente che vuoi incontrare: settore, momento, urgenza.`,
        `${b}, chi NON è il tuo cliente, così evitiamo referenze sbagliate?`,
        `Quale frase dovrebbe dire un collega per riconoscere al volo la persona giusta per ${aCo}?`,
        `In quale momento della vita dell’impresa ${bFull} interviene meglio — avvio, crescita, crisi, passaggio?`,
        `Chi paga, chi decide e chi soffre il problema che ${a} risolve?`,
        `Se ${b} dovesse presentarti una sola persona lunedì, che profilo esatto dovrebbe avere?`,
      ],
    },
    {
      id: "referral",
      title: "Preparare una referenza che possa diventare vendita",
      pool: [
        `Quale introduzione precisa può fare ${b} per ${a} questa settimana, con nome e contesto?`,
        `Come suona una referenza che apre una vendita, non un caffè di cortesia, per ${aCo}?`,
        `Chi, nella rete di ${bFull}, ha già il problema che ${a} risolve adesso?`,
        `${a}, cosa deve sentire il contatto nei primi 20 secondi per accettare la chiamata?`,
        `Quale prova, caso o risultato può usare ${b} per presentare ${a} senza vendere al posto suo?`,
        `Qual è il passo dopo l’introduzione — messaggio, call, incontro — e chi lo fissa?`,
      ],
    },
    {
      id: "reciprocal",
      title: "Individuare opportunità reciproche",
      pool: [
        `Cosa può portare ${a} a ${b} che ${b} non può procurarsi da solo?`,
        `Dove ${aCo} e ${bCo} toccano lo stesso cliente, nello stesso momento?`,
        `Quale scambio concreto — non networking generico — potete fare entro 14 giorni?`,
        `${bFull}, quale tipo di contatto farebbe crescere ${a} tanto quanto ${a} può far crescere te?`,
        `C’è un’offerta combinata da validare, o restiamo su referenze pulite e distinte?`,
        `Chi dei due è più vicino al cliente ideale dell’altro, e come lo usiamo senza calpestarci?`,
      ],
    },
    {
      id: "plan",
      title: "Trasformare l’incontro in un piano operativo",
      pool: [
        `Quali tre azioni uscite da qui, con nome, data e responsabile?`,
        `Chi presenta chi, entro quando, e su quale contatto preciso?`,
        `Quando è il prossimo check e chi invia il primo messaggio di follow-up?`,
        `Cosa deve essere vero tra 30 giorni per dire che questo 1-to-1 ha funzionato?`,
        `Cosa resta ipotesi da validare, e cosa è già un impegno reciproco?`,
        `Come misurate il risultato: una call fissata, una referenza data, una vendita aperta?`,
      ],
    },
  ];

  return pillars.map((pillar, index) => ({
    id: pillar.id,
    title: pillar.title,
    prompts: pick(pillar.pool, rotation, index * 3, 2),
  }));
}
