import test from "node:test";
import assert from "node:assert/strict";
import { localCopilot } from "./risk.js";
const workspace={systems:[{id:"x"}],tasks:[]};
const cases=[["Cos’è l’AI Act?","scope"],["Qual è il mio ruolo?","roles"],["Dove allego la visura?","visura"],["Come preparo una policy interna?","policy"],["Come organizzo la formazione?","literacy"],["Quali sono gli obblighi privacy?","privacy"],["Usiamo IA per selezionare candidati","hr"],["Usiamo chatbot","transparency"],["Quali pratiche sono vietate?","prohibited"],["Come registro ChatGPT?","register"],["Quali sono i sistemi ad alto rischio?","highrisk"],["Quali sono le scadenze normative?","deadlines"],["Quali sono le multe?","sanctions"],["Esporta policy","policy"],["Come organizzo il piano d’azione?","tasks"],["Quali sono i modelli GPAI?","gpai"],["Quanto costa un biglietto del treno?",""]];
for(const [question,topic] of cases) test(question,()=>assert.equal(localCopilot(question,workspace).topic,topic));
test("HR follow-up uses context and gives new information",()=>{const first=localCopilot("Usiamo IA per selezionare candidati",workspace);const second=localCopilot("Cosa devo fare?",workspace,first.topic);assert.equal(second.topic,"hr");assert.notEqual(second.text,first.text);});
