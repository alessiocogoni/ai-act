export const sources = {
  law: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=it",
  consolidated: "https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/ita/pdf",
  transparency: "https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act",
  amendment: "https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=it",
  timeline:
    "https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force",
  guidance:
    "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
};

export const scenarios = {
  prohibited: [
    "Possibile pratica vietata (art. 5)",
    "Sospendi la valutazione operativa e verifica se ricorrono le condizioni esatte del divieto o eventuali eccezioni.",
  ],
  annex1: [
    "Possibile alto rischio (art. 6, par. 1 e allegato I)",
    "Verifica funzione di sicurezza o qualifica come prodotto e obbligo di valutazione di conformità da parte di terzi. Data generale di applicazione: 2 agosto 2028.",
  ],
  annex3: [
    "Possibile alto rischio (art. 6, par. 2 e allegato III)",
    "Verifica finalità, eccezioni dell’art. 6, par. 3 e profilazione di persone. Data generale di applicazione: 2 dicembre 2027.",
  ],
  transparency: [
    "Possibili obblighi di trasparenza (art. 50)",
    "Verifica obblighi e deroghe per interazione con persone, marcatura dei contenuti o loro divulgazione. Applicazione generale dal 2 agosto 2026. Per alcuni sistemi già immessi sul mercato, il termine per la marcatura dei contenuti sintetici è il 2 dicembre 2026.",
  ],
  other: [
    "Servono altri elementi",
    "Documenta finalità, utenti, effetti sulle persone e ruolo. Valuta anche trasparenza, alfabetizzazione IA e protezione dei dati.",
  ],
};

export function assess({ scenario, role, transparency }) {
  if (
    !Object.hasOwn(scenarios, scenario) ||
    !["provider", "deployer", "unknown"].includes(role)
  )
    return null;
  const [title, action] = scenarios[scenario];
  const next = [action];
  if (scenario !== "prohibited") {
    if (role === "provider")
      next.push(
        "Fornitore: verifica requisiti, documentazione e, se applicabile, valutazione di conformità e registrazione.",
      );
    if (role === "deployer")
      next.push(
        "Deployer: verifica istruzioni, supervisione umana e gli eventuali obblighi dell’art. 26.",
      );
    if (role === "unknown")
      next.push(
        "Chiarisci chi sviluppa, commercializza o usa il sistema. Verifica eventuali cambi di ruolo ai sensi dell’art. 25.",
      );
    if (transparency && scenario !== "transparency")
      next.push(scenarios.transparency[1]);
  }
  return { title, next, sources, checked: "2026-11-26" };
}

