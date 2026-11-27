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

export function localCopilot(question, workspace) {
  const input = question.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/social scoring|manipol|vietat|nudif/.test(input)) {
    return { text: "Potrebbe essere una pratica vietata. Verifica prima le condizioni e le eccezioni dell’art. 5 per il tuo caso.", action: "Apri lo screening", page: "risk" };
  }
  if (/\bcv\b|candidat|recruit|selezione del personale/.test(input)) {
    return { text: "Se l’IA filtra o valuta candidati, verifica l’Allegato III e le condizioni dell’art. 6. Indica nello screening se sviluppi il sistema o lo usi nella tua organizzazione.", action: "Apri lo screening", page: "risk" };
  }
  if (/chatbot|assistente virtuale|deepfake|contenut.{0,15}sintetic|trasparenz/.test(input)) {
    return { text: "Se l’IA interagisce con i clienti o genera contenuti sintetici, verifica se si applicano gli obblighi di trasparenza dell’art. 50.", action: "Apri lo screening", page: "risk" };
  }
  if (/scadenz|attivit|piano d.azione|intervent/.test(input)) {
    const count = workspace.tasks.filter(task => task.status !== "Completata").length;
    return { text: "Attività aperte nel tuo piano: " + count + ". Per ogni verifica indica cosa fare e la data entro cui completarla.", action: "Apri il piano d’azione", page: "tasks" };
  }
  if (/formaz|alfabetizz|corso/.test(input)) {
    return { text: "Pianifica la formazione IA tenendo conto dei ruoli, delle competenze e del contesto d’uso. Puoi registrare corso, destinatari e stato.", action: "Apri Formazione", page: "training" };
  }
  if (/ris[ck]h|classific|obbligh|conformit/.test(input)) {
    return { text: "Parti dalla finalità concreta del sistema e dal ruolo dell’organizzazione. Lo screening ti indica quali obblighi verificare.", action: "Apri lo screening", page: "risk" };
  }
  if (/chatgpt|copilot|gemini|claude|email|\bmail\b|bozz|registr|sistem|strument|usiamo|utilizziamo/.test(input)) {
    return { text: "Nel Registro IA hai " + workspace.systems.length + " sistemi. Per aggiungerne uno, indica strumento e finalità concreta. Se lo usi per scrivere email o bozze, annota anche chi rivede il risultato prima dell’invio.", action: "Apri il Registro IA", page: "systems" };
  }
  if (/visur/.test(input)) {
    return { text: "Apri il profilo dell’organizzazione per allegare o consultare la visura PDF.", action: "Apri Organizzazione", page: "profile" };
  }
  if (/document|policy|export|esport/.test(input)) {
    return { text: "In Documenti puoi esportare i registri e preparare una bozza di policy. Per aggiungere la visura PDF, apri il profilo dell’organizzazione.", action: "Apri Documenti", page: "docs" };
  }
  return { text: "Per orientarti, dimmi quale strumento usi e per quale attività. Per esempio «Usiamo ChatGPT per scrivere email» o «Usiamo l’IA per selezionare candidati». Se stai iniziando, segui i passaggi della dashboard.", action: "Apri la dashboard", page: "dashboard" };
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
