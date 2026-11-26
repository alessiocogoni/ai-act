import { test, expect } from "@playwright/test";

const base = "http://127.0.0.1:" + (process.env.E2E_PORT || "18764");
const key = "test-only-key-at-least-24-characters";
const password = "a-test-password-only";
const headers = { Origin: base };

async function register(request, email) {
  const response = await request.post("/api/register", {
    headers,
    data: { email, password, key },
  });
  expect(response.status()).toBe(200);
}

test("preserva rilevazioni, naviga, valuta e visualizza su mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem("aio-orgs-v2")) {
      localStorage.setItem(
        "aio-orgs-v2",
        JSON.stringify([
          {
            id: "previous",
            name: "Dati precedenti",
            data: {
              systems: [],
              tasks: [],
              interviews: [
                { name: "Colloquio HR", note: "CV", status: "Da fare" },
              ],
              survey: [
                { name: "Questionario HR", note: "Team", status: "Completato" },
              ],
            },
          },
        ]),
      );
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByText("Gestione organizzazione", { exact: true }).click();
  await page.getByRole("button", { name: "Interviste e survey" }).click();
  await expect(page.getByText("Colloquio HR")).toBeVisible();
  await expect(page.getByText("Questionario HR")).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Colloquio HR" })
    .getByRole("button", { name: "Modifica" })
    .click();
  await page.getByLabel("Titolo").fill("Colloquio aggiornato");
  await page.getByRole("button", { name: "Salva rilevazione" }).click();
  await page.reload();
  await page.getByText("Gestione organizzazione", { exact: true }).click();
  await page.getByRole("button", { name: "Interviste e survey" }).click();
  await expect(page.getByText("Colloquio aggiornato")).toBeVisible();
  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: /^3\. Verifica gli obblighi/ }).click();
  await page.getByLabel("Ruolo").selectOption("deployer");
  await page.getByLabel("Contesto principale").selectOption("annex3");
  await page
    .getByRole("button", { name: "Verifica obblighi possibili" })
    .click();
  await expect(page.getByText(/2 dicembre 2027/)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test("account, workspace persistente e PDF protetto", async ({
  page,
  playwright,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("Gestione organizzazione", { exact: true }).click();
  await page.getByRole("button", { name: "Dati e account" }).click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Codice per la registrazione").fill(key);
  await page.getByRole("button", { name: "Registrati" }).click();
  await page.locator("#newServerOrg").getByLabel("Denominazione").fill("Organizzazione privata");
  await page.getByRole("button", { name: "Crea organizzazione" }).click();
  await page
    .getByRole("button", { name: /Conosci la tua organizzazione/ })
    .click();
  await page.locator("#profileform").getByLabel("Settore", { exact: true }).fill("Servizi");
  await page.locator("input[type=file]").setInputFiles({
    name: "visura.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n%%EOF"),
  });
  await expect(page.getByText(/da salvare/)).toBeVisible();
  await page.getByRole("button", { name: "Salva profilo" }).click();
  await page
    .getByRole("button", { name: "Salva modifiche sul server" })
    .click();
  await expect(page.getByText("Salvataggio completato.")).toBeVisible();
  await page.reload();
  await expect(page.locator("#orgHeader")).toHaveText("Organizzazione privata");
  await page
    .getByRole("button", { name: /Conosci la tua organizzazione/ })
    .click();
  await expect(page.locator("#profileform").getByLabel("Settore", { exact: true })).toHaveValue("Servizi");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apri PDF" }).click();
  expect((await download).suggestedFilename()).toBe("visura.pdf");

  const { id } = (await (await page.request.get("/api/orgs")).json())[0];
  const other = await playwright.request.newContext({ baseURL: base });
  try {
    await register(other, "other@example.test");
    expect((await other.get("/api/orgs/" + id)).status()).toBe(404);
    expect((await other.get("/api/orgs/" + id + "/document")).status()).toBe(
      404,
    );
    const access = await page.request.put("/api/orgs/" + id + "/members", {
      headers,
      data: { email: "other@example.test", role: "viewer" },
    });
    expect(access.status()).toBe(200);
    const workspace = await (await other.get("/api/orgs/" + id)).json();
    expect(workspace.role).toBe("viewer");
    expect(workspace.visuraData).toBeUndefined();
    expect(
      (
        await other.put("/api/orgs/" + id, { headers, data: workspace })
      ).status(),
    ).toBe(403);
    expect(
      (await page.request.put("/api/orgs/" + id, { data: workspace })).status(),
    ).toBe(403);
    const stale = {
      ...workspace,
      version: workspace.version - 1,
      keepDocument: true,
    };
    expect(
      (
        await page.request.put("/api/orgs/" + id, { headers, data: stale })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/orgs/" + id + "/copilot", {
          headers,
          data: { question: "AI Act" },
        })
      ).status(),
    ).toBe(503);
    expect(errors).toEqual([]);
  } finally {
    await other.dispose();
  }
});

test("salva e ritrova valutazione ed evidenze nel Registro IA", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Apri registro", exact: true }).click();
  await page.getByRole("button", { name: "Valuta", exact: true }).click();
  await page.getByRole("combobox", { name: "Ruolo", exact: true }).selectOption("deployer");
  await page.getByLabel("Contesto principale").selectOption("annex3");
  await page.getByLabel("Responsabile").fill("Referente di prova");
  await page.getByLabel("Data di riesame").fill("2027-01-15");
  await page.getByLabel("Motivazione").fill("Il sistema supporta la valutazione dei candidati.");
  await page.getByRole("button", { name: "Verifica obblighi possibili" }).click();
  const oversight = page.getByLabel(/Documentare istruzioni d.uso, supervisione/);
  await oversight.check();
  await page.locator('[name="evidence-oversight"]').fill("Procedura HR di prova");
  await page.getByRole("button", { name: "Salva valutazione nella scheda" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Valutazione salvata nel Registro IA." })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Apri registro", exact: true }).click();
  await page.getByRole("button", { name: "Valutazione salvata", exact: true }).click();
  await expect(page.getByLabel("Responsabile")).toHaveValue("Referente di prova");
  await expect(oversight).toBeChecked();
  await expect(page.locator('[name="evidence-oversight"]')).toHaveValue("Procedura HR di prova");
});