export function localCopilot(question, workspace = {}, previousTopic = "") {
  const input = String(question ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const law = ["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"];
  const literacy = ["Commissione – FAQ alfabetizzazione","https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers"];
  const trans = ["FAQ Commissione – art. 50", sources.transparency];
  const items = Array.isArray(workspace.systems) ? workspace.systems : [];
  const p = workspacePriorities(workspace);
  const topics = [
    ["definition", /cos.e.{0,12}un sistema.{0,10}(ia|ai)|definizione.{0,20}(sistema|ia)|software tradizionale|automazione.{0,20}(ia|ai)|come (capisco|distinguo).{0,30}(ia|ai)/, "risk", "Apri Screening AI Act", "Art. 3, punto 1. La qualificazione non dipende dal nome commerciale: verifica se il sistema basato su macchina inferisce dagli input come generare risultati, ad esempio previsioni, contenuti, raccomandazioni o decisioni. Una semplice automazione a regole definite dalle persone non è automaticamente IA. Documenta funzionamento e finalità.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Orientamenti sulla definizione di sistema IA","https://digital-strategy.ec.europa.eu/it/library/commission-publishes-guidelines-ai-system-definition-facilitate-first-ai-acts-rules-application"]], []],
    ["literacyCertificate", /(attestat|certificat|diplom).{0,35}(formaz|alfabetizz|ia|ai)|(formaz|alfabetizz).{0,30}(attestat|certificat|obblig)|corso.{0,20}obbligator|ore.{0,15}formaz/, "training", "Apri Formazione", "Art. 4. L'alfabetizzazione resta un obbligo, anche dopo la modifica di luglio 2026. Non è richiesto un certificato unico o un livello individuale specifico. Non è stabilito un monte ore uguale per tutti. Calibra le iniziative su persone, competenze e contesto; conserva evidenze interne.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ alfabetizzazione","https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers"],["Regolamento UE 2026/1744","https://eur-lex.europa.eu/legal-content/it/TXT/?uri=oj%3AL_202601744"]], []],
    ["aiOfficer", /ai officer|responsabil.{0,20}(ia|ai).{0,20}obbligator|comitato.{0,15}(ia|ai)/, "profile", "Apri Organizzazione", "Art. 4. Non impone la nomina di un AI Officer o di un comitato specifico. Assegnare un referente interno è una buona pratica organizzativa, non un obbligo generalizzato. Valuta separatamente gli eventuali obblighi del GDPR, incluso il DPO.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ alfabetizzazione","https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers"]], []],
    ["chatgptTraining", /(chatgpt|copilot|gemini).{0,40}(formaz|alfabetizz)|(formaz|alfabetizz).{0,40}(chatgpt|copilot|gemini)/, "training", "Apri Formazione", "Anche chi usa IA generativa in azienda per traduzioni e testi deve ricevere misure di alfabetizzazione adeguate. Spiega i rischi di errori plausibili, riservatezza e verifica dei risultati. Registra le iniziative svolte.", [["Commissione – FAQ alfabetizzazione","https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers"],["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"]], []],
    ["chatbotNotice", /(chatbot|assistente virtuale|agente ia).{0,45}(avvis|inform|dichiar|etichett)|(avvis|inform|dichiar).{0,35}(chatbot|assistente virtuale)/, "risk", "Apri Screening AI Act", "Art. 50, parr. 1 e 5. Il fornitore di un sistema progettato per interagire direttamente con persone deve predisporre l'informazione che si tratta di IA, salvo quando è evidente o ricorre un'eccezione. L'informazione deve essere chiara e disponibile entro la prima interazione. Per strumenti acquistati verifica l'avviso effettivo.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ art. 50","https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act"],["Orientamenti sulla trasparenza","https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems"]], []],
    ["syntheticMark", /marcatura.{0,25}(contenut|sintetic|ia|ai)|watermark|filigran|rilevabilit.{0,15}contenut|etichett.{0,20}(immagin|video|audio)/, "risk", "Apri Screening AI Act", "Art. 50, parr. 2 e 4. La marcatura rilevabile da macchina riguarda i fornitori di sistemi generativi, con eccezioni specifiche. La divulgazione del deployer è distinta. La proroga al 2 dicembre 2026 riguarda soltanto marcatura e rilevazione dei sistemi immessi sul mercato prima del 2 agosto 2026, non tutto l'articolo.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ art. 50","https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act"],["Orientamenti sulla trasparenza","https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems"]], []],
    ["publicText", /test[io].{0,40}interesse pubblico|articol[io].{0,35}(giornal|notizi)|pubblicaz.{0,20}notizi.{0,15}(ia|ai)/, "risk", "Apri Screening AI Act", "Art. 50, par. 4. Per testi generati o manipolati dall'IA e pubblicati per informare su questioni di interesse pubblico, verifica la divulgazione obbligatoria. È prevista un'eccezione quando sussistono effettivo controllo umano o editoriale e responsabilità editoriale. Una correzione grammaticale superficiale non basta.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ art. 50","https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act"]], []],
    ["newProhibition", /nudif|nuov.{0,20}diviet.{0,20}dicembre/, "risk", "Apri Screening AI Act", "Art. 5, come modificato dall'Omnibus. Il nuovo divieto relativo ai sistemi che generano contenuti intimi o sessualmente espliciti non consensuali o materiale di abuso sessuale su minori diventa applicabile a dicembre 2026. Non confonderlo con gli otto divieti originari già applicabili dal febbraio 2025. Restano da verificare le altre norme già vigenti.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Regolamento UE 2026/1744","https://eur-lex.europa.eu/legal-content/it/TXT/?uri=oj%3AL_202601744"],["Commissione – calendario di applicazione","https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"]], []],
    ["legacyGpai", /(gpai|modelli?).{0,35}(prima del|precedent|2027)|modelli?.{0,20}(gia|esistent).{0,20}(mercat|2025)/, "risk", "Apri Screening AI Act", "Art. 111, par. 3. Gli obblighi GPAI si applicano dal 2 agosto 2025; per i modelli già immessi sul mercato prima di tale data, il termine generale è il 2 agosto 2027. Identifica modello, fornitore e data di immissione. Gli obblighi del sistema che integra il modello sono distinti.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ GPAI","https://digital-strategy.ec.europa.eu/it/faqs/general-purpose-ai-models-ai-act-questions-answers"]], []],
    ["gpaiObligations", /(obbligh|requisit|documentaz).{0,30}(gpai|modelli.{0,15}generali)|rischio sistemico|fine.tuning/, "risk", "Apri Screening AI Act", "Artt. 51–55. Per i fornitori GPAI verifica documentazione, informazioni ai fornitori a valle, diritto d'autore e sintesi pubblica dei dati di addestramento. Per i modelli con rischio sistemico si aggiungono valutazioni, mitigazioni e cybersecurity. Una modifica richiede una verifica specifica del ruolo.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Commissione – FAQ GPAI","https://digital-strategy.ec.europa.eu/it/faqs/general-purpose-ai-models-ai-act-questions-answers"]], []],
    ["paGuidelines", /(linee guida|determinaz).{0,45}(pa\b|pubblica amministraz|agid)|agid.{0,25}(pa\b|linee guida)|adozione.{0,30}(pa\b|pubblica amministraz)/, "tasks", "Apri Piano d’azione", "AgID, determinazione 169 del 9 novembre 2026: sono state adottate le linee guida per l'IA nella PA. Consulta il documento ufficiale e integra governance, processi di adozione e responsabilità con gli obblighi UE e nazionali applicabili.", [["Gazzetta Ufficiale – adozione linee guida IA per PA","https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.codiceRedazionale=26A05983&atto.dataPubblicazioneGazzetta=2026-11-16&tipoSerie=serie_generale&tipoVigenza=originario"],["Legge italiana 132/2025","https://www.normattiva.it/eli/id/2025/09/25/25G00143/CONSOLIDATED"],["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"]], []],
    ["italyLaw", /legge.{0,15}132|normativ.{0,20}italian|legge italiana.{0,15}(ia|ai)|decreto.{0,15}179|autorita.{0,20}(italian|nazional)|\bagid\b|\bacn\b/, "risk", "Apri Screening AI Act", "Il quadro UE è affiancato dalla legge italiana 132/2025 e dai decreti attuativi, tra cui il d.lgs. 179/2026 sulle autorità nazionali e la formazione. AgID e ACN sono designate autorità nazionali, ferme le competenze settoriali. Verifica materia e autorità prima di stabilire obblighi o inviare segnalazioni.", [["Legge italiana 132/2025","https://www.normattiva.it/eli/id/2025/09/25/25G00143/CONSOLIDATED"],["D.lgs. 179/2026","https://www.gazzettaufficiale.it/eli/id/2026/10/08/26G00200/SG"],["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"]], []],
    ["annexException", /eccezion.{0,30}(alto rischio|allegato iii|art.{0,4}6)|art(?:icolo|\.)?\s*6.{0,12}(par|comma).{0,5}3|compit.{0,15}procedural/, "risk", "Apri Screening AI Act", "Art. 6, parr. 2–4. Per i casi dell'Allegato III verifica l'assenza di rischio significativo e le condizioni specifiche di esclusione. Un sistema che profila persone fisiche è comunque ad alto rischio in questo contesto. Il fornitore deve documentare la valutazione; verifica il regime vigente di registrazione. Gli orientamenti consultati sono ancora in bozza.", [["AI Act – testo consolidato","https://eur-lex.europa.eu/eli/reg/2024/1689"],["Progetto di orientamenti alto rischio (bozza)","https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-high-risk-systems"],["Regolamento UE 2026/1744","https://eur-lex.europa.eu/legal-content/it/TXT/?uri=oj%3AL_202601744"]], []],

    ["medical", /sanit[aà]|ospedal|diagnos|dispositiv.{0,15}medic|radiolog|pazient/, "risk", "Apri Screening AI Act", "In sanità verifica la destinazione d’uso, l’eventuale qualifica come dispositivo medico o componente di sicurezza e le condizioni dell’art. 6, par. 1 e dell’Allegato I. Un assistente amministrativo non è automaticamente un dispositivo medico. Considera anche i dati sanitari e la supervisione clinica.", [law], ["Quali sono i sistemi ad alto rischio?","Quali sono gli obblighi privacy?"]],
    ["education", /scuol|universit|student|ammission.{0,15}(cors|stud)|esam|vot.{0,15}student|istruzion/, "risk", "Apri Screening AI Act", "Nell’istruzione verifica se il sistema determina accesso, ammissione, valutazione degli apprendimenti o controllo degli esami: può rientrare nell’Allegato III. La preparazione di materiale didattico non ha necessariamente lo stesso regime. Considera i minori, i dati e la verifica umana.", [law], ["Quali sono i sistemi ad alto rischio?"]],
    ["finance", /credit scor|merito credit|prestiti|mutu[oi]|banc[ae]|assicuraz|polizz/, "risk", "Apri Screening AI Act", "Per servizi finanziari verifica se l’IA valuta il merito creditizio di persone fisiche o determina rischi e prezzi nelle assicurazioni vita e salute: alcuni usi sono nell’Allegato III. La rilevazione delle frodi finanziarie ha una specifica eccezione nella voce sul merito creditizio. Documenta finalità e decisioni influenzate.", [law], ["Quali sono gli obblighi del deployer?"]],
    ["public", /pubblica amministraz|ente pubblico|comune\b|servizi pubblici|prestazioni sociali|benefici pubblici/, "risk", "Apri Screening AI Act", "Per la PA distingui gli strumenti amministrativi dagli usi che incidono sull'accesso a servizi o prestazioni essenziali. Verifica Allegato III, ruolo, FRIA e registrazione ove previste, nonché le relative date di applicazione. In Italia considera le linee guida AgID adottate il 9 novembre 2026.", [law,["Gazzetta Ufficiale – adozione linee guida IA per PA","https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.codiceRedazionale=26A05983&atto.dataPubblicazioneGazzetta=2026-11-16&tipoSerie=serie_generale&tipoVigenza=originario"],["Legge italiana 132/2025","https://www.normattiva.it/eli/id/2025/09/25/25G00143/CONSOLIDATED"]], ["Quando serve una FRIA?","Come valuto un fornitore?"]],
    ["industry", /macchinar|robot industrial|fabbric|manifattur|produzione industrial|infrastruttur.{0,15}critic/, "risk", "Apri Screening AI Act", "In ambito industriale verifica se il sistema svolge una funzione di sicurezza in un prodotto disciplinato dall’Allegato I o un uso sensibile dell’Allegato III. Per l’art. 6, par. 1 verifica anche l’obbligo di valutazione di conformità da parte di terzi. L’ottimizzazione ordinaria non è automaticamente ad alto rischio.", [law], ["Quali sono i sistemi ad alto rischio?"]],
    ["procurement", /acquist.{0,20}(ia|ai|software)|valut.{0,20}fornitor|contratt.{0,20}fornitor|due diligence|gara d.appalt|vendor|procurement/, "tasks", "Apri Piano d’azione", "Prima di adottare un sistema, raccogli finalità dichiarata, ruolo del fornitore, istruzioni, limitazioni, misure di sicurezza, trattamento dei dati, aggiornamenti e modalità di gestione degli incidenti. Se ad alto rischio verifica documentazione e adempimenti pertinenti. Registra le verifiche e assegna un responsabile.", [law], ["Come preparo una policy interna?"]],
    ["fria", /\bfria\b|impatto sui diritti fondamentali|art(?:icolo|\.)?\s*27\b/, "risk", "Apri Screening AI Act", "La FRIA dell’art. 27 è richiesta per determinate categorie di deployer e determinati sistemi ad alto rischio, non per ogni utilizzo dell’IA. Esamina processi, durata, gruppi interessati, rischi, supervisione e misure di gestione. Verifica eventuali obblighi di notifica e coordinamento con la DPIA.", [law], ["Qual è la differenza con la DPIA?"]],
    ["dpia", /\bdpia\b|valutazione.{0,20}impatto.{0,25}(privacy|protezione dei dati)|art(?:icolo|\.)?\s*35\b.{0,15}gdpr/, "tasks", "Apri Piano d’azione", "La DPIA riguarda la protezione dei dati ai sensi dell’art. 35 GDPR; la FRIA riguarda i diritti fondamentali ai sensi dell’art. 27 AI Act. Hanno presupposti distinti e possono essere entrambe necessarie. Non sostituire automaticamente l’una con l’altra. Valuta il trattamento effettivo e il rischio.", [["GDPR","https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=it"],law], ["Quando serve una FRIA?"]],
    ["incidents", /incident|malfunzion|segnalaz.{0,20}(errore|rischio|autorita)|data breach|art(?:icolo|\.)?\s*73\b/, "tasks", "Apri Piano d’azione", "Definisci una procedura per rilevare, documentare, contenere e segnalare incidenti. In caso di rischio o incidente grave con sistemi ad alto rischio verifica gli obblighi del deployer (art. 26) e del fornitore (art. 73), inclusi destinatari e termini applicabili. Un data breach può comportare ulteriori obblighi GDPR.", [law], ["Come preparo una policy interna?"]],
    ["logs", /\blog\b|registraz.{0,15}automat|tracciabil|conservaz.{0,15}log|art(?:icolo|\.)?\s*12\b/, "tasks", "Apri Piano d’azione", "Per sistemi ad alto rischio verifica gli artt. 12, 19 e 26 sui log, distinguendo fornitore e deployer. Definisci quali registrazioni sono disponibili, chi vi accede, come vengono protette e per quanto tempo conservarle secondo gli obblighi applicabili. Non conservare indiscriminatamente dati personali.", [law], ["Come gestisco gli incidenti?"]],
    ["oversight", /supervisione umana|controllo umano|human oversight|art(?:icolo|\.)?\s*14\b/, "tasks", "Apri Piano d’azione", "Assegna il controllo a persone competenti con autorità adeguata. Per i sistemi ad alto rischio verifica artt. 14 e 26: comprendere limiti, monitorare risultati, evitare fiducia automatica e intervenire o interrompere l’uso quando necessario. Documenta formazione e responsabilità.", [law], ["Come organizzo la formazione?"]],
    ["ce", /marcatura ce|marchio ce|dichiarazione.{0,15}conformit|organismo notificat|certificaz.{0,15}(ia|ai act)|valutazione di conformita|art(?:icolo|\.)?\s*43\b/, "docs", "Apri Documenti", "Non tutti i sistemi IA richiedono marcatura CE o valutazione di conformità. Per quelli soggetti agli obblighi verifica la procedura applicabile, la documentazione, l’eventuale organismo notificato e gli artt. 43, 47 e 48. Un registro o un report di questa piattaforma non è un certificato.", [law], ["Quali sono i sistemi ad alto rischio?"]],
    ["technical", /documentazione tecnica|fascicolo tecnico|sistema.{0,15}gestione.{0,15}qualita|quality management|allegato iv|art(?:icolo|\.)?\s*(9|10|11|15|17)\b/, "docs", "Apri Documenti", "Per un fornitore di sistemi ad alto rischio verifica gestione del rischio, dati, documentazione tecnica, log, trasparenza, supervisione, robustezza e qualità secondo gli articoli applicabili. L’Allegato IV dettaglia la documentazione tecnica. Il materiale interno della piattaforma aiuta a organizzare evidenze, ma non sostituisce il fascicolo richiesto.", [law], ["Come funziona la valutazione di conformità?"]],
    ["change", /modific.{0,15}sostanzial|cambio.{0,15}finalit|rebranding|white label|art(?:icolo|\.)?\s*25\b/, "risk", "Apri Screening AI Act", "Una modifica sostanziale, un cambio di finalità o la commercializzazione sotto il proprio nome possono incidere sul ruolo secondo l’art. 25, nei casi previsti. Prima di modificare o rivendere un sistema, riesamina classificazione, istruzioni e obblighi.", [law], ["Qual è il mio ruolo?"]],
    ["marketing", /marketing|pubblicit|social media|copywriting|e.commerce|negozio online|commercio elettronico/, "systems", "Apri Registro IA", "Per marketing e commercio registra la finalità e i dati utilizzati. Verifica riservatezza, correttezza dei contenuti, eventuale profilazione e obblighi di trasparenza applicabili. Un generatore di testi pubblicitari non è automaticamente ad alto rischio; altri usi, come valutazioni delle persone, richiedono verifiche diverse.", [law], ["Quali obblighi di trasparenza?"]],
    ["copyright", /copyright|diritto d.autore|proprieta intellettuale|licenz.{0,15}(modello|immagin|contenut)/, "tasks", "Apri Piano d’azione", "Verifica licenze, diritti sui dati di ingresso, condizioni d’uso e possibilità di riutilizzo degli output. Per fornitori di modelli GPAI considera gli obblighi dell’art. 53 relativi al diritto d’autore e alle informazioni sui dati di addestramento. L’AI Act non sostituisce le altre norme sulla proprietà intellettuale.", [law,["GPAI – Commissione europea","https://digital-strategy.ec.europa.eu/en/factpages/general-purpose-ai-obligations-under-ai-act"]], ["Quali sono i modelli GPAI?"]],
    ["openSource", /open.source|modello aperto|software libero/, "risk", "Apri Screening AI Act", "Una licenza open source non comporta automaticamente esenzione dall’AI Act. Occorre distinguere sistemi e modelli GPAI e verificare le condizioni e le eccezioni previste, in particolare per alto rischio, pratiche vietate, trasparenza e rischio sistemico.", [law], ["Quali sono i modelli GPAI?"]],
    ["smallBusiness", /\bpmi\b|piccol.{0,15}impres|microimpres|liber.{0,15}profession|partita iva|startup|start.up/, "systems", "Apri Registro IA", "Anche una piccola impresa può avere obblighi se usa o fornisce IA professionalmente. Parti da inventario, ruolo, rischi e alfabetizzazione. Verifica le misure di supporto e le semplificazioni applicabili alle PMI; la dimensione non determina da sola un’esenzione.", [law], ["Come registro ChatGPT?","Qual è il mio ruolo?"]],
    ["territory", /fuori.{0,15}(ue|europa)|extra.ue|stati uniti|ambito territoriale|art(?:icolo|\.)?\s*2\b/, "risk", "Apri Screening AI Act", "L’ambito di applicazione dell’art. 2 può includere anche operatori stabiliti fuori dall’UE, ad esempio quando immettono sistemi sul mercato dell’Unione o, nei casi previsti, quando gli output vengono utilizzati nell’Unione. Verifica ruolo, mercato e contesto; la sede estera non esclude automaticamente il regolamento.", [law], ["Qual è il mio ruolo?"]],
    ["personal", /uso personale|uso privato|uso domestico|non professionale/, "risk", "Apri Screening AI Act", "L’uso esclusivamente personale e non professionale da parte di una persona fisica è distinto dall’uso professionale. L’AI Act prevede un’esclusione per i relativi obblighi dei deployer; verifica comunque il contesto e le altre norme applicabili.", [law], ["Si applica alla mia azienda?"]],
    ["consultations", /intervist|survey|questionar|censimento.{0,15}personale/, "consultations", "Apri Interviste e survey", "Raccogli quali strumenti usano i reparti, per quali finalità, con quali dati e chi verifica i risultati. Registra le risposte e trasferisci i casi rilevanti nel Registro IA. Evita informazioni personali non necessarie e non confondere la survey con una certificazione.", [], ["Come registro ChatGPT?"]],
    ["accounts", /backup|salvataggio.{0,15}(dati|browser)|account|password|perdo i dati|localstorage|modalita locale/, "settings", "Apri Dati e account", "Nella versione locale i dati sono conservati nel browser e non sincronizzati tra dispositivi. In Dati e account puoi scaricare una copia quando è selezionata un’organizzazione. Evita di cancellare i dati del browser prima del backup. La modalità con account richiede un backend attivo.", [], []],
    ["rights", /diritto.{0,15}spiegaz|decision.{0,20}automatizzat|reclamo|contestare.{0,15}decision|art(?:icolo|\.)?\s*86\b/, "tasks", "Apri Piano d’azione", "Verifica i diritti applicabili alle persone interessate, distinguendo art. 86 AI Act nei casi previsti e art. 22 GDPR per le decisioni esclusivamente automatizzate con effetti rilevanti. Prevedi un canale per richieste, contestazioni e intervento umano secondo il regime applicabile.", [law,["GDPR","https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=it"]], ["Quali sono gli obblighi privacy?"]],
    ["visura", /visur|camerale|allega.{0,15}pdf/, "profile", "Apri Organizzazione", "Nel profilo puoi allegare una visura PDF fino a 2 MB, salvarla e consultarla. La visura identifica l’impresa, ma non dimostra da sola la conformità.", [], []],
    ["privacy", /gdpr|privacy|dati personali|riservatezz|dati sensibil|dpia/, "tasks", "Apri Piano d’azione", "AI Act e GDPR possono applicarsi insieme. Verifica finalità, base giuridica, minimizzazione, fornitori, informative e l’eventuale DPIA. Evita di caricare informazioni riservate in strumenti non autorizzati.", [["GDPR","https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=it"],law], ["Come preparo una policy interna?"]],
    ["prohibited", /social scoring|punteggio sociale|manipol|pratiche.{0,15}vietat|sistem.{0,15}vietat|nudif|emozion.{0,15}lavor|art(?:icolo|\.)?\s*5\b/, "risk", "Apri Screening AI Act", "L’art. 5 vieta specifiche pratiche alle condizioni previste dalla norma: ad esempio alcune manipolazioni dannose, social scoring e riconoscimento delle emozioni sul lavoro o nell’istruzione, con eccezioni specifiche. In presenza di un possibile divieto, sospendi l’uso in attesa della verifica.", [law], ["Quali sono i sistemi ad alto rischio?"]],
    ["hr", /\bcv\b|candidat|recruit|selezion.{0,20}personale|assunzion|curriculum|risorse umane|gestionale hr/, "risk", "Apri Screening AI Act", "Il filtraggio o la valutazione delle candidature è un caso dell'Allegato III, punto 4, da verificare rispetto all'art. 6 e alle eccezioni. Le disposizioni sull'alto rischio si applicano generalmente dal 2 dicembre 2027; GDPR e obblighi già vigenti restano da valutare. Il software valuta o ordina candidati, oppure aiuta soltanto a preparare testi?", [law,["Progetto di orientamenti alto rischio (bozza)","https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-high-risk-systems"],["Commissione – calendario di applicazione","https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"]], ["Filtra candidati e assegna punteggi","Preparo soltanto testi con ChatGPT","Cosa devo fare?"]],
    ["biometric", /biometri|riconoscimento facciale|impront.{0,15}digital/, "risk", "Apri Screening AI Act", "Identificazione biometrica, verifica dell’identità, categorizzazione e riconoscimento delle emozioni hanno regimi diversi. Verifica artt. 5 e 6, Allegato III e GDPR; precisa finalità e contesto.", [law], ["Quali pratiche sono vietate?"]],
    ["transparency", /chatbot|assistente virtuale|deepfake|contenut.{0,15}sintetic|trasparenz|art(?:icolo|\.)?\s*50\b/, "risk", "Apri Screening AI Act", "Art. 50: applicabile dal 2 agosto 2026. Distingui informazione per interazione diretta (fornitore), marcatura tecnica dei contenuti sintetici (fornitore) e divulgazione in casi specifici (deployer). Le eccezioni dipendono dal paragrafo. La proroga al 2 dicembre 2026 riguarda soltanto marcatura/rilevazione per sistemi immessi sul mercato prima del 2 agosto 2026.", [trans,law,["Orientamenti sulla trasparenza","https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems"]], ["Qual è il mio ruolo?"]],
    ["literacy", /formaz|alfabetizz|corso|art(?:icolo|\.)?\s*4\b/, "training", "Apri Formazione", "Art. 4, applicabile dal 2 febbraio 2025 e modificato nel luglio 2026: resta il dovere di sostenere l'alfabetizzazione, tenendo conto di competenze e contesto. Non impone un livello individuale specifico o un attestato unico. Pianifica iniziative adeguate e conserva evidenze.", [literacy,law,["Regolamento UE 2026/1744","https://eur-lex.europa.eu/legal-content/it/TXT/?uri=oj%3AL_202601744"]], ["Come preparo una policy interna?"]],
    ["highrisk", /alto rischio|allegato iii|allegato i\b|art(?:icolo|\.)?\s*(6|26|27)\b|valutazione.{0,15}impatto|fria|supervisione umana|obblighi del deployer/, "risk", "Apri Screening AI Act", "Verifica art. 6 e Allegati I e III, incluse le eccezioni. Gli obblighi per alto rischio dell'Allegato III si applicano generalmente dal 2 dicembre 2027, quelli per i prodotti dell'Allegato I dal 2 agosto 2028. Distingui requisiti dei fornitori e obblighi dei deployer, inclusa la FRIA quando prevista. Gli orientamenti di classificazione consultati sono in bozza.", [law,["Progetto di orientamenti alto rischio (bozza)","https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-high-risk-systems"],["Commissione – calendario di applicazione","https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"]], ["Usiamo IA per selezionare candidati","Qual è il mio ruolo?"]],
    ["roles", /\bprovider\b|\bdeployer\b|fornitor|utilizzator|\bruolo\b/, "risk", "Apri Screening AI Act", "Chi usa un sistema IA sotto la propria autorità per scopi professionali è normalmente deployer. Chi sviluppa o fa sviluppare un sistema e lo immette sul mercato o lo mette in servizio con il proprio nome può essere fornitore. Modifiche sostanziali o cambi di finalità possono cambiare il ruolo (art. 25).", [law], ["Quali sono gli obblighi del deployer?"]],
    ["deadlines", /quando.{0,25}(entra|applica|obblig)|entrata in vigore|date.{0,15}(ai act|normativ)|scadenz.{0,15}(ai act|normativ)|calendario normativ|omnibus/, "risk", "Apri Screening AI Act", "Il calendario generale, aggiornato al 27 novembre 2026, comprende: divieti e alfabetizzazione dal 2 febbraio 2025; disposizioni GPAI dal 2 agosto 2025; trasparenza art. 50 dal 2 agosto 2026; alto rischio Allegato III dal 2 dicembre 2027 e prodotti Allegato I dal 2 agosto 2028. Verifica eccezioni, regimi transitori e testo vigente per il caso concreto.", [["Calendario ufficiale UE",sources.timeline],["Modifica del regolamento",sources.amendment],law], ["Quali obblighi di trasparenza?"]],
    ["sanctions", /sanzion|mult[ae]|penalit/, "risk", "Apri Screening AI Act", "Le sanzioni dipendono da violazione, soggetto e circostanze. Verifica artt. 99–101, disposizioni nazionali, competenza dell'autorità e regole applicabili a PMI e altre imprese. La compilazione del registro non evita automaticamente le sanzioni.", [law,["Commissione – vigilanza","https://digital-strategy.ec.europa.eu/en/policies/enforcement-ai-act"]], ["Quali pratiche sono vietate?"]],
    ["tasks", /scadenz|attivit|piano d.azione|intervent|priorit/, "tasks", "Apri Piano d’azione", "Dai dati registrati risultano "+p.overdue.length+" attività scadute e "+p.upcoming.length+" in scadenza entro 30 giorni. Restano "+p.screenings.length+" sistemi senza screening registrato. Verifica prima eventuali divieti, assegna responsabili e definisci scadenze interne.", [], ["Quali sono le scadenze normative?"]],
    ["policy", /policy|regolamento interno|linee guida interne/, "docs", "Apri Documenti", "La policy dovrebbe definire strumenti autorizzati, usi consentiti e vietati, trattamento dei dati, controllo umano degli output, segnalazioni, formazione, referente e revisione. In Documenti puoi preparare una bozza da adattare e approvare.", [], ["Quali sono gli obblighi privacy?","Come organizzo la formazione?"]],
    ["docs", /document|export|esport|evidenz|report/, "docs", "Apri Documenti", "Esporta i registri dei sistemi, il piano d’azione e la formazione. Conserva le evidenze delle valutazioni e prepara la policy interna. I documenti prodotti non costituiscono certificazione.", [], ["Dove allego la visura?"]],
    ["scope", /cos.e.{0,8}(ai act|regolamento)|cosa prevede.{0,10}ai act|si applica|a chi.{0,15}applica|cosa e l.ai act|iniziare|da dove parto/, "systems", "Apri Registro IA", "L’AI Act disciplina sistemi e modelli IA secondo finalità, rischio e ruolo. Parti dall’inventario degli strumenti, individua il ruolo, verifica divieti, alto rischio, trasparenza e alfabetizzazione IA. Gli obblighi cambiano secondo il caso.", [law,["Commissione europea",sources.guidance]], ["Qual è il mio ruolo?","Come registro ChatGPT?"]],
    ["gpai", /\bgpai\b|modelli.{0,15}(generali|uso generale)|general purpose|modello fondazional/, "risk", "Apri Screening AI Act", "I modelli GPAI sono distinti dai sistemi che li integrano. Gli artt. 53–55 riguardano i fornitori dei modelli; usare ChatGPT non rende automaticamente un'impresa fornitore GPAI. Gli obblighi decorrono generalmente dal 2 agosto 2025, con regime transitorio per modelli precedenti.", [law,["Commissione – FAQ GPAI","https://digital-strategy.ec.europa.eu/it/faqs/general-purpose-ai-models-ai-act-questions-answers"]], ["Qual è il mio ruolo?"]],
    ["register", /chatgpt|copilot|gemini|claude|email|\bmail\b|bozz|registr|sistem|strument|usiamo|utilizziamo/, "systems", "Apri Registro IA", "Nel Registro IA risultano "+items.length+" sistemi. Registra lo strumento e la finalità concreta. Per bozze ed email verifica riservatezza e accuratezza; per decisioni sulle persone serve uno screening specifico. Per quale attività lo utilizzate?", [law], ["Preparo bozze di email","Valutiamo candidature e CV","Usiamo un chatbot clienti"]],
    ["risk", /ris[ck]h|classific|obbligh|conformit|screening/, "risk", "Apri Screening AI Act", "La classificazione dipende da finalità e contesto, non dal nome del prodotto. Verifica divieti (art. 5), alto rischio (art. 6), trasparenza (art. 50) e ruolo. Registra motivazioni ed evidenze nello screening.", [law], ["Usiamo IA per selezionare candidati","Quali pratiche sono vietate?"]]
  ];
  const follow = /^(e |ma |quindi |allora )?(cosa (devo|dobbiamo) fare|come (faccio|procedo)|quali (sono gli )?obblighi|e quindi)[?!. ]*$/.test(input);
  const match = (follow && topics.find(t=>t[0]===previousTopic)) || topics.find(t=>t[1].test(input));
  if (!match) return {topic:"",text:"Non ho una risposta verificata per questa domanda. La guida locale non è un modello generativo. Prova indicando il caso d’uso, la finalità o un articolo dell’AI Act.",action:"Consulta il percorso",page:"dashboard",references:[["Commissione europea",sources.guidance]],suggestions:["Cos’è l’AI Act?","Qual è il mio ruolo?","Quali sono i sistemi ad alto rischio?"]};
  const [topic,,page,action,base,references,suggestions] = match;
  let text = base;
  if (topic==="hr" && (follow || /filtra|punteggi/.test(input))) text="Registra finalità e fornitore del sistema HR; verifica art. 6 e Allegato III, documenta le decisioni influenzate dal sistema, istruzioni e supervisione umana. Valuta inoltre GDPR e gli obblighi del deployer se il sistema è ad alto rischio.";
  else if (topic==="register" && /bozz|email|\bmail\b|soltanto testi/.test(input)) text="Per un uso redazionale, registra lo strumento e la finalità; usa soltanto dati autorizzati, verifica manualmente i risultati prima dell’invio e documenta chi li controlla. Il fatto che sia generativo non determina automaticamente una classificazione ad alto rischio.";
  else if (follow) text += " Passo pratico: apri la sezione indicata e documenta la verifica con una motivazione e, se disponibile, un’evidenza.";
  return {topic,text,action,page,references,reviewed:references.length ? "2026-11-27" : "",suggestions:suggestions.filter(s=>s.toLowerCase()!==String(question).toLowerCase())};
}

