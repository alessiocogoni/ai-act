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
  const law = ["Regolamento AI Act", sources.law];
  const literacy = ["FAQ Commissione – alfabetizzazione IA", "https://digital-strategy.ec.europa.eu/it/faqs/ai-literacy-questions-answers"];
  const trans = ["FAQ Commissione – art. 50", sources.transparency];
  const items = Array.isArray(workspace.systems) ? workspace.systems : [];
  const p = workspacePriorities(workspace);
  const topics = [
    ["visura", /visur|camerale|allega.{0,15}pdf/, "profile", "Apri Organizzazione", "Nel profilo puoi allegare una visura PDF fino a 2 MB, salvarla e consultarla. La visura identifica l’impresa, ma non dimostra da sola la conformità.", [], []],
    ["privacy", /gdpr|privacy|dati personali|riservatezz|dati sensibil|dpia/, "tasks", "Apri Piano d’azione", "AI Act e GDPR possono applicarsi insieme. Verifica finalità, base giuridica, minimizzazione, fornitori, informative e l’eventuale DPIA. Evita di caricare informazioni riservate in strumenti non autorizzati.", [["GDPR","https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=it"],law], ["Come preparo una policy interna?"]],
    ["prohibited", /social scoring|punteggio sociale|manipol|pratiche.{0,15}vietat|sistem.{0,15}vietat|nudif|emozion.{0,15}lavor|art(?:icolo|\.)?\s*5\b/, "risk", "Apri Screening AI Act", "L’art. 5 vieta specifiche pratiche alle condizioni previste dalla norma: ad esempio alcune manipolazioni dannose, social scoring e riconoscimento delle emozioni sul lavoro o nell’istruzione, con eccezioni specifiche. In presenza di un possibile divieto, sospendi l’uso in attesa della verifica.", [law], ["Quali sono i sistemi ad alto rischio?"]],
    ["hr", /\bcv\b|candidat|recruit|selezion.{0,20}personale|assunzion|curriculum|risorse umane|gestionale hr/, "risk", "Apri Screening AI Act", "Un sistema che filtra o valuta candidati può rientrare nell’Allegato III. Occorre verificare finalità, art. 6, eccezioni e profilazione. Il software ordina o valuta le persone, oppure aiuta soltanto a preparare testi?", [law], ["Filtra candidati e assegna punteggi","Preparo soltanto testi con ChatGPT","Cosa devo fare?"]],
    ["biometric", /biometri|riconoscimento facciale|impront.{0,15}digital/, "risk", "Apri Screening AI Act", "Identificazione biometrica, verifica dell’identità, categorizzazione e riconoscimento delle emozioni hanno regimi diversi. Verifica artt. 5 e 6, Allegato III e GDPR; precisa finalità e contesto.", [law], ["Quali pratiche sono vietate?"]],
    ["transparency", /chatbot|assistente virtuale|deepfake|contenut.{0,15}sintetic|trasparenz|art(?:icolo|\.)?\s*50\b/, "risk", "Apri Screening AI Act", "L’art. 50 distingue gli obblighi di fornitori e deployer. Per chatbot verifica l’informazione agli utenti, salvo eccezioni; per contenuti sintetici verifica marcatura e divulgazione nei casi previsti. Identifica chi fornisce il sistema e chi pubblica i contenuti.", [trans,law], ["Qual è il mio ruolo?"]],
    ["literacy", /formaz|alfabetizz|corso|art(?:icolo|\.)?\s*4\b/, "training", "Apri Formazione", "L’art. 4 riguarda l’alfabetizzazione IA. Pianifica misure adeguate a ruoli, competenze, contesto e rischi: uso sicuro, limiti degli output, verifica umana e segnalazione. Registra destinatari, corso e stato; non esiste un unico attestato obbligatorio che certifichi da solo l’adempimento.", [literacy,law], ["Come preparo una policy interna?"]],
    ["highrisk", /alto rischio|allegato iii|allegato i\b|art(?:icolo|\.)?\s*(6|26|27)\b|valutazione.{0,15}impatto|fria|supervisione umana|obblighi del deployer/, "risk", "Apri Screening AI Act", "Verifica art. 6 e Allegati I e III, incluse le eccezioni. Per alto rischio il fornitore verifica requisiti, documentazione e conformità; il deployer verifica istruzioni, supervisione, monitoraggio e log applicabili. In alcuni casi serve una valutazione d’impatto sui diritti fondamentali (art. 27).", [law], ["Usiamo IA per selezionare candidati","Qual è il mio ruolo?"]],
    ["roles", /\bprovider\b|\bdeployer\b|fornitor|utilizzator|\bruolo\b/, "risk", "Apri Screening AI Act", "Chi usa un sistema IA sotto la propria autorità per scopi professionali è normalmente deployer. Chi sviluppa o fa sviluppare un sistema e lo immette sul mercato o lo mette in servizio con il proprio nome può essere fornitore. Modifiche sostanziali o cambi di finalità possono cambiare il ruolo (art. 25).", [law], ["Quali sono gli obblighi del deployer?"]],
    ["deadlines", /quando.{0,25}(entra|applica|obblig)|entrata in vigore|date.{0,15}(ai act|normativ)|scadenz.{0,15}(ai act|normativ)|calendario normativ|omnibus/, "risk", "Apri Screening AI Act", "Le date dipendono dalla disposizione e dal tipo di sistema. Il regolamento è stato modificato: consulta il testo aggiornato e il calendario ufficiale prima di determinare la scadenza applicabile. Le scadenze interne non coincidono necessariamente con quelle normative.", [["Calendario ufficiale UE",sources.timeline],["Modifica del regolamento",sources.amendment],law], ["Quali obblighi di trasparenza?"]],
    ["sanctions", /sanzion|mult[ae]|penalit/, "risk", "Apri Screening AI Act", "Le sanzioni dipendono da violazione, soggetto e circostanze. Consulta artt. 99–101 e le disposizioni applicabili alle PMI. Non si può stimare una multa senza esaminare il caso; la compilazione del registro non evita automaticamente sanzioni.", [law], ["Quali pratiche sono vietate?"]],
    ["tasks", /scadenz|attivit|piano d.azione|intervent|priorit/, "tasks", "Apri Piano d’azione", "Dai dati registrati risultano "+p.overdue.length+" attività scadute e "+p.upcoming.length+" in scadenza entro 30 giorni. Restano "+p.screenings.length+" sistemi senza screening registrato. Verifica prima eventuali divieti, assegna responsabili e definisci scadenze interne.", [], ["Quali sono le scadenze normative?"]],
    ["policy", /policy|regolamento interno|linee guida interne/, "docs", "Apri Documenti", "La policy dovrebbe definire strumenti autorizzati, usi consentiti e vietati, trattamento dei dati, controllo umano degli output, segnalazioni, formazione, referente e revisione. In Documenti puoi preparare una bozza da adattare e approvare.", [], ["Quali sono gli obblighi privacy?","Come organizzo la formazione?"]],
    ["docs", /document|export|esport|evidenz|report/, "docs", "Apri Documenti", "Esporta i registri dei sistemi, il piano d’azione e la formazione. Conserva le evidenze delle valutazioni e prepara la policy interna. I documenti prodotti non costituiscono certificazione.", [], ["Dove allego la visura?"]],
    ["scope", /cos.e.{0,8}(ai act|regolamento)|cosa prevede.{0,10}ai act|si applica|a chi.{0,15}applica|cosa e l.ai act|iniziare|da dove parto/, "systems", "Apri Registro IA", "L’AI Act disciplina sistemi e modelli IA secondo finalità, rischio e ruolo. Parti dall’inventario degli strumenti, individua il ruolo, verifica divieti, alto rischio, trasparenza e alfabetizzazione IA. Gli obblighi cambiano secondo il caso.", [law,["Commissione europea",sources.guidance]], ["Qual è il mio ruolo?","Come registro ChatGPT?"]],
    ["gpai", /\bgpai\b|modelli.{0,15}(generali|uso generale)|general purpose|modello fondazional/, "risk", "Apri Screening AI Act", "Un modello IA per finalità generali è distinto dal sistema che lo integra. Gli obblighi del fornitore del modello sono disciplinati dagli artt. 53–55. Usare ChatGPT non rende automaticamente l’impresa fornitore di un modello GPAI.", [law], ["Qual è il mio ruolo?"]],
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
  return {topic,text,action,page,references,suggestions:suggestions.filter(s=>s.toLowerCase()!==String(question).toLowerCase())};
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
