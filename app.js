import { assess, assessmentChecks, localCopilot, sources, workspacePriorities } from "./risk.js?v=operational-priorities";

const $ = (id) => document.getElementById(id),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state;
let managed = false;
let dirty = false;
let page = "dashboard",
  filter = "",
  editing = null;
const save = () => {
  try {
    persist();
    return true;
  } catch {
    alert(
      "Salvataggio non riuscito: verifica lo spazio disponibile nel browser.",
    );
    return false;
  }
};
const titles = {
  dashboard: "Dashboard",
  systems: "Registro sistemi AI",
  risk: "Screening AI Act",
  tasks: "Attività e scadenze",
  settings: "Impostazioni",
};
function go(p, system = "") {
  if (!Object.prototype.hasOwnProperty.call(titles, p)) return;
  assessmentSystem = system;
  page = p;
  filter = "";
  document.body.classList.remove("mobileopen");
  render();
  window.scrollTo(0, 0);
}
document
  .querySelectorAll("[data-page]")
  .forEach((b) => (b.onclick = () => go(b.dataset.page)));
let assessmentSystem = "";
function table(type) {
  const rows = state[type].filter((x) =>
    JSON.stringify(x).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    '<div class="scroll"><table><thead><tr>' +
    (type === "systems"
      ? "<th>Sistema</th><th>Finalità</th><th>Rischio preliminare</th>"
      : "<th>Attività</th><th>Scadenza</th><th>Stato</th>") +
    "<th>Azioni</th></tr></thead><tbody>" +
    rows
      .map(
        (x) =>
          "<tr><td>" +
          esc(x.name) +
          "</td><td>" +
          esc(type === "systems" ? x.purpose : x.date) +
          '</td><td><span class="pill">' +
          esc(type === "systems" ? x.risk : x.status) +
          '</span></td><td>' + (type === 'systems' ? '<button class="secondary" data-assess="' + esc(x.id) + '">' + (x.assessment ? 'Valutazione salvata' : 'Valuta') + '</button> ' : '') + '<button class="secondary" data-edit="' +
          esc(x.id) +
          '">Modifica</button> <button class="secondary" data-delete="' +
          esc(x.id) +
          '">Elimina</button></td></tr>',
      )
      .join("") +
    "</tbody></table></div>" +
    (!rows.length ? '<p class="muted">Nessun elemento presente.</p>' : "")
  );
}

function dashboardPriorities() {
  const p = workspacePriorities(state);
  const format = value => value.split("-").reverse().join("/");
  const list = (items, renderItem) => items.length
    ? '<ul>'+items.slice(0,5).map(renderItem).join("")+'</ul>'
    : "";
  const taskItem = item => '<li>'+esc(item.name)+' · '+esc(format(item.date))+'</li>';
  const systemItem = item => '<li>'+esc(item.name)+' <button type="button" class="secondary" data-assess="'+esc(item.id)+'">Apri screening</button></li>';
  const reviewItem = item => '<li>'+esc(item.name)+' · '+esc(format(item.date))+' <button type="button" class="secondary" data-assess="'+esc(item.id)+'">Apri riesame</button></li>';
  return '<div class="card"><h2>Priorità operative</h2><p class="muted">Promemoria basati sui dati registrati e sulle scadenze interne, non un attestato di conformità.</p>'+
    (p.prohibited.length ? '<h3>Possibili pratiche vietate: '+p.prohibited.length+'</h3><p>Verifica subito le condizioni del divieto e le eventuali eccezioni.</p>'+list(p.prohibited,systemItem) : "")+
    '<h3>Screening da effettuare: '+p.screenings.length+'</h3>'+list(p.screenings,systemItem)+
    '<h3>Attività scadute: '+p.overdue.length+'</h3>'+list(p.overdue,taskItem)+
    '<h3>Attività in scadenza nei prossimi 30 giorni: '+p.upcoming.length+'</h3>'+list(p.upcoming,taskItem)+
    '<h3>Riesami scaduti o entro 30 giorni: '+p.reviews.length+'</h3>'+list(p.reviews,reviewItem)+
    (p.prohibited.length+p.screenings.length+p.overdue.length+p.upcoming.length+p.reviews.length===0 ? '<p class="muted">Nessuna priorità rilevata nei dati disponibili. Continua a verificare il registro e gli obblighi applicabili.</p>' : "")+
    '<div class="toolbar"><button data-go="systems">Apri registro</button> <button class="secondary" data-go="tasks">Gestisci attività</button></div></div>';
}

function renderCore() {
  $("crumb").textContent = titles[page];
  document
    .querySelectorAll("[data-page]")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  let h = "<h1>" + titles[page] + "</h1>";
  if (page === "dashboard") {
    let done = state.tasks.filter((x) => x.status === "Completata").length;
    h +=
      '<p class="muted">Monitora il tuo percorso di conformità.</p><div class="cards"><div class="card">Sistemi registrati<div class="metric">' +
      state.systems.length +
      '</div></div><div class="card">Attività aperte<div class="metric">' +
      (state.tasks.length - done) +
      '</div></div><div class="card">Attività completate<div class="metric">' +
      done +
      '</div></div></div>' + dashboardPriorities() + '';
  } else if (page === "systems" || page === "tasks") {
    h +=
      '<p class="muted">' +
      (page === "systems"
        ? "Elenca gli strumenti IA utilizzati, ad esempio ChatGPT per scrivere email o un software HR per analizzare CV."
        : "Pianifica le verifiche da svolgere, ad esempio controllare i dati inviati a ChatGPT o formare il personale.") +
      '</p><div class="card"><div class="toolbar"><input id="filter" placeholder="' +
      (page === "systems" ? "Es. ChatGPT" : "Es. Verifica privacy") +
      '" value="' +
      esc(filter) +
      '"><button id="add">+ Nuovo elemento</button></div><div id="table">' +
      table(page) +
      "</div></div>";
  } else if (page === "risk") {
    h += renderAssessment();
  } else {
    h +=
      '<div class="card"><h2>Dati del workspace</h2><p>I dati sono salvati esclusivamente in questo browser. Ad esempio, un registro creato su questo PC non compare automaticamente su un altro dispositivo. La cancellazione dei dati del browser può eliminare il lavoro. Non inserire dati sensibili.</p></div>';
  }
  $("content").innerHTML = h;
  document
    .querySelectorAll("[data-go]")
    .forEach((b) => (b.onclick = () => go(b.dataset.go)));
  if ($("add")) {
    $("add").onclick = () => edit();
    $("filter").oninput = (e) => {
      filter = e.target.value;
      $("table").innerHTML = table(page);
      bindRows();
    };
    bindRows();
  }
  if (page === "dashboard") document.querySelectorAll("[data-assess]").forEach(button => { button.onclick = () => go("risk", button.dataset.assess); });
  if (page === "risk") bindAssessment();
}
function bindRows() {
  document.querySelectorAll("[data-assess]").forEach(button => {
    button.onclick = () => go("risk", button.dataset.assess);
  });
  if (managed && current.role === "viewer") {
    document.querySelectorAll("[data-edit], [data-delete]").forEach(button => { button.hidden = true; });
    return;
  }
  document
    .querySelectorAll("[data-edit]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          edit(state[page].find((x) => x.id === b.dataset.edit))),
    );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (confirm("Eliminare questo elemento?")) {
          const previous = state[page];
          state[page] = previous.filter((x) => x.id !== b.dataset.delete);
          if (!save()) {
            state[page] = previous;
            return;
          }
          render();
        }
      }),
  );
}
function edit(x) {
  const form = $("editForm");
  if (form._statusGuard) {
    form.removeEventListener("submit", form._statusGuard, true);
    delete form._statusGuard;
  }
  form.querySelector(".example-picker")?.remove();
  editing = x || null;
  $("formTitle").textContent = x ? "Modifica elemento" : "Nuovo elemento";
  const opts = (arr, val) =>
    arr
      .map(
        (a) =>
          "<option " +
          (a === val ? "selected" : "") +
          ' value="' +
          esc(a) +
          '">' +
          esc(a || "Seleziona stato") +
          "</option>",
      )
      .join("");
  $("fields").innerHTML =
    '<label>Nome<small class="field-help">' +
    (page === "systems"
      ? "Indica il nome dello strumento utilizzato."
      : "Descrivi una verifica concreta da completare.") +
    '</small><input name="name" placeholder="' +
    (page === "systems"
      ? "Es. ChatGPT"
      : "Es. Verificare informativa privacy") +
    '" required maxlength="150" value="' +
    esc(x?.name) +
    '"></label>' +
    (page === "systems"
      ? '<label>Finalità<small class="field-help">Spiega per quale attività viene utilizzata l’IA.</small><input name="purpose" placeholder="Es. Preparare bozze di email ai clienti" required value="' +
        esc(x?.purpose) +
        '"></label><label>Rischio preliminare<small class="field-help">Se non conosci il rischio, lascia Da valutare. Non è una classificazione legale.</small><select name="risk">' +
        opts(
          [
            "Da valutare",
            "Inaccettabile",
            "Alto",
            "Limitato",
            "Minimo o nullo",
          ],
          {
            "Potenzialmente alto": "Alto",
            "Trasparenza da verificare": "Limitato",
            Medio: "Limitato",
            Basso: "Minimo o nullo",
          }[x?.risk] || x?.risk,
        ) +
        "</select></label>"
      : '<label>Scadenza<small class="field-help">Scegli entro quando completare la verifica.</small><input type="date" name="date" required value="' +
        esc(x?.date) +
        '"></label><label>Stato<select name="status" required>' +
        opts(["", "Da fare", "In corso", "Completata"], x?.status || "") +
        "</select></label>");
  $("editor").showModal();
}
$("cancel").onclick = () => $("editor").close();
$("editForm").onsubmit = (e) => {
  e.preventDefault();
  const x = Object.fromEntries(new FormData(e.target));
  x.id = editing?.id || crypto.randomUUID();
  const previous = state[page];
  state[page] = editing
    ? previous.map((y) => (y.id === x.id ? { ...y, ...x } : y))
    : [...previous, x];
  if (!save()) {
    state[page] = previous;
    return;
  }
  $("editor").close();
  render();
};
$("copilot").onclick = () => {
  go("home");
  $("chat").hidden = true;
};
$("closechat").onclick = () => ($("chat").hidden = true);
const extraTitles = {
  home: "Guida AI Act",
  training: "Formazione",
  docs: "Documenti",
  profile: "Organizzazione",
  consultations: "Interviste e survey",
};
Object.assign(titles, extraTitles, {
  systems: "Registro IA",
  tasks: "Piano d’azione",
  dashboard: "Dashboard",
  settings: "Dati e account",
});
let orgs;
try {
  orgs = JSON.parse(localStorage.getItem("aio-orgs-v2"));
} catch {}
const legacy = readLegacy();
if (!Array.isArray(orgs) || !orgs.length)
  orgs = legacy
    ? [{ id: "legacy", name: "Organizzazione importata", data: legacy }]
    : [
        {
          id: "or",
          name: "Orienta Srl · Demo",
          data: {
            systems: [
              {
                id: "demo1",
                name: "Gestionale HR",
                purpose: "Supporto alla gestione dei CV",
                risk: "Da valutare",
              },
            ],
            tasks: [
              {
                id: "demo2",
                name: "Verificare il trattamento dei CV",
                date: "2026-12-15",
                status: "Da fare",
              },
            ],
          },
        },
        {
          id: "co",
          name: "Comune di Valleverde · Demo",
          data: { systems: [], tasks: [] },
        },
      ];