export function assessmentChecks(scenario, role, transparency) {
  const checks = [
    { id: "scope", label: "Documentare finalità, contesto e ruolo dell’organizzazione" }
  ];
  if (scenario === "prohibited") return [...checks,
    { id: "prohibition", label: "Verificare le condizioni e le eventuali eccezioni applicabili al divieto (art. 5)" }
  ];
  if (scenario === "annex1" || scenario === "annex3") {
    checks.push({ id: "classification", label: "Motivare la classificazione e le eventuali eccezioni (art. 6)" });
    if (role === "provider") checks.push(
      { id: "technical", label: "Verificare gestione del rischio, documentazione tecnica e registrazione dei log (artt. 9, 11, 12)" },
      { id: "conformity", label: "Verificare procedura di valutazione della conformità e registrazione applicabili (artt. 43 e 49)" }
    );
    if (role === "deployer") checks.push(
      { id: "oversight", label: "Documentare istruzioni d’uso, supervisione umana, monitoraggio e gestione dei log applicabili (art. 26)" },
      { id: "impact", label: "Verificare se è richiesta una valutazione d’impatto sui diritti fondamentali (art. 27)" }
    );
  }
  if (scenario === "transparency" || transparency) {
    if (role !== "deployer") checks.push(
      { id: "interaction", label: "Verificare quando informare chi interagisce direttamente con l’IA (art. 50, par. 1)" },
      { id: "marking", label: "Verificare se è richiesta la marcatura dei contenuti sintetici e quali eccezioni si applicano (art. 50, par. 2)" }
    );
    if (role !== "provider") checks.push(
      { id: "disclosure", label: "Verificare gli obblighi di informazione o divulgazione per deepfake, testi di interesse pubblico e gli altri casi pertinenti (art. 50, parr. 3–4)" }
    );
  }
  checks.push({ id: "literacy", label: "Documentare le misure di alfabetizzazione IA in base a persone e contesto (art. 4)" });
  return checks;
}

