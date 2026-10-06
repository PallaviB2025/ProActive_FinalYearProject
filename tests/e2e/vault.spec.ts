import "dotenv/config";
import { test, expect } from "@playwright/test";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const master = "E2E-Master-only-unique-5931!";
const login = "E2E-Login-only-9392!";
const website = "private-vault-site.example";
const username = "private-vault-user-717";
test("complete encrypted vault lifecycle and persistence boundaries", async ({
  page,
  context,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const requests: { url: string; body: string }[] = [];
  const consoleMessages: string[] = [];
  const hibpRequests: string[] = [];
  let hibpUnavailable = false;
  const breachedHash = createHash("sha1")
    .update("Sunflower123")
    .digest("hex")
    .toUpperCase();
  await page.route("https://api.pwnedpasswords.com/**", async (route) => {
    const request = route.request();
    hibpRequests.push(request.url());
    expect(request.url()).toMatch(
      /^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/,
    );
    expect(request.postData()).toBeNull();
    expect(request.headers()["add-padding"]).toBe("true");
    expect(request.headers()["cookie"]).toBeUndefined();
    expect(request.headers()["referer"]).toBeUndefined();
    if (hibpUnavailable) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: request.url().endsWith(breachedHash.slice(0, 5))
        ? `${breachedHash.slice(5)}:42\r\n${"0".repeat(35)}:0`
        : `${"0".repeat(35)}:0`,
    });
  });
  page.on("request", (request) => {
    requests.push({ url: request.url(), body: request.postData() ?? "" });
  });
  page.on("console", (message) => consoleMessages.push(message.text()));
  page.on("pageerror", (error) => consoleMessages.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Register instead" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Login password", { exact: true }).fill(login);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Registered");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Login password", { exact: true }).fill(login);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Initialize vault", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Master Password", { exact: true }).fill(master);
  await page
    .getByLabel("Confirm Master Password", { exact: true })
    .fill(master);
  await page
    .getByRole("button", { name: "Initialize vault", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vault unlocked" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock vault", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vault locked" }),
  ).toBeVisible();
  await page
    .getByLabel("Master Password", { exact: true })
    .fill("Wrong-master-password");
  await page.getByRole("button", { name: "Unlock vault", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Wrong Master Password");
  await page.getByLabel("Master Password", { exact: true }).fill(master);
  await page.getByRole("button", { name: "Unlock vault", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vault unlocked" }),
  ).toBeVisible();
  async function add(site: string, user: string, password: string) {
    await page.getByLabel("Website", { exact: true }).fill(site);
    await page.getByLabel("Username", { exact: true }).fill(user);
    await page
      .getByLabel("Credential password", { exact: true })
      .fill(password);
    await page
      .getByRole("button", { name: "Save credential", exact: true })
      .click();
    await expect(
      page.getByTestId("credential").filter({ hasText: site }),
    ).toBeVisible();
  }
  await add(website, username, "Sunflower123");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Vault locked" }),
  ).toBeVisible();
  await expect(page.getByText(website, { exact: true })).toHaveCount(0);
  await page.getByLabel("Master Password", { exact: true }).fill(master);
  await page.getByRole("button", { name: "Unlock vault", exact: true }).click();
  let card = page.getByTestId("credential").filter({ hasText: website });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Reveal", exact: true }).click();
  await expect(card.getByTestId("password")).toHaveText("Sunflower123");
  await card.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(card.getByTestId("password")).not.toHaveText("Sunflower123");
  await card
    .getByRole("button", { name: "Copy username", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    username,
  );
  await card
    .getByRole("button", { name: "Copy password", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Sunflower123",
  );
  await page.getByLabel("Search locally").fill("absent");
  await expect(page.getByTestId("credential")).toHaveCount(0);
  await page.getByLabel("Search locally").fill(username);
  await expect(card).toBeVisible();
  await page.getByLabel("Search locally").fill("");
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Website", { exact: true })
    .fill("updated-private.example");
  await page
    .getByLabel("Credential password", { exact: true })
    .fill("sunflower!");
  await page
    .getByRole("button", { name: "Save credential", exact: true })
    .click();
  card = page
    .getByTestId("credential")
    .filter({ hasText: "updated-private.example" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Reveal", exact: true }).click();
  await expect(card.getByTestId("password")).toHaveText("sunflower!");
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByTestId("credential")).toHaveCount(0);
  await add("audit-one.example", "user-one", "Sunflower123");
  await add("audit-two.example", "user-two", "Sunflower123");
  await add("audit-three.example", "user-three", "sunflower!");
  const before = requests.length;
  expect(hibpRequests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Run local audit", exact: true })
    .click();
  await expect(page.getByTestId("audit-results")).toContainText(
    "Exact password reuse",
  );
  await expect(page.getByTestId("audit-results")).toContainText(
    "Similar pattern",
  );
  await expect(page.getByTestId("audit-results")).toContainText("High");
  await expect(page.getByRole("status")).toHaveText("Audit complete");
  await expect(page.getByTestId("audit-results")).toContainText(
    "High Risk — 42 occurrences",
  );
  await expect(page.getByTestId("audit-results")).toContainText(
    "Not found in HIBP",
  );
  expect(hibpRequests).toHaveLength(2);
  expect(
    requests
      .slice(before)
      .every((request) =>
        request.url.startsWith("https://api.pwnedpasswords.com/range/"),
      ),
  ).toBe(true);
  expect(JSON.stringify(requests)).not.toContain(breachedHash);
  await page
    .getByRole("button", { name: "Run local audit", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Audit complete");
  expect(hibpRequests).toHaveLength(2);
  // Lock clears the prefix cache; an outage must preserve the local audit.
  await page.getByRole("button", { name: "Lock vault", exact: true }).click();
  await page.getByLabel("Master Password", { exact: true }).fill(master);
  await page.getByRole("button", { name: "Unlock vault", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vault unlocked" }),
  ).toBeVisible();
  hibpUnavailable = true;
  await page
    .getByRole("button", { name: "Run local audit", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Audit complete");
  await expect(page.getByTestId("audit-results")).toContainText(
    "Unavailable — not checked",
  );
  await expect(page.getByTestId("audit-results")).toContainText(
    "Exact password reuse",
  );
  const storage = await page.evaluate(async () => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
    indexedDB: await indexedDB.databases(),
    caches: await caches.keys(),
    cookie: document.cookie,
  }));
  expect(storage).toEqual({
    local: [],
    session: [],
    indexedDB: [],
    caches: [],
    cookie: "",
  });
  const cookies = await context.cookies();
  expect(cookies).toHaveLength(1);
  expect(cookies[0]?.httpOnly).toBe(true);
  expect(cookies[0]?.sameSite).toBe("Strict");
  const forbidden = [
    master,
    website,
    username,
    "Sunflower123",
    "sunflower!",
    "updated-private.example",
  ];
  for (const value of forbidden)
    expect(JSON.stringify(requests)).not.toContain(value);
  for (const value of [...forbidden, login])
    expect(consoleMessages.join("\n")).not.toContain(value);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = (
      await pool.query("SELECT * FROM users WHERE email=$1", [email])
    ).rows[0];
    const snapshot = JSON.stringify({
      user,
      vault: (
        await pool.query("SELECT * FROM vaults WHERE user_id=$1", [user.id])
      ).rows,
      credentials: (
        await pool.query("SELECT * FROM credentials WHERE user_id=$1", [
          user.id,
        ])
      ).rows,
      sessions: (
        await pool.query("SELECT * FROM sessions WHERE user_id=$1", [user.id])
      ).rows,
    });
    for (const value of [...forbidden, login, cookies[0]!.value])
      expect(snapshot).not.toContain(value);
    for (const file of [
      "api.stdout.log",
      "api.stderr.log",
      "web.stdout.log",
      "web.stderr.log",
      "postgres.log",
    ]) {
      const content = await readFile(`.runtime/${file}`, "utf8");
      for (const value of [...forbidden, login])
        expect(content).not.toContain(value);
    }
    await page.getByRole("button", { name: "Lock vault", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Vault locked" }),
    ).toBeVisible();
    await expect(page.getByTestId("audit-results")).toHaveCount(0);
    await expect(page.getByTestId("credential")).toHaveCount(0);
    await expect(
      page.getByLabel("Master Password", { exact: true }),
    ).toHaveValue("");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Log in", exact: true }),
    ).toBeVisible();
    expect(await context.cookies()).toHaveLength(0);
  } finally {
    await pool.query("DELETE FROM users WHERE email=$1", [email]);
    await pool.end();
    await page.evaluate(() => navigator.clipboard.writeText(""));
  }
});
