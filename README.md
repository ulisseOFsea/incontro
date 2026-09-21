# One to One Cloud

Workspace per incontri 1-to-1: prepara i partecipanti, registra l’audio, trascrivi, analizza le opportunità e invia un report Word.

## Funzioni

- Preparazione con nomi, email, capitolo e obiettivo
- Registrazione a più spezzoni (MP3) e trascrizione unica
- Analisi AI in 9 sezioni
- Export Word professionale (titolo, indice, intestazione)
- Invio del Word alle due email, mittente e CC `info@consulentesmart.com`
- Registro attività (tempi, persone, totali settimanali, aggregato per capitolo)

## Avvio

```bash
npm install
npm run dev
```

Apri `http://localhost:8080`.

## Note

- Trascrizione e analisi usano Grok (xAI).
- L’invio email usa Gmail collegata.
- Il registro attività è protetto da password.