/* Operational priorities, not a legal compliance score. */
export function workspacePriorities(workspace, today = new Date()) {
  const localDay = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  const lastDay = [
    horizon.getFullYear(),
    String(horizon.getMonth() + 1).padStart(2, "0"),
    String(horizon.getDate()).padStart(2, "0")
  ].join("-");
  const validDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  };
  const byDate = (a,b) => a.date.localeCompare(b.date);
  const systems = Array.isArray(workspace?.systems) ? workspace.systems : [];
  const tasks = Array.isArray(workspace?.tasks) ? workspace.tasks : [];
  const open = tasks.filter(x => x && x.status !== "Completata");
  const screenings = systems.filter(x => x && !x.assessment?.date);
  const reviews = systems.filter(x => x && validDate(x.assessment?.review))
    .map(x => ({id:x.id,name:x.name,date:x.assessment.review}))
    .filter(x => x.date <= lastDay).sort(byDate);
  return {
    overdue: open.filter(x => validDate(x.date) && x.date < localDay).sort(byDate),
    upcoming: open.filter(x => validDate(x.date) && x.date >= localDay && x.date <= lastDay).sort(byDate),
    screenings,
    reviews,
    prohibited: systems.filter(x => x && x.assessment?.scenario === "prohibited")
  };
}
