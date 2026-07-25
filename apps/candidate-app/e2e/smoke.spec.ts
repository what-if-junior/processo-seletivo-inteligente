import { expect, test } from "@playwright/test";

test.describe("candidate-app smoke", () => {
  test("home shows IFB branding and bottom nav", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("PROCESSOS")).toBeVisible();
    await expect(page.getByText("SELETIVOS")).toBeVisible();
    await expect(page.getByRole("button", { name: "Início" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inscrições" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Avisos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Perfil" }).last()).toBeVisible();
  });

  test("bottom nav switches to inscriptions screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Inscrições" }).click();
    await expect(page.getByRole("heading", { name: "Minhas Inscrições" })).toBeVisible();
  });

  test("chat FAB opens assistant sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Abrir Assistente Virtual").click();
    await expect(page.getByText("Assistente PSI")).toBeVisible();
    await expect(page.getByText("Como me inscrever?")).toBeVisible();
  });
});
