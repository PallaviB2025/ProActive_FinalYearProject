import "dotenv/config";
import { test, expect } from "@playwright/test";
import pg from "pg";

test("previews and imports CSV credentials without uploading plaintext", async ({ page }) => {
  const email = `csv-import-${Date.now()}@example.com`;
  const login = "CSV-Import-Login-Password-42!";
  const master = "CSV-Import-Master-Password-84!";
  const csv = [
    "name,url,username,password",
    'Example,"https://example.com/path?a=1,b=2",alice,Sunflower123',
    "Second,https://second.example,bob,Sunflower123",
    "Second,https://second.example,bob,Sunflower123",
    "Missing URL,,charlie,secret",
  ].join("\n");
  const apiBodies: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/credentials"))
      apiBodies.push(request.postData() ?? "");
  });
  await page.route("https://api.pwnedpasswords.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: `${"0".repeat(35)}:0` }),
  );
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Register instead" }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Login password", { exact: true }).fill(login);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Login password", { exact: true }).fill(login);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByLabel("Master Password", { exact: true }).fill(master);
    await page.getByLabel("Confirm Master Password", { exact: true }).fill(master);
    await page.getByRole("button", { name: "Initialize vault" }).click();

    await page.getByTestId("csv-file").setInputFiles({
      name: "passwords.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    const preview = page.getByTestId("import-preview");
    await expect(preview).toContainText("Total rows: 4");
    await expect(preview).toContainText("Valid: 3");
    await expect(preview).toContainText("Invalid: 1");
    await expect(preview).toContainText("Duplicates: 1");
    await expect(page.getByRole("button", { name: "Import 2 selected" })).toBeVisible();
    let writes = 0;
    await page.route(url => url.pathname.endsWith('/credentials') || url.href.includes('/credentials'), async (route) => {
      if (route.request().method() === 'POST' && ++writes === 2) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Temporary failure"}' });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Import 2 selected" }).click();
    await expect(page.getByTestId('credential')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Import 1 selected' })).toBeEnabled();
    await page.getByRole('button', { name: 'Import 1 selected' }).click();
    await expect(page.getByTestId("credential")).toHaveCount(2);
    await expect(
      page.getByTestId("credential").filter({ hasText: "https://example.com/path?a=1,b=2" }),
    ).toBeVisible();
    await expect(page.getByText(
      "Password export files contain plaintext credentials. Delete the exported CSV securely after import.",
      { exact: true },
    )).toBeVisible();

    await page.getByRole("button", { name: "Run local audit" }).click();
    await expect(page.getByTestId("audit-results")).toContainText("Exact password reuse");
    await page.screenshot({ path: '.runtime/final-audit-dashboard.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '.runtime/final-audit-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });

    const traffic = apiBodies.join("\n");
    for (const plaintext of [csv, "Sunflower123", "alice", "bob", "https://second.example"])
      expect(traffic).not.toContain(plaintext);
    const stored = JSON.stringify(
      (await pool.query(
        "SELECT c.payload FROM credentials c JOIN users u ON u.id=c.user_id WHERE u.email=$1",
        [email],
      )).rows,
    );
    for (const plaintext of ["Sunflower123", "alice", "bob", "example.com"])
      expect(stored).not.toContain(plaintext);
    const browserStorage = await page.evaluate(async () => ({
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
      databases: await indexedDB.databases(),
      caches: await caches.keys(),
    }));
    expect(browserStorage).toEqual({ local: [], session: [], databases: [], caches: [] });
    // Preview plaintext must disappear when a lock is received in another tab.
    await page.getByTestId('csv-file').setInputFiles({ name: 'another.csv', mimeType: 'text/csv', buffer: Buffer.from('url,username,password\nprivate-preview.example,user,secret') });
    await expect(page.getByTestId('import-preview')).toBeVisible();
    await page.evaluate(() => { const channel = new BroadcastChannel('proactive-lock'); channel.postMessage('lock'); channel.close(); });
    await expect(page.getByRole('heading', { name: 'Vault locked' })).toBeVisible();
    await expect(page.getByTestId('import-preview')).toHaveCount(0);
    await expect(page.getByText('private-preview.example', { exact: true })).toHaveCount(0);
  } finally {
    await pool.query("DELETE FROM users WHERE email=$1", [email]);
    await pool.end();
  }
});
