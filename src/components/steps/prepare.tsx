import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepPanel } from "@/components/step-panel";
import { useMeetingStore } from "@/lib/meeting/store";
import { logUsage } from "@/lib/meeting/usage";
import { isEmail } from "@/lib/utils";

function PersonCard({
  who,
  nameId,
}: {
  who: "A" | "B";
  nameId: "A" | "B";
}) {
  const meta = useMeetingStore((s) => s.meta);
  const patchMeta = useMeetingStore((s) => s.patchMeta);
  const prefix = nameId;
  const name = meta[`name${prefix}`];
  const email = meta[`email${prefix}`];
  const company = meta[`company${prefix}`];
  const role = meta[`role${prefix}`];
  const emailOk = isEmail(email);

  return (
    <div className="rounded-lg bg-sky p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-sm text-accent">
          {who}
        </span>
        {who === "A" ? "Primo partecipante" : "Secondo partecipante"}
      </h3>
      <Label htmlFor={`name${prefix}`}>Nome e cognome</Label>
      <Input
        id={`name${prefix}`}
        value={name}
        placeholder="Nome del partecipante"
        autoComplete="name"
        onChange={(e) =>
          patchMeta({ [`name${prefix}`]: e.target.value } as Partial<typeof meta>)
        }
      />
      <Label htmlFor={`email${prefix}`} className="mt-3">
        Email <span className="text-danger">*</span>
      </Label>
      <Input
        id={`email${prefix}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        placeholder="nome@azienda.it"
        aria-invalid={email.length > 0 && !emailOk}
        onChange={(e) =>
          patchMeta({ [`email${prefix}`]: e.target.value } as Partial<typeof meta>)
        }
      />
      {email.length > 0 && !emailOk ? (
        <p className="mt-1 text-xs text-danger">Inserisci un’email valida.</p>
      ) : (
        <p className="text-muted mt-1 text-xs">Qui arriverà il Word a fine incontro.</p>
      )}
      <Label htmlFor={`company${prefix}`} className="mt-3">
        Azienda o studio
      </Label>
      <Input
        id={`company${prefix}`}
        value={company}
        placeholder="Nome dell’attività"
        onChange={(e) =>
          patchMeta({ [`company${prefix}`]: e.target.value } as Partial<typeof meta>)
        }
      />
      <Label htmlFor={`role${prefix}`} className="mt-3">
        Ruolo e specializzazione
      </Label>
      <Input
        id={`role${prefix}`}
        value={role}
        placeholder="Di cosa si occupa"
        onChange={(e) =>
          patchMeta({ [`role${prefix}`]: e.target.value } as Partial<typeof meta>)
        }
      />
    </div>
  );
}

export function PrepareStep() {
  const meta = useMeetingStore((s) => s.meta);
  const patchMeta = useMeetingStore((s) => s.patchMeta);
  const setStep = useMeetingStore((s) => s.setStep);
  const setNotice = useMeetingStore((s) => s.setNotice);
  const ready = isEmail(meta.emailA) && isEmail(meta.emailB);

  function continueToAudio() {
    if (!ready) {
      setNotice("Inserisci un’email valida per entrambi i partecipanti.", true);
      return;
    }
    setNotice("Partecipanti pronti. Passa all’audio.");
    logUsage("partecipanti", "Partecipanti e email confermati");
    setStep(1);
  }

  return (
    <StepPanel
      title="Due professionisti. Un nuovo incontro."
      hint="Le email servono per inviare il Word a entrambi a fine sessione."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonCard who="A" nameId="A" />
        <PersonCard who="B" nameId="B" />
      </div>

      <div className="mt-5">
        <Label htmlFor="chapter">Capitolo / gruppo</Label>
        <Input
          id="chapter"
          value={meta.chapter}
          placeholder="Nome del capitolo BNI"
          onChange={(e) => patchMeta({ chapter: e.target.value })}
        />
      </div>

      <Label htmlFor="goal" className="mt-4">
        Obiettivo dell’incontro
      </Label>
      <Textarea
        id="goal"
        rows={3}
        value={meta.goal}
        placeholder="Ad esempio: conoscere i rispettivi clienti ideali e individuare una prima collaborazione."
        onChange={(e) => patchMeta({ goal: e.target.value })}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={continueToAudio} disabled={!ready}>
          Continua con l’audio
          <ArrowRight className="size-4" />
        </Button>
        {!ready ? (
          <p className="text-muted text-sm">Servono due email valide per proseguire.</p>
        ) : null}
      </div>
    </StepPanel>
  );
}