let current = { id: "", name: "", data: { systems: [], tasks: [], consultations: [] } };
for (const org of orgs) prepareWorkspace(org);
state = current.data;
for (const org of orgs) {
  for (const item of org.data.systems || []) {
    item.risk =
      {
        Medio: "Limitato",
        Basso: "Minimo o nullo",
        "Potenzialmente alto": "Alto",
        "Trasparenza da verificare": "Limitato",
      }[item.risk] || item.risk;
  }
}
const persist = () => {
  if (managed) {
    dirty = true;
    updateAccountStatus();
    return;
  }
  localStorage.setItem("aio-orgs-v2", JSON.stringify(orgs));
  localStorage.setItem("aio-current", current.id);
};
function syncOrg() {
  $("orgSelect").innerHTML =
    '<option value="">Seleziona organizzazione</option>' + orgs
      .map(
        (o) => '<option value="' + esc(o.id) + '">' + esc(o.name) + "</option>",
      )
      .join("") +
    (managed ? "" : '<option value="new">Nuova organizzazione</option>');
  $("orgSelect").value = current.id;
  $("orgHeader").textContent = current.name || "Nessuna organizzazione selezionata";
  $("orgHeader").closest(".header-workspace")?.classList.toggle("is-empty", !current.id);
  if ($("orgHeaderLabel")) $("orgHeaderLabel").textContent = current.id ? "ORGANIZZAZIONE ATTIVA" : "SPAZIO DI LAVORO";
  renderOrgPicker();
}
function renderOrgPicker() {
  const select = $("orgSelect");
  let picker = $("orgPicker");
  if (!picker) {
    picker = document.createElement("div");
    picker.id = "orgPicker";
    picker.className = "org-picker";
    select.after(picker);
    select.hidden = true;
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target) && !event.target.closest?.("#chooseWorkspace")) closePicker();
    });
    picker.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closePicker(); picker.querySelector(".org-picker-trigger")?.focus(); }
    });
  }
  function closePicker() {
    const menu = picker.querySelector(".org-picker-menu");
    if (menu) menu.hidden = true;
    picker.querySelector(".org-picker-trigger")?.setAttribute("aria-expanded", "false");
  }
  const initials = name => String(name || "Organizzazione").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  picker.innerHTML = '<button type="button" class="org-picker-trigger" aria-expanded="false" aria-controls="orgPickerMenu"><span class="org-avatar">'+esc(current.id ? initials(current.name) : "＋")+'</span><span class="org-picker-copy"><small>'+(current.id ? 'ATTIVA' : 'SCEGLI PER INIZIARE')+'</small><strong>'+esc(current.name || "Seleziona organizzazione")+'</strong></span></button><div class="org-picker-menu" id="orgPickerMenu" hidden><div class="org-menu-title">Le tue organizzazioni</div><div class="org-menu-items">'+orgs.map(o=>'<button type="button" class="org-option'+(o.id===current.id?' selected':'')+'" data-org="'+esc(o.id)+'" '+(o.id===current.id?'aria-current="true"':'')+'><span class="org-avatar">'+esc(initials(o.name))+'</span><span class="org-option-name">'+esc(o.name)+'</span>'+(o.id===current.id?'<span class="org-check" aria-hidden="true">✓</span>':'')+'</button>').join("")+'</div>'+(!managed?'<button type="button" class="org-add" data-org="new"><span aria-hidden="true">＋</span> Nuova organizzazione</button>':'')+'</div>';
  const trigger = picker.querySelector(".org-picker-trigger");
  const menu = picker.querySelector(".org-picker-menu");
  trigger.onclick = () => { menu.hidden = !menu.hidden; trigger.setAttribute("aria-expanded", String(!menu.hidden)); };
  picker.querySelectorAll("[data-org]").forEach(button => button.onclick = () => {
    closePicker();
    select.value = button.dataset.org;
    select.dispatchEvent(new Event("change", {bubbles:true}));
  });
}
$("orgSelect").onchange = () => {
  if (!$("orgSelect").value) return;
  if (managed) {
    switchManaged($("orgSelect").value, page === "settings" ? "dashboard" : page);
    return;
  }
  if ($("orgSelect").value === "new") {
    syncOrg();
    $("orgForm").reset();
    $("orgDialog").showModal();
    return;
  } else {
    const next = orgs.find((o) => o.id === $("orgSelect").value);
    if (!next) { syncOrg(); return; }
    current = next;
    prepareWorkspace(current);
  }
  state = current.data;
  $("messages").innerHTML =
    '<div class="bubble">Workspace cambiato. Come posso aiutarti?</div>';
  syncOrg();
  go(page === "settings" ? "dashboard" : page);
};
$("orgClose").onclick = $("orgCancel").onclick = () => $("orgDialog").close();
$("orgForm").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.name = f.name.trim();
  if (!f.name) {
    e.target.elements.name.setCustomValidity(
      "Inserisci una denominazione valida",
    );
    e.target.elements.name.reportValidity();
    return;
  }
  current = { ...f, id: crypto.randomUUID(), data: { systems: [], tasks: [] } };
  prepareWorkspace(current);
  orgs.push(current);
  state = current.data;
  persist();
  syncOrg();
  $("messages").innerHTML =
    '<div class="bubble">Organizzazione creata. Come posso aiutarti?</div>';
  $("orgDialog").close();
  go("profile");
};
$("orgForm").elements.name.oninput = (e) => e.target.setCustomValidity("");
function renderExtra() {
  let h = "<h1>" + titles[page] + "</h1>";
  if (page === "home") {
    h +=
      '<p class="muted">' +
      esc(current.name) +
      '</p><div class="card"><h2>Da quale uso dell’IA vuoi partire?</h2><p>Descrivimi un’attività in cui usate l’intelligenza artificiale. Usa il registro per creare una scheda e il piano per annotare le verifiche necessarie.</p><div class="cards"><button data-start="census">Censisci un uso dell’IA<br>Parti da uno strumento e da un’attività.</button><button data-start="hr">Gestionale HR<br>Valuta l’uso dell’IA sui CV.</button><button data-start="plan">Rivedi il piano<br>Controlla le azioni aperte.</button></div><form id="homechat"><input name="message" maxlength="1500" aria-label="Domanda per il Copilota" placeholder="Es. Usiamo IA per rispondere ai clienti" required style="width:75%"><button>Invia</button></form></div>';
  } else if (page === "profile") {
    h +=
      '<div class="card"><h2>Profilo e visura</h2><p class="muted">Identifica l’organizzazione e il referente per la gestione della compliance IA.</p><form id="profileform"><label>Ragione sociale<input name="name" placeholder="Es. Rossi Srl" required value="' +
      esc(current.name) +
      '"></label><label>Partita IVA / codice fiscale<input name="tax" placeholder="Es. 12345678901" value="' +
      esc(current.tax) +
      '"></label><label>Settore<input name="sector" placeholder="Es. Commercio al dettaglio" value="' +
      esc(current.sector) +
      '"></label><label>Referente<input name="contact" placeholder="Es. Mario Rossi, responsabile IT" value="' +
      esc(current.contact) +
      '"></label><div class="visura-panel"><h3>Visura camerale</h3><p class="muted">Allega una visura camerale, ad esempio visura_azienda.pdf, per conservare il documento identificativo dell’impresa. Non viene analizzato automaticamente.</p><label class="dropzone" id="visuraDrop"><span class="upload-symbol">↑</span><strong>Seleziona o trascina il PDF</strong><span>PDF · massimo 2 MB</span><input type="file" name="visura" accept="application/pdf,.pdf"></label><p id="visuraStatus" role="status">' +
      esc(current.visura || "Nessun documento allegato") +
      '</p><div class="visura-actions"><button type="button" class="secondary" id="visuraOpen" ' +
      (current.visuraData || (managed && current.visura) ? "" : "hidden") +
      '>Apri PDF</button><button type="button" class="secondary" id="visuraRemove" ' +
      (current.visura ? "" : "hidden") +
      ">Rimuovi</button></div></div><button>Salva profilo</button></form></div>";
  } else if (page === "consultations") {
    h += consultationsHTML();
  } else {
    const labels = ["Corso", "Destinatari", "Stato"];
    const examples = ["Es. Corso uso responsabile IA", "Es. Team commerciale"];
    const descriptions = "Pianifica e registra la formazione del personale sull’uso consapevole dell’IA.";
    let items = state[page] || [];
    h +=
      '<div class="card"><p class="muted">' +
      descriptions +
      '</p><form id="extraform"><div class="toolbar"><label>' +
      labels[0] +
      '<input name="name" placeholder="' +
      examples[0] +
      '" required></label><label>' +
      labels[1] +
      '<input name="note" placeholder="' +
      examples[1] +
      '" required></label><label>Stato<select name="status" required><option value="">Seleziona stato</option><option>Da fare</option><option>In corso</option><option>Completato</option></select></label><button>+ Aggiungi</button></div></form><div class="scroll"><table><thead><tr>' +
      labels.map((l) => "<th>" + l + "</th>").join("") +
      "<th>Azioni</th></tr></thead><tbody>" +
      items
        .map(
          (x, i) =>
            "<tr><td>" +
            esc(x.name) +
            "</td><td>" +
            esc(x.note) +
            "</td><td>" +
            esc(x.status) +
            '</td><td><button class="secondary" data-remove="' +
            i +
            '">Elimina</button></td></tr>',
        )
        .join("") +
      "</tbody></table></div></div>";
  }
  $("content").innerHTML = h;
  if (page === "consultations") bindConsultations();
  if ($("extraform")) {
    $("extraform").onsubmit = (e) => {
      e.preventDefault();
      if (managed && current.role === "viewer") return;
      const previous = state[page] || [];
      state[page] = [...previous, Object.fromEntries(new FormData(e.target))];
      if (!save()) {
        state[page] = previous;
        return;
      }
      render();
    };
    document.querySelectorAll("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          if (managed && current.role === "viewer") return;
          if (!confirm("Eliminare questo elemento?")) return;
          const previous = state[page];
          state[page] = previous.filter(
            (_, i) => i !== Number(b.dataset.remove),
          );
          if (!save()) {
            state[page] = previous;
            return;
          }
          render();
        }),
    );
  }
  if ($("profileform")) {
    const form = $("profileform"),
      target = current,
      drop = $("visuraDrop"),
      status = $("visuraStatus");
    let pending = null,
      removed = false;
    async function choose(file) {
      if (!file) return;
      const header = await file.slice(0, 5).text();
      if (
        !/\.pdf$/i.test(file.name) ||
        header !== "%PDF-" ||
        file.size > 2 * 1024 * 1024
      ) {
        status.textContent = "Seleziona un PDF non superiore a 2 MB.";
        return;
      }
      pending = file;
      removed = false;
      status.textContent =
        file.name + " · " + Math.ceil(file.size / 1024) + " KB · da salvare";
      $("visuraRemove").hidden = false;
    }
    form.elements.visura.onchange = (e) => choose(e.target.files[0]);
    drop.ondragover = (e) => {
      e.preventDefault();
      drop.classList.add("dragging");
    };
    drop.ondragleave = () => drop.classList.remove("dragging");
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.classList.remove("dragging");
      choose(e.dataTransfer.files[0]);
    };
    $("visuraRemove").onclick = () => {
      pending = null;
      removed = true;
      form.elements.visura.value = "";
      status.textContent = "Documento da rimuovere al salvataggio";
      $("visuraOpen").hidden = true;
      $("visuraRemove").hidden = true;
    };
    $("visuraOpen").onclick = () => {
      const a = document.createElement("a");
      a.href =
        target.visuraData ||
        (managed ? "api/orgs/" + target.id + "/document" : "");
      a.download = target.visura;
      a.click();
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      let f = new FormData(form),
        backup = { ...target };
      try {
        if (pending) {
          const file = pending;
          target.visuraData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          target.visura = file.name;
        } else if (removed) {
          delete target.visura;
          delete target.visuraData;
        }
        for (let k of ["name", "tax", "sector", "contact"])
          target[k] = f.get(k);
        persist();
        syncOrg();
        render();
      } catch (err) {
        for (const k of Object.keys(target)) delete target[k];
        Object.assign(target, backup);
        status.textContent =
          "Salvataggio non riuscito. Verifica il documento e riprova.";
      }
    };
  }
  document.querySelectorAll("[data-start]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.start === "plan") {
          go("tasks");
          return;
        }
        go("systems");
        edit();
        if (b.dataset.start === "hr")
          $("editForm").elements.name.value = "Gestionale HR";
        $("chat").hidden = false;
      }),
  );
  if ($("homechat"))
    $("homechat").onsubmit = (e) => {
      e.preventDefault();
      $("question").value = new FormData(e.target).get("message");
      $("chat").hidden = false;
      $("chatForm").requestSubmit();
    };
}
syncOrg();

