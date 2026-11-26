# AI ACT · Copilota

Applicazione per censire gli usi dell’IA, orientarsi nel regolamento europeo e documentare il lavoro dell’organizzazione.

## Avvio e collaudo

Serve Node.js 24 o successivo.

```sh
npm ci
npm start
npm test
npx playwright install chromium
npm run test:browser
```

Aprire http://localhost:8000. Per il collaudo è anche possibile indicare un eseguibile Chromium tramite `BROWSER_EXECUTABLE`. I test usano un database isolato sotto `private/`.

## Modalità locale e trasferimento dati

GitHub Pages pubblica la modalità locale. Il layout e le chiavi storiche del browser sono stati mantenuti. Il registro «Interviste e survey» riprende entrambe le raccolte precedenti, conserva il tipo e mantiene le due raccolte originali nella copia. Le nuove modifiche riguardano il registro unificato. Se esiste soltanto il registro storico `aio-act-v1`, viene aperto come organizzazione importata.

Per trasferire un’organizzazione, aprire **Dati e account → Esporta workspace JSON** sul sito e nel browser in cui sono stati inseriti i dati. Sul server, accedere e scegliere **Importa come nuova organizzazione**. Ripetere per ciascuna organizzazione. L’importazione conserva la copia locale ed evita sovrascritture. Il JSON contiene il workspace e l’eventuale visura e va custodito come un documento riservato.

## Server con account

Copiare `.env.example` in `.env` o impostare le stesse variabili nel servizio di hosting. Il server richiede un unico processo con volume persistente e HTTPS davanti all’applicazione. Impostare `APP_ORIGIN` all’origine pubblica esatta, `DB_PATH` sul volume privato e, se necessario, `BIND_HOST=0.0.0.0` dietro il proxy. Le richieste di modifica sono accettate solo dall’origine configurata. `GET /api/status` risponde quando il processo ha aperto il database.

- Impostare `REGISTRATION_KEY` con almeno 24 caratteri casuali per abilitare la registrazione riservata. La chiave si comunica separatamente alle persone autorizzate. Per ora l’email è un identificativo e va verificata dall’amministratore attraverso un canale separato prima di concedere accesso. Recupero password e verifica email automatica sono da integrare per un servizio pubblico.
- L’amministratore crea, elimina e gestisce gli accessi al workspace. Il collaboratore modifica il contenuto. Il lettore consulta e scarica documenti autorizzati. Le autorizzazioni sono applicate sul server.
- Dopo aver modificato dati nell’interfaccia, selezionare **Salva modifiche sul server**. Se un’altra sessione ha aggiornato il workspace, esportare la bozza in JSON prima di ricaricare e riconciliare le modifiche.
- Il server conserva il PDF della visura separatamente dai dati JSON. Il PDF viene restituito come allegato solo agli utenti autorizzati. La verifica della firma PDF è un controllo di formato, non una scansione antimalware. I documenti gestiti dalla sezione Documenti comprendono gli export dei registri e la bozza di policy.
- Il comando `npm run backup -- /percorso/privato/copilota-YYYY-MM-DD.sqlite` esegue una copia coerente anche a servizio attivo. Configurare esecuzione periodica, conservazione e cifratura su una destinazione separata. Per provare il ripristino, avviare un’istanza isolata con la copia e verificare l’accesso e i documenti. In produzione fermare il server prima di ripristinare in un nuovo percorso e aggiornare `DB_PATH`. Le copie includono dati aziendali, credenziali derivate e sessioni. Dopo un ripristino di produzione invalidare le sessioni della copia prima del riavvio.
- L’area Dati e account contiene le informazioni operative sul trattamento, l’esportazione del workspace e la cancellazione da parte dell’amministratore. Prima di un’apertura al pubblico, completare l’informativa con il titolare, i contatti, i fornitori effettivi, le basi giuridiche e la conservazione, inclusi i backup e gli account.
- Il Copilota locale rimane disponibile. Per abilitare la modalità generativa, impostare `OPENAI_API_KEY` e `OPENAI_MODEL` sul server dopo autorizzazione di spesa. La richiesta parte solo se l’utente sceglie di inviarla. Invia la domanda e le istruzioni generali, senza allegati o registri. Il server richiede al fornitore di non memorizzare la risposta tramite `store: false`. Verificare i termini e le impostazioni dell’account prima dell’uso.

## Screening e fonti

Lo screening è orientativo. Il risultato dipende dalla finalità, dal contesto, dal ruolo e dalle condizioni applicabili. Le date generali riportate per l’alto rischio e la trasparenza prevedono eccezioni e transizioni specifiche.

- [Regolamento (UE) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=it)
- [Regolamento (UE) 2026/1744, Digital Omnibus sull’IA](https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=it)
- [Commissione europea, applicazione del regolamento](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)

## Pubblicazione

GitHub Pages serve il frontend statico dalla radice del ramo configurato. Non esegue il server Node.js. Per la modalità con account, pubblicare il server e il frontend sulla stessa origine. Tenere il database e i backup fuori da qualunque percorso pubblico. Verificare accesso, permessi, allegati e ripristino sul servizio effettivo prima di caricare dati aziendali.