const exampleSets = {
  systems: [
    ["ChatGPT", "Preparare bozze di email ai clienti", "Da valutare"],
    ["Microsoft Copilot", "Riassumere documenti e riunioni", "Da valutare"],
    ["Gestionale HR", "Supportare la selezione dei CV", "Alto"],
    ["Chatbot clienti", "Rispondere alle richieste dei clienti", "Limitato"],
  ],
  tasks: [
    ["Verificare informativa privacy", "Da fare"],
    ["Formare il personale sull’IA", "Da fare"],
    ["Verificare supervisione umana", "Da fare"],
  ],
  training: [
    ["Corso uso responsabile IA", "Tutto il personale"],
    ["Formazione privacy e IA", "Team HR"],
  ],
  docs: [
    ["Policy aziendale IA", "Bozza da approvare"],
    ["Registro dei sistemi IA", "Revisione periodica"],
  ],
  interviews: [
    ["Intervista responsabile HR", "Verificare uso IA nei CV"],
    ["Intervista responsabile IT", "Identificare strumenti IA in uso"],
  ],
  survey: [
    ["Questionario uso IA", "Tutto il personale"],
    ["Indagine competenze IA", "Team amministrativo"],
  ],
  profile: [
    ["Rossi Srl", "Commercio al dettaglio", "Mario Rossi"],
    ["Studio Demo", "Servizi professionali", "Referente IT"],
  ],
  neworg: [
    ["Rossi Srl", "Azienda privata", "Commercio al dettaglio"],
    ["Comune Demo", "Pubblica amministrazione", "Servizi pubblici"],
  ],
};
function attachExamples(form, key) {
  if (!form || form.querySelector(".example-picker") || !exampleSets[key])
    return;
  const box = document.createElement("div");
  box.className = "example-picker";
  const label = document.createElement("label");
  label.textContent = "Parti da un esempio";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Seleziona un esempio");
  select.add(new Option("Scegli un esempio (facoltativo)", ""));
  exampleSets[key].forEach((row, i) =>
    select.add(new Option(row[0], String(i))),
  );
  const note = document.createElement("small");
  note.textContent =
    "Seleziona un esempio per compilare i campi. Puoi modificarli prima di salvare.";
  label.append(select);
  box.append(label, note);
  form.prepend(box);
  select.onchange = () => {
    if (select.value === "") return;
    const row = exampleSets[key][Number(select.value)];
    const keys = {
      systems: ["name", "purpose", "risk"],
      tasks: ["name"],
      profile: ["name", "sector", "contact"],
      neworg: ["name", "kind", "sector"],
    }[key] || ["name", "note"];
    keys.forEach((k, i) => {
      if (form.elements[k]) {
        form.elements[k].value = row[i];
        form.elements[k].dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    select.value = "";
  };
}
const riskGuide =
  '<div class="risk-guide"><h3>Guida ai livelli di rischio</h3><p class="muted">Scala divulgativa dei rischi dell’AI Act. Gli obblighi di trasparenza possono applicarsi indipendentemente dal livello.</p><div class="scroll"><table><thead><tr><th>Livello</th><th>Significato ed esempio</th><th>Prossimo passo</th></tr></thead><tbody><tr><td><span class="risk-tag unacceptable">Inaccettabile</span></td><td>Possibile pratica vietata, es. social scoring nelle condizioni previste dalla legge.</td><td>Sospendere l’uso e verificare divieti ed eccezioni.</td></tr><tr><td><span class="risk-tag high">Alto</span></td><td>Possibile impatto rilevante sui diritti, es. valutazione dei candidati tramite IA.</td><td>Verificare classificazione, requisiti e supervisione umana.</td></tr><tr><td><span class="risk-tag medium">Limitato</span></td><td>Rischio operativo o di trasparenza, es. chatbot per clienti.</td><td>Verificare informativa, privacy e controlli.</td></tr><tr><td><span class="risk-tag low">Minimo o nullo</span></td><td>Impatto contenuto, es. bozze di testi non sensibili con revisione umana.</td><td>Applicare buone pratiche e monitorare.</td></tr></tbody></table></div><small class="field-help">La classificazione dipende dalla finalità, dal contesto e dalle condizioni previste dall’AI Act. In caso di dubbio seleziona Da valutare.</small></div>';
const guidedEdit = edit;
edit = function (x) {
  guidedEdit(x);
  attachExamples($("editForm"), page);
  if (page === "systems") {
    const native = $("editForm").elements.risk;
    const wrap = document.createElement("div");
    wrap.className = "risk-picker";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "risk-trigger";
    trigger.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "risk-options";
    menu.hidden = true;
    const descriptions = {
      "Da valutare": "Non hai ancora informazioni sufficienti.",
      Inaccettabile:
        "Possibile pratica vietata, ad esempio social scoring nelle condizioni vietate. Verificare prima di usare.",
      Alto: "Possibile impatto significativo sui diritti, ad esempio valutazione dei CV. Verificare i requisiti.",
      Limitato:
        "Possibili rischi operativi o di trasparenza, ad esempio chatbot clienti.",
      "Minimo o nullo":
        "Impatto contenuto, ad esempio bozze di testi non sensibili con revisione umana.",
    };
    const classes = {
      Inaccettabile: "unacceptable",
      Alto: "high",
      Limitato: "medium",
      "Minimo o nullo": "low",
    };
    function refresh() {
      trigger.textContent = (native.value || "Seleziona stato") + " ▾";
      trigger.className = "risk-trigger " + (classes[native.value] || "");
    }
    function toggle(open) {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    }
    Object.entries(descriptions).forEach(([value, desc]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "risk-choice";
      const tag = document.createElement("span");
      tag.className = "risk-tag " + (classes[value] || "");
      tag.textContent = value;
      const detail = document.createElement("small");
      detail.textContent = desc;
      btn.append(tag, detail);
      btn.onclick = () => {
        native.value = value;
        refresh();
        toggle(false);
        trigger.focus();
      };
      menu.append(btn);
    });
    native.hidden = true;
    native.after(wrap);
    if (native.name === "status") {
      native.required = false;
      formStatusGuard(native, trigger, menu);
    }
    wrap.append(trigger, menu);
    trigger.onclick = () => toggle(menu.hidden);
    wrap.onkeydown = (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        e.preventDefault();
        e.stopPropagation();
        toggle(false);
        trigger.focus();
      }
    };
    native.addEventListener("input", refresh);
    refresh();
  }
};
function formStatusGuard(native, trigger, menu) {
  const form = native.form;
  const old = form._statusGuard;
  if (old) form.removeEventListener("submit", old, true);
  const guard = (e) => {
    if (!native.value) {
      e.preventDefault();
      e.stopImmediatePropagation();
      trigger.setAttribute("aria-invalid", "true");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.focus();
    }
  };
  form._statusGuard = guard;
  form.addEventListener("submit", guard, true);
  menu.addEventListener("click", () => {
    if (native.value) trigger.removeAttribute("aria-invalid");
  });
}
const taskOptions = [
    [
      "Da fare",
      "medium",
      "Attività non ancora iniziata. Es. verificare l’informativa privacy prima di utilizzare un nuovo strumento IA.",
    ],
    [
      "In corso",
      "progress-status",
      "Attività avviata ma non ancora conclusa. Es. formazione del personale iniziata, con alcune sessioni ancora da svolgere.",
    ],
    [
      "Completata",
      "low",
      "Attività conclusa e risultato verificato. Es. informativa aggiornata e approvata dal referente.",
    ],
];
const trainingOptions = [
      [
        "Da fare",
        "medium",
        "Formazione da organizzare o non ancora iniziata: definire argomenti, destinatari, docente e calendario. Es. pianificare un corso sull’uso sicuro dell’IA.",
      ],
      [
        "In corso",
        "progress-status",
        "Formazione avviata: lezioni, esercitazioni o verifiche di apprendimento ancora in svolgimento. Es. due moduli completati su quattro.",
      ],
      [
        "Completato",
        "low",
        "Percorso formativo concluso per i destinatari previsti: verificare partecipazione, eventuali test e registrare le evidenze disponibili. Es. corso terminato e presenze registrate.",
      ],
];

function attachStatusPicker(native, options, training = false) {
  const wrap = document.createElement("div");
  wrap.className = "risk-picker" + (training ? " training-status" : "");
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "risk-trigger";
  trigger.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "risk-options";
  menu.hidden = true;
  function refresh() {
    trigger.textContent = (native.value || "Seleziona stato") + " ▾";
    trigger.className =
      "risk-trigger " + (options.find((o) => o[0] === native.value)?.[1] || "");
  }
  function toggle(open) {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  }
  for (const [value, cls, desc] of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "risk-choice";
    const tag = document.createElement("span");
    tag.className = "risk-tag " + cls;
    tag.textContent = value;
    const detail = document.createElement("small");
    detail.textContent = desc;
    btn.append(tag, detail);
    btn.onclick = () => {
      native.value = value;
      refresh();
      toggle(false);
      trigger.focus();
    };
    menu.append(btn);
  }
  native.hidden = true;
  native.after(wrap);
  if (native.name === "status") {
    native.required = false;
    formStatusGuard(native, trigger, menu);
  }
  wrap.append(trigger, menu);
  trigger.onclick = () => toggle(menu.hidden);
  wrap.onkeydown = (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      e.preventDefault();
      e.stopPropagation();
      toggle(false);
      trigger.focus();
    }
  };
  native.addEventListener("input", refresh);
  refresh();
}

const riskGuidedEdit = edit;
edit = function(x) {
  riskGuidedEdit(x);
  if (page === "tasks") attachStatusPicker($("editForm").elements.status, taskOptions);
};

function enhanceForms() {
  attachExamples($("extraform"), page);
  if (page === "training") attachStatusPicker($("extraform").elements.status, trainingOptions, true);
  attachExamples($("profileform"), "profile");
}
attachExamples($("orgForm"), "neworg");

const docGroups = {
  systems: [
    "Registro dei casi d’uso",
    "Schede, finalità e rischi registrati.",
    [
      ["name", "Sistema IA"],
      ["purpose", "Finalità"],
      ["risk", "Rischio"],
      ["assessment.title", "Esito screening"],
      ["assessment.role", "Ruolo"],
      ["assessment.reason", "Motivazione"],
      ["assessment.owner", "Responsabile"],
      ["assessment.date", "Data valutazione"],
      ["assessment.sourceDate", "Fonti verificate il"],
      ["assessment.review", "Data riesame"],
      ["assessment.evidence", "Verifiche ed evidenze"],
    ],
  ],
  tasks: [
    "Piano d’azione",
    "Attività, scadenze e stati registrati.",
    [
      ["name", "Attività"],
      ["date", "Scadenza"],
      ["status", "Stato"],
    ],
  ],
  training: [
    "Registro della formazione",
    "Corsi, destinatari e stati registrati.",
    [
      ["name", "Corso"],
      ["note", "Destinatari"],
      ["status", "Stato"],
    ],
  ],
};
function exportValue(record, key) {
  if (key === "assessment.evidence") return Object.values(record.assessment?.evidence || {}).map(item =>
    item.label + " (" + (item.done ? "verificata" : "da verificare") + ")" + (item.reference ? " · " + item.reference : "")
  ).join("\n");
  if (key.startsWith("assessment.")) return record.assessment?.[key.slice(11)];
  return record[key];
}
function exportCSV(k) {
  const cols = docGroups[k][2],
    cell = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^(?=[\t\r\n]|\s*[=+@-])/, "'$&")
        .replace(/"/g, '""') +
      '"';
  const csv = [
    cols.map((c) => cell(c[1])).join(";"),
    ...(state[k] || []).map((x) => cols.map((c) => cell(exportValue(x, c[0]))).join(";")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = k + "-" + current.id + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportPDF(k, draft) {
  const g = docGroups[k],
    w = window.open("", "_blank");
  if (!w) {
    $("docNotice").textContent =
      "Consenti le finestre popup per esportare il PDF.";
    return;
  }
  w.opener = null;
  const body =
    k === "policy"
      ? '<p style="white-space:pre-wrap">' + esc(draft) + "</p>"
      : "<table><thead><tr>" +
        g[2].map((c) => "<th>" + esc(c[1]) + "</th>").join("") +
        "</tr></thead><tbody>" +
        ((state[k] || [])
          .map(
            (x) =>
              "<tr>" +
              g[2].map((c) => "<td>" + esc(exportValue(x, c[0])) + "</td>").join("") +
              "</tr>",
          )
          .join("") ||
          '<tr><td colspan="' +
            g[2].length +
            '">Nessun dato registrato</td></tr>') +
        "</tbody></table>";
  w.document.write(
    '<!doctype html><html lang="it"><meta charset="utf-8"><title>' +
      esc(g?.[0] || "Bozza policy IA") +
      "</title><style>body{font:14px system-ui;padding:24px;color:#30264C}table{border-collapse:collapse;width:100%}td,th{border:1px solid #E5DDF5;padding:10px;text-align:left;overflow-wrap:anywhere}tr{break-inside:avoid}thead{display:table-header-group}@page{margin:15mm}</style><h1>" +
      esc(g?.[0] || "Bozza policy interna IA") +
      "</h1><p>" +
      esc(current.name) +
      " · " +
      new Date().toLocaleDateString("it-IT") +
      "</p>" +
      body +
      "</html>",
  );
  w.document.close();
  w.focus();
  w.print();
}
function policyTemplate() {
  return (
    "BOZZA — POLICY INTERNA SULL’USO DELL’IA\nOrganizzazione: " +
    current.name +
    "\n\n1. Finalità e ambito\nDefinire gli usi consentiti e i destinatari.\n\n2. Strumenti autorizzati\nRegistro attuale: " +
    ((state.systems || []).map((x) => x.name).join(", ") || "da compilare") +
    ". Verificare le autorizzazioni.\n\n3. Protezione dei dati\nNon inserire dati personali o riservati senza autorizzazione e verifiche appropriate.\n\n4. Supervisione umana\nVerificare risultati, errori e limiti prima dell’utilizzo.\n\n5. Formazione e segnalazioni\nDefinire formazione, referente e modalità di segnalazione.\n\n6. Approvazione e revisione\nResponsabile, data e versione: da definire.\nBozza da verificare e approvare prima dell’adozione."
  );
}
function renderDocuments() {
  const icon = '<span class="doc-icon" aria-hidden="true">▤</span>';
  const card = (k) =>
    '<article class="card doc-card">' +
    icon +
    "<h2>" +
    docGroups[k][0] +
    '</h2><p class="muted">' +
    docGroups[k][1] +
    '</p><div class="doc-actions">' +
    (k !== "tasks"
      ? '<button class="secondary" data-csv="' + k + '">↓ Esporta CSV</button>'
      : "") +
    '<button class="secondary" data-pdf="' +
    k +
    '">↓ Esporta PDF</button></div></article>';
  $("content").innerHTML =
    '<h1>Documenti</h1><p class="muted">Esporta le evidenze gestite nell’app e prepara la policy interna.</p><div class="doc-grid">' +
    card("systems") +
    card("tasks") +
    card("training") +
    '<article class="card doc-card">' +
    icon +
    '<h2>Policy interna sull’uso dell’IA</h2><p class="muted">Modello modificabile per strumenti, dati, verifiche e segnalazioni.</p><div class="doc-actions"><button id="preparePolicy" class="secondary">Prepara bozza</button><button id="exportPolicy" class="secondary">↓ Esporta bozza PDF</button></div></article></div><p id="docNotice" role="status"></p><div id="policyArea" hidden class="card"><h2>Bozza modificabile</h2><textarea id="policyText" rows="17" aria-label="Testo della policy"></textarea><div class="doc-actions"><button id="savePolicy">Salva bozza</button><button class="secondary" id="closePolicy">Chiudi</button></div></div><article class="card doc-sources"><h2>Fonti normative</h2><p class="muted">Verifica la versione applicabile alla data della valutazione.</p><div class="source-grid"><a class="source-card" target="_blank" rel="noopener noreferrer" href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=it"><div class="source-art eu-art" aria-hidden="true">✦ EU ✦</div><div class="source-body"><small>GAZZETTA UFFICIALE UE</small><h3>Regolamento (UE) 2024/1689</h3><p>Il testo ufficiale dell’AI Act.</p><strong>Consulta il regolamento →</strong></div></a><a class="source-card" target="_blank" rel="noopener noreferrer" href="https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32024R1689"><div class="source-art law-art" aria-hidden="true">§</div><div class="source-body"><small>EUR-LEX</small><h3>Testo e modifiche</h3><p>Consulta le informazioni legislative e le versioni disponibili.</p><strong>Apri EUR-Lex →</strong></div></a><a class="source-card" target="_blank" rel="noopener noreferrer" href="https://digital-strategy.ec.europa.eu/it/policies/regulatory-framework-ai"><div class="source-art guide-art" aria-hidden="true">◎</div><div class="source-body"><small>COMMISSIONE EUROPEA</small><h3>Guida all’AI Act</h3><p>Informazioni sull’applicazione del regolamento.</p><strong>Consulta la guida →</strong></div></a></div></article>';
  document
    .querySelectorAll("[data-csv]")
    .forEach((b) => (b.onclick = () => exportCSV(b.dataset.csv)));
  document
    .querySelectorAll("[data-pdf]")
    .forEach((b) => (b.onclick = () => exportPDF(b.dataset.pdf)));
  $("savePolicy").onclick = () => {
    const old = state.policyDraft;
    state.policyDraft = $("policyText").value;
    try {
      persist();
      $("docNotice").textContent = "Bozza salvata per questa organizzazione.";
    } catch {
      state.policyDraft = old;
      $("docNotice").textContent =
        "Salvataggio non riuscito: spazio locale insufficiente.";
    }
  };
  $("closePolicy").onclick = () => {
    $("policyArea").hidden = true;
  };
}

function openPolicyPreview(printNow = false) {
  const w = window.open("", "_blank");
  if (!w) {
    $("docNotice").textContent =
      "Consenti le finestre popup per visualizzare la policy.";
    return;
  }
  w.opener = null;
  const sections = [
    [
      "Strumenti autorizzati",
      "Usare soltanto gli strumenti approvati per le attività indicate nel registro. Prima di attivare una nuova funzione IA, chiedere conferma al referente.",
    ],
    [
      "Dati e riservatezza",
      "Seguire le regole interne sulla gestione delle informazioni. Verificare che account, finalità e dati siano autorizzati prima di inserire informazioni riservate. In caso di dubbio, usare dati sintetici o coinvolgere il referente.",
    ],
    [
      "Verifica degli output",
      "Controllare accuratezza, completezza e fonti degli output prima di usarli. Applicare i passaggi di verifica umana previsti per ciascun processo.",
    ],
    [
      "Quando coinvolgere il referente",
      "Segnalare al referente un nuovo strumento, un cambio di finalità, l’uso per decisioni che riguardano persone o un output sospetto.",
    ],
  ];
  const content =
    state.policyDraft != null
      ? '<section><div style="white-space:pre-wrap">' +
        esc(state.policyDraft) +
        "</div></section>"
      : sections
          .map(
            ([title, body]) =>
              "<section><h2>" +
              esc(title) +
              "</h2><p>" +
              esc(body) +
              "</p></section>",
          )
          .join("");
  w.document.write(
    '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bozza di policy interna | AI ACT</title><style> *{box-sizing:border-box}body{margin:0;padding:12px 24px;font:15px system-ui;color:#30264C;background:#fff}main{max-width:1000px;margin:auto}button{font:inherit;cursor:pointer;border:0;border-radius:9px;padding:12px 16px;background:linear-gradient(115deg,#E4EFFF,#D9C9F8);color:#30264C}h1{font-size:30px;margin:10px 0 18px}h2{font-size:17px;margin:0 0 16px}p{line-height:1.6}header{border-bottom:1px solid #E4EFFF;padding:14px 0 24px}section{padding:28px 0;border-bottom:1px solid #E4EFFF;break-inside:avoid}.draft{margin:18px 0;font-weight:700}@media print{button{display:none}body{padding:0}@page{margin:15mm}}</style></head><body><main><button id="printPolicy">Stampa o salva come PDF</button><header><strong>AI ACT</strong><h1>Bozza di policy interna</h1><div>' +
      esc(current.name) +
      (current.kind ? " · " + esc(current.kind) : "") +
      " · " +
      new Date().toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      (/demo/i.test(current.name) ? " · Dati simulati" : "") +
      '</div></header><p class="draft">Bozza da validare</p>' +
      content +
      "</main></body></html>",
  );
  w.document.close();
  w.document.getElementById("printPolicy").onclick = () => w.print();
  w.focus();
  if (printNow) w.print();
}
function bindPolicyPreview() {
  $("preparePolicy").onclick = () => openPolicyPreview();
  $("exportPolicy").onclick = () => openPolicyPreview(true);
  const editButton = document.createElement("button");
  editButton.className = "secondary";
  editButton.textContent = "Modifica bozza";
  editButton.onclick = () => {
    $("policyArea").hidden = false;
    $("policyText").value = state.policyDraft ?? policyTemplate();
    $("policyText").focus();
  };
  $("preparePolicy").after(editButton);
}
function guideDashboard() {
  const guide = document.createElement("section");
  guide.className = "card launch-guide";
  guide.innerHTML =
    '<h2>Il tuo percorso AI Act</h2><p>Il Regolamento (UE) 2024/1689 disciplina l’intelligenza artificiale. Individua il tuo ruolo: chi sviluppa o commercializza sistemi può essere un fornitore; chi li utilizza sotto la propria autorità può essere un deployer. Gli obblighi dipendono dal ruolo e dal sistema.</p><div class="launch-grid">' +
    [
      [
        "1",
        "Conosci la tua organizzazione",
        "Definisci settore e referenti.",
        "profile",
      ],
      [
        "2",
        "Identifica gli usi dell’IA",
        "Censisci strumenti, finalità e rischio preliminare.",
        "systems",
      ],
      [
        "3",
        "Verifica gli obblighi",
        "Valuta il contesto d’uso e il tuo ruolo.",
        "risk",
      ],
      [
        "4",
        "Organizza gli interventi",
        "Verifica gli obblighi applicabili e pianifica le attività.",
        "tasks",
      ],
      [
        "5",
        "Forma il personale",
        "Sostieni l’alfabetizzazione IA in base a persone e contesto (art. 4).",
        "training",
      ],
      ["6", "Documenta il percorso", "Prepara policy ed evidenze.", "docs"],
    ]
      .map(
        ([n, t, d, p]) =>
          '<button type="button" class="launch-step" data-step="' +
          p +
          '"><span class="step-top"><span class="step-icon" aria-hidden="true">' + ["▤","⌘","✓","☷","◇","▧"][Number(n)-1] + '</span><span class="step-number">PASSO ' + n + ' / 6</span></span><strong>' + t + '</strong><span class="step-description">' + d + '</span><span class="step-link">Apri sezione →</span></button>',
      )
      .join("") +
    '</div><p class="muted">Guida orientativa: la compilazione non certifica la conformità. <a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=it" target="_blank" rel="noopener noreferrer">Consulta il regolamento ufficiale</a>.</p>';
  $("content").append(guide);
  guide
    .querySelectorAll("[data-step]")
    .forEach((b) => (b.onclick = () => go(b.dataset.step)));
}
function readLegacy() {
  try {
    const value = JSON.parse(localStorage.getItem("aio-act-v1"));
    if (Array.isArray(value?.systems) && Array.isArray(value?.tasks))
      return value;
  } catch {}
}

function prepareWorkspace(org) {
  const data = org.data;
  if (!Array.isArray(data.consultations)) {
    data.consultations = ["interviews", "survey"].flatMap((type) =>
      (Array.isArray(data[type]) ? data[type] : []).map((item) => ({
        ...item,
        type,
      })),
    );
  }
}

function consultationsHTML() {
  const rows = state.consultations
    .map(
      (record, index) =>
        "<tr><td>" +
        (record.type === "survey" ? "Survey" : "Intervista") +
        "</td><td>" +
        esc(record.name) +
        "</td><td>" +
        esc(record.note) +
        "</td><td>" +
        esc(record.status) +
        '</td><td><button class="secondary" data-consult-edit="' +
        index +
        '">Modifica</button> ' +
        '<button class="secondary" data-consult-delete="' +
        index +
        '">Elimina</button></td></tr>',
    )
    .join("");
  return `<div class="card">
    <p class="muted">Raccogli attività e risultati delle interviste e delle survey. I questionari si distribuiscono fuori da questo registro.</p>
    <form id="consultForm"><div class="toolbar">
      <label>Tipo<select name="type"><option value="interviews">Intervista</option><option value="survey">Survey</option></select></label>
      <label>Titolo<input name="name" required maxlength="150"></label>
      <label>Destinatari o esito<input name="note" required maxlength="500"></label>
      <label>Stato<select name="status"><option>Da fare</option><option>In corso</option><option>Completato</option></select></label>
      <button>Salva rilevazione</button><button type="button" id="cancelConsult" class="secondary" hidden>Annulla</button>
    </div></form>
    <div class="scroll"><table><thead><tr><th>Tipo</th><th>Titolo</th><th>Destinatari o esito</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

function bindConsultations() {
  const form = $("consultForm");
  let editingIndex = null;
  const commit = (records) => {
    const previous = state.consultations;
    state.consultations = records;
    if (save()) render();
    else state.consultations = previous;
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const value = Object.fromEntries(new FormData(form));
    const rows = [...state.consultations];
    if (editingIndex === null) rows.push(value);
    else rows[editingIndex] = { ...rows[editingIndex], ...value };
    commit(rows);
  };
  document.querySelectorAll("[data-consult-edit]").forEach(
    (button) =>
      (button.onclick = () => {
        editingIndex = Number(button.dataset.consultEdit);
        const record = state.consultations[editingIndex];
        for (const field of ["type", "name", "note", "status"])
          form.elements[field].value = record[field] ?? "";
        $("cancelConsult").hidden = false;
        form.elements.name.focus();
      }),
  );
  $("cancelConsult").onclick = () => render();
  document.querySelectorAll("[data-consult-delete]").forEach(
    (button) =>
      (button.onclick = () => {
        if (confirm("Eliminare questa rilevazione?"))
          commit(
            state.consultations.filter(
              (_, i) => i !== Number(button.dataset.consultDelete),
            ),
          );
      }),
  );
}

function renderAssessment() {
  const record = state.systems.find(item => item.id === assessmentSystem);
  const saved = record?.assessment;
  const readonly = managed && current.role === "viewer";
  const selected = (key, value) => saved?.[key] === value ? " selected" : "";
  return `<div class="card assessment-card">
    <p>Verifica quali obblighi approfondire e conserva la motivazione della decisione.</p>
    <form id="assessment">
      <label>Sistema del Registro IA<select name="system">
        <option value="">Screening senza salvataggio</option>
        ${state.systems.map(item => `<option value="${esc(item.id)}"${item === record ? " selected" : ""}>${esc(item.name)}</option>`).join("")}
      </select></label>
      <div class="assessment-grid">
        <label>Ruolo<select name="role"><option value="unknown">Da chiarire</option><option value="provider"${selected("role", "provider")}>Fornitore</option><option value="deployer"${selected("role", "deployer")}>Utilizzatore (deployer)</option></select></label>
        <label>Contesto principale<select name="scenario" required>
          <option value="">Seleziona</option>
          <option value="prohibited"${selected("scenario", "prohibited")}>Possibile pratica vietata</option>
          <option value="annex1"${selected("scenario", "annex1")}>Prodotto regolamentato o componente di sicurezza</option>
          <option value="annex3"${selected("scenario", "annex3")}>Finalità dell’allegato III, es. selezione del personale</option>
          <option value="transparency"${selected("scenario", "transparency")}>Chatbot, deepfake o altri contenuti sintetici</option>
          <option value="other"${selected("scenario", "other")}>Altro o informazioni insufficienti</option>
        </select></label>
      </div>
      <label class="check-label"><input type="checkbox" name="transparency"${saved?.transparency ? " checked" : ""}> Interagisce direttamente con persone o genera contenuti</label>
      <div class="assessment-grid">
        <label>Responsabile<input name="owner" maxlength="150" value="${esc(saved?.owner)}" ${readonly ? "readonly" : ""}></label>
        <label>Data di riesame<input type="date" name="review" value="${esc(saved?.review)}" ${readonly ? "readonly" : ""}></label>
      </div>
      <label>Motivazione<textarea name="reason" rows="3" maxlength="1600" ${readonly ? "readonly" : ""}>${esc(saved?.reason)}</textarea></label>
      ${saved?.date ? `<p class="muted">Ultimo salvataggio ${esc(saved.date.slice(0, 10))}.</p>` : ""}
      <button type="submit">Verifica obblighi possibili</button>
      <div id="assessmentResult" aria-live="polite"></div>
      <p id="assessmentNotice" role="status"></p>
    </form>
    <div class="assessment-sources"><a href="${sources.consolidated}">AI Act consolidato</a> · <a href="${sources.amendment}">Digital Omnibus</a> · <a href="${sources.timeline}">Calendario UE</a> · <a href="${sources.transparency}">Guida alla trasparenza</a></div>
  </div>`;
}

function bindAssessment() {
  const form = $("assessment");
  const resultBox = $("assessmentResult");
  const notice = $("assessmentNotice");
  const readonly = managed && current.role === "viewer";
  const system = state.systems.find(item => item.id === assessmentSystem);
  const renderResult = (result, previous = {}, showSave = false) => {
    const checks = assessmentChecks(form.elements.scenario.value, form.elements.role.value, form.elements.transparency.checked);
    resultBox.innerHTML = `<h2>${esc(result.title)}</h2><ul>${result.next.map(value => `<li>${esc(value)}</li>`).join("")}</ul>
      <p class="muted">Esito orientativo. Fonti verificate il ${esc(result.checked)}.</p>
      <fieldset><legend>Verifiche ed evidenze</legend>${checks.map(check => {
        const evidence = previous[check.id];
        return `<div class="evidence-row">
          <label class="check-label"><input name="done-${check.id}" type="checkbox" ${evidence?.done ? "checked" : ""} ${readonly ? "disabled" : ""}> ${esc(check.label)}</label>
          <label>Riferimento all’evidenza<input name="evidence-${check.id}" maxlength="500" value="${esc(evidence?.reference)}" placeholder="Es. procedura interna, versione o riferimento" ${readonly ? "readonly" : ""}></label>
        </div>`;
      }).join("")}</fieldset>
      ${system && !readonly && showSave ? '<button id="saveAssessment" type="button">Salva valutazione nella scheda</button>' : ""}`;
    if (!$("saveAssessment")) return;
    $("saveAssessment").onclick = () => {
      for (const key of ["owner", "review", "reason"]) {
        const field = form.elements[key];
        if (!field.value.trim()) {
          notice.textContent = "Completa responsabile, data di riesame e motivazione per salvare.";
          field.focus();
          return;
        }
      }
      const previousAssessment = system.assessment;
      system.assessment = {
        role: form.elements.role.value, scenario: form.elements.scenario.value,
        transparency: form.elements.transparency.checked, title: result.title,
        owner: form.elements.owner.value.trim(), review: form.elements.review.value,
        reason: form.elements.reason.value.trim(), date: new Date().toISOString(),
        sourceDate: result.checked,
        evidence: { ...previousAssessment?.evidence, ...Object.fromEntries(checks.map(check => [check.id, {
          label: check.label, done: form.elements["done-" + check.id].checked,
          reference: form.elements["evidence-" + check.id].value.trim()
        }])) }
      };
      if (!save()) { system.assessment = previousAssessment; return; }
      notice.textContent = managed ? "Valutazione pronta. Premi Salva modifiche sul server per sincronizzarla." : "Valutazione salvata nel Registro IA.";
    };
  };
  form.elements.system.onchange = () => {
    assessmentSystem = form.elements.system.value;
    render();
  };
  const showResult = () => {
    const result = assess(Object.fromEntries(new FormData(form)));
    if (result) renderResult(result, system?.assessment?.evidence, true);
  };
  form.onsubmit = event => { event.preventDefault(); showResult(); };
  for (const key of ["role", "scenario", "transparency"]) {
    form.elements[key].onchange = () => { resultBox.replaceChildren(); notice.textContent = ""; };
  }
  if (system?.assessment) showResult();
}


let endpointAvailable = false;
let credentials;
let busy = false;

async function api(path, method = "GET", data) {
  const response = await fetch("./api/" + path, {
    method,
    cache: "no-store",
    ...(data === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Richiesta non riuscita.");
  return result;
}

function updateAccountStatus(message) {
  const bar = $("accountStatus");
  bar.hidden = !managed && !message;
  bar.replaceChildren();
  if (message) bar.append(document.createTextNode(message + " "));
  if (managed && current?.id) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = busy
      ? "Operazione in corso…"
      : dirty
        ? "Salva modifiche sul server"
        : "Dati sincronizzati";
    button.disabled = busy || !dirty;
    button.onclick = saveManaged;
    bar.append(button);
  }
  $("modeLabel").textContent = managed ? "Area con account" : "Modalità locale";
}

async function saveManaged() {
  if (busy || !dirty) return;
  busy = true;
  updateAccountStatus();
  const payload = workspacePayload(current);
  try {
    const { version } = await api("orgs/" + current.id, "PUT", {
      ...payload,
      version: current.version,
      keepDocument: !!(payload.visura && !payload.visuraData),
    });
    current.version = version;
    const listEntry = orgs.find((item) => item.id === current.id);
    if (listEntry) listEntry.name = payload.name;
    syncOrg();
    if (JSON.stringify(workspacePayload(current)) === JSON.stringify(payload)) {
      delete current.visuraData;
      dirty = false;
    }
    updateAccountStatus("Salvataggio completato.");
  } catch (error) {
    updateAccountStatus(error.message);
  } finally {
    busy = false;
    if ($("accountStatus").lastChild?.tagName === "BUTTON") {
      const button = $("accountStatus").lastChild;
      button.textContent = dirty
        ? "Salva modifiche sul server"
        : "Dati sincronizzati";
      button.disabled = !dirty;
    }
  }
}

function workspacePayload(org) {
  const { version, role, ...payload } = org;
  return payload;
}

function canLeave() {
  return (
    !busy &&
    (!dirty || confirm("Abbandonare le modifiche non salvate sul server?"))
  );
}

async function switchManaged(id, destination = "dashboard") {
  if (!canLeave()) {
    syncOrg();
    return;
  }
  busy = true;
  try {
    const next = await api("orgs/" + id);
    prepareWorkspace(next);
    current = next;
    state = next.data;
    dirty = false;
    syncOrg();
    $("messages").replaceChildren();
    $("question").value = "";
    go(destination);
    updateAccountStatus();
  } catch (error) {
    syncOrg();
    updateAccountStatus(error.message);
  } finally {
    busy = false;
    const button = $("accountStatus").lastChild;
    if (button?.tagName === "BUTTON" && dirty) {
      button.disabled = false;
      button.textContent = "Salva modifiche sul server";
    }
  }
}

async function enterManaged() {
  const list = await api("orgs");
  const next = { id: "", name: "", data: { systems: [], tasks: [] } };
  prepareWorkspace(next);
  managed = true;
  dirty = false;
  orgs = list;
  current = next;
  state = next.data;
  syncOrg();
  $("messages").replaceChildren();
  $("question").value = "";
  go(list.length ? "dashboard" : "settings");
  updateAccountStatus();
}

function downloadWorkspace() {
  const payload = workspacePayload(current);
  const download = (data) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "copilota-workspace.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!managed || !payload.visura || payload.visuraData)
    return download(payload);
  fetch("./api/orgs/" + current.id + "/document")
    .then(async (response) => {
      if (!response.ok) throw new Error("Documento non disponibile.");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => download({ ...payload, visuraData: reader.result });
      reader.onerror = () =>
        updateAccountStatus("Impossibile esportare il documento.");
      reader.readAsDataURL(blob);
    })
    .catch((error) => updateAccountStatus(error.message));
}

function renderSettings() {
  $("content").innerHTML = `<h1>Dati e account</h1><p class="muted">Gestisci il tuo spazio di lavoro, gli accessi e la conservazione dei dati.</p><div class="settings-grid">
  <article class="card settings-card"><span class="step-icon" aria-hidden="true">▤</span><h2>La tua organizzazione</h2><p><strong>${esc(current.name)}</strong></p><p class="muted">Consulta e aggiorna i dati aziendali e i referenti.</p><button id="settingsProfile">Gestisci organizzazione</button></article>
  <article class="card settings-card"><span class="step-icon" aria-hidden="true">◎</span><h2>Salvataggio dei dati</h2><p><strong>${managed ? "Archivio sul server" : "Archivio locale nel browser"}</strong></p><p class="muted">${managed ? "Usa Salva modifiche sul server per sincronizzare il workspace." : "I dati sono salvati su questo dispositivo. Conserva una copia prima di cancellare i dati del sito."}</p><span class="pill">${managed ? (dirty ? "Modifiche da salvare" : "Nessuna modifica in attesa") : "Modalità locale"}</span></article>
  <article class="card settings-card"><span class="step-icon" aria-hidden="true">◇</span><h2>Riservatezza e accessi</h2><p class="muted">Gli account sul server consentono di gestire gli accessi autorizzati. Evita dati riservati nelle domande al Copilota.</p><button id="settingsAccess" class="secondary">Gestisci accesso</button></article></div>
  <section id="accountPanel" class="card settings-panel"></section><details class="card technical-tools"><summary>Strumenti avanzati · trasferimento e copie dei dati</summary><p class="muted">Usa questa funzione solo per trasferire il workspace o conservarne una copia. Il file può contenere informazioni riservate.</p>${current?.id ? '<button id="exportWorkspace" class="secondary">Scarica copia dei dati</button>' : ""}</details>${managed ? '<button id="logout" class="secondary">Esci dall’account</button>' : ""}`;
  $("settingsProfile").onclick = () => go("profile");
  if (!current.id) $("settingsProfile").disabled = true;
  $("settingsAccess").onclick = () => $("accountPanel").scrollIntoView({behavior:"smooth",block:"start"});
  if ($("exportWorkspace")) $("exportWorkspace").onclick = downloadWorkspace;
  if ($("logout"))
    $("logout").onclick = async () => {
      if (!canLeave()) return;
      try {
        await api("logout", "POST");
        dirty = false;
        location.reload();
      } catch (error) {
        updateAccountStatus(error.message);
      }
    };
  const panel = $("accountPanel");
  if (!endpointAvailable) {
    panel.innerHTML = '<h2>Accesso e collaborazione</h2><p>Stai utilizzando la versione locale. L’accesso personale, la collaborazione e il salvataggio centralizzato richiedono la versione server.</p><p class="muted">Non è necessario creare un account per esplorare questa versione.</p>';
    return;
  }
  if (!managed) {
    panel.innerHTML = `<h2>Accesso</h2><form id="loginForm">
      <label>Email<input name="email" type="email" required autocomplete="username"></label>
      <label>Password<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="current-password"></label>
      <label>Codice per la registrazione<input name="key" type="password" autocomplete="off"></label>
      <div class="account-controls"><button value="login">Accedi</button><button value="register" class="secondary">Registrati</button></div>
    </form>`;
    $("loginForm").onsubmit = async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      const buttons = [...event.target.querySelectorAll("button")];
      buttons.forEach((button) => (button.disabled = true));
      try {
        credentials = await api(
          event.submitter?.value || "login",
          "POST",
          values,
        );
        await enterManaged();
      } catch (error) {
        updateAccountStatus(error.message);
      } finally {
        buttons.forEach((button) => (button.disabled = false));
      }
    };
    return;
  }
  panel.innerHTML = `<h2>Organizzazioni</h2><p>Account ${esc(credentials.email)}${current.role ? " · " + esc(roleLabel(current.role)) : ""}</p>
    <form id="newServerOrg"><label>Denominazione<input name="name" required maxlength="150"></label><button>Crea organizzazione</button></form>
    <form id="importWorkspace"><label>Importa una copia da JSON<input name="file" type="file" accept=".json,application/json" required></label><button>Importa come nuova organizzazione</button></form>
    ${
      current.role === "owner"
        ? `<h2>Accessi all’organizzazione</h2><div id="memberList"></div>
    <form id="memberForm"><label>Email di un account già registrato<input name="email" type="email" required></label>
    <label>Permesso<select name="role"><option value="editor">Collaboratore</option><option value="viewer">Lettore</option><option value="remove">Revoca</option></select></label>
    <button>Aggiorna accesso</button></form><p><button id="deleteOrg" class="secondary">Elimina organizzazione</button></p>`
        : ""
    }`;
  const create = async (payload) => {
    if (!canLeave()) return;
    const id = (await api("orgs", "POST", payload)).id;
    orgs = await api("orgs");
    dirty = false;
    await switchManaged(id);
  };
  $("newServerOrg").onsubmit = async (event) => {
    event.preventDefault();
    await runForm(event.target, () =>
      create({
        name: new FormData(event.target).get("name"),
        data: { systems: [], tasks: [] },
      }),
    );
  };
  $("importWorkspace").onsubmit = async (event) => {
    event.preventDefault();
    await runForm(event.target, async () => {
      const file = event.target.elements.file.files[0];
      if (file.size > 5 * 1024 * 1024) throw new Error("File troppo grande.");
      await create(JSON.parse(await file.text()));
    });
  };
  if ($("memberForm")) {
    const id = current.id;
    const refresh = async () => {
      const rows = await api("orgs/" + id + "/members");
      if (current.id !== id || !$("memberList")) return;
      $("memberList").innerHTML =
        "<ul>" +
        rows
          .map(
            (row) =>
              "<li>" +
              esc(row.email) +
              " · " +
              esc(roleLabel(row.role)) +
              "</li>",
          )
          .join("") +
        "</ul>";
    };
    refresh().catch((error) => updateAccountStatus(error.message));
    $("memberForm").onsubmit = async (event) => {
      event.preventDefault();
      await runForm(event.target, async () => {
        await api(
          "orgs/" + id + "/members",
          "PUT",
          Object.fromEntries(new FormData(event.target)),
        );
        await refresh();
      });
    };
    $("deleteOrg").onclick = async () => {
      if (
        !canLeave() ||
        !confirm(
          "Eliminare definitivamente l’organizzazione e i suoi dati attivi?",
        )
      )
        return;
      try {
        await api("orgs/" + id, "DELETE");
        await enterManaged();
      } catch (error) {
        updateAccountStatus(error.message);
      }
    };
  }
}

function roleLabel(role) {
  return {
    owner: "Amministratore",
    editor: "Collaboratore",
    viewer: "Lettore",
  }[role];
}

async function runForm(form, action) {
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    updateAccountStatus(error.message);
  } finally {
    button.disabled = false;
  }
}

function render() {
  if (!current.id && page !== "settings") {
    const section = titles[page] || "Dashboard";
    if (page === "dashboard") {
      $("content").innerHTML = '<h1>Dashboard</h1>';
    } else {
      $("content").innerHTML = '<h1>'+esc(section)+'</h1><div class="card" style="max-width:720px;margin:24px auto;padding:30px"><h2>Seleziona un’organizzazione</h2><p class="muted">Per aprire '+esc(section)+' scegli lo spazio di lavoro. Nessuna organizzazione viene selezionata automaticamente.</p><div id="workspaceChoices" class="workspace-choices"></div></div>';
      for (const option of $("orgSelect").options) {
        if (!option.value) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = option.textContent;
        button.onclick = () => {
          $("orgSelect").value = option.value;
          $("orgSelect").onchange();
        };
        $("workspaceChoices").append(button);
      }
      if (managed && !orgs.length) {
        const button = document.createElement("button");
        button.textContent = "Gestisci organizzazioni";
        button.onclick = () => go("settings");
        $("workspaceChoices").append(button);
      }
    }
    $("crumb").textContent = section;
    $("copilot").hidden = true;
    $("chat").hidden = true;
    document.querySelectorAll("nav button[data-page]").forEach(b=>{
      const active = b.dataset.page === page;
      b.classList.toggle("active",active);
      if (active) { b.setAttribute("aria-current","page"); if(b.closest("details")) b.closest("details").open=true; }
      else b.removeAttribute("aria-current");
    });
    if (page === "dashboard") guideDashboard();
    return;
  }
  $("copilot").hidden = !current.id;
  if (page === "settings") renderSettings();
  else if (page === "docs") {
    renderDocuments();
    bindPolicyPreview();
  } else if (extraTitles[page]) renderExtra();
  else renderCore();
  enhanceForms();
  if (page === "dashboard") guideDashboard();
  if (managed && current.role === "viewer") {
    for (const selector of [
      "#add",
      "[data-edit]",
      "[data-delete]",
      "[data-consult-edit]",
      "[data-consult-delete]",
      "[data-remove]",
      "#extraform",
      "#consultForm",
      "#savePolicy",
      "#visuraRemove",
      "#profileform button[type=submit]",
      "#profileform button:not([type])",
      "#profileform input",
      "#profileform select",
      "#profileform .dropzone",
      '[data-start="census"]',
      '[data-start="hr"]',
    ]) {
      document.querySelectorAll(selector).forEach((node) => {
        node.inert = true;
      });
    }
  }
  document.querySelectorAll("nav button[data-page]").forEach((button) => {
    const active =
      button.dataset.page === page ||
      (page === "systems" && button.dataset.page === "dashboard");
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
      if (button.closest("details")) button.closest("details").open = true;
    } else button.removeAttribute("aria-current");
  });
  $("crumb").textContent = titles[page] || "";
  $("copilot").textContent = managed && credentials?.aiEnabled ? "Copilota AI" : "Guida AI Act";
  if ($("enableAI"))
    $("enableAI").hidden = !(managed && credentials?.aiEnabled && current.id);
}

$("chatForm").onsubmit = async (event) => {
  event.preventDefault();
  const input = $("question");
  const question = input.value.trim();
  if (!question) return;
  const id = current.id;
  input.value = "";
  const add = (value, className) => {
    const node = document.createElement("div");
    node.className = className;
    node.textContent = value;
    $("messages").append(node);
    $("messages").scrollTop = $("messages").scrollHeight;
  };
  add(question, "bubble mine");
  $("chatMode").textContent = managed && credentials?.aiEnabled && $("aiConsent").checked ? "Copilota generativo" : "Guida AI Act · risposte a regole";
  if (!managed || !id || !credentials?.aiEnabled || !$("aiConsent").checked) {
    const reply = localCopilot(question, state);
    add(reply.text, "bubble");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = reply.action;
    button.onclick = () => {
      $("chat").hidden = true;
      go(reply.page);
    };
    $("messages").append(button);
    $("messages").scrollTop = $("messages").scrollHeight;
    return;
  }
  try {
    const result = await api("orgs/" + id + "/copilot", "POST", { question });
    if (!managed || current.id !== id) return;
    add(result.answer, "bubble");
    const link = document.createElement("a");
    link.href = sources.guidance;
    link.textContent = "Fonti ufficiali UE";
    $("messages").append(link);
  } catch (error) {
    if (current.id === id) add(error.message, "bubble");
  }
};

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

render();
if (
  location.protocol !== "file:" &&
  !location.hostname.endsWith(".github.io")
) {
  try {
    endpointAvailable = (await api("status")).available === true;
    if (endpointAvailable) {
      try {
        credentials = await api("me");
        await enterManaged();
      } catch {
        if (page === "settings") render();
      }
    }
  } catch {}
}
