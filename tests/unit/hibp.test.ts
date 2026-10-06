import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRange, PwnedPasswordsClient } from "../../apps/web/lib/hibp";
import { auditWithBreaches } from "../../apps/web/lib/audit";

const secret = "Phase5-private-password-!938";
const hash = (value: string) =>
  createHash("sha1").update(value).digest("hex").toUpperCase();
const suffix = hash(secret).slice(5);
const body = `${suffix}:42\r\n${"0".repeat(35)}:0\r\n`;
const mock = (text = body) =>
  vi.fn<typeof fetch>().mockImplementation(async () => new Response(text));
afterEach(() => vi.restoreAllMocks());

describe("HIBP Phase 5", () => {
  it("matches breached passwords and reports occurrence count", async () => {
    expect(await new PwnedPasswordsClient(mock()).check(secret)).toEqual({
      status: "breached",
      count: 42,
    });
  });
  it("returns not-found for a non-match", async () => {
    expect(
      await new PwnedPasswordsClient(mock()).check("different-password"),
    ).toEqual({ status: "not-found" });
  });
  it("parses CRLF, LF, lowercase hex, counts and zero-count padding", () => {
    expect(
      parseRange(`${suffix.toLowerCase()}:42\n${"0".repeat(35)}:0\n`).get(
        suffix,
      ),
    ).toBe(42);
    expect(parseRange(body).get("0".repeat(35))).toBe(0);
  });
  it("does not treat padding as a breach", async () => {
    expect(
      await new PwnedPasswordsClient(mock(`${suffix}:0`)).check(secret),
    ).toEqual({ status: "not-found" });
  });
  it("transmits exactly five uppercase characters, never plaintext or the full hash", async () => {
    const fetcher = mock();
    await new PwnedPasswordsClient(fetcher).check(secret);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      `https://api.pwnedpasswords.com/range/${hash(secret).slice(0, 5)}`,
    );
    expect(String(url)).toMatch(/\/range\/[A-F0-9]{5}$/);
    expect(options).toMatchObject({
      method: "GET",
      headers: { "Add-Padding": "true" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "error",
    });
    expect(options?.body).toBeUndefined();
    const sent = JSON.stringify(fetcher.mock.calls);
    expect(sent).not.toContain(secret);
    expect(sent).not.toContain(hash(secret));
    expect(sent).not.toContain(suffix);
  });
  it("reuses a successful cached range", async () => {
    const fetcher = mock();
    const client = new PwnedPasswordsClient(fetcher);
    await client.check(secret);
    await client.check(secret);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("coalesces simultaneous duplicate-prefix requests", async () => {
    const fetcher = mock();
    const client = new PwnedPasswordsClient(fetcher);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => client.check(secret)),
    );
    expect(results.every((result) => result.status === "breached")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("matches distinct suffixes locally for two passwords sharing a prefix", async () => {
    const seen = new Map<string, string>();
    let pair: [string, string] | undefined;
    for (let i = 0; i < 10000; i++) {
      const value = `prefix-collision-${i}`;
      const prefix = hash(value).slice(0, 5);
      const previous = seen.get(prefix);
      if (previous) {
        pair = [previous, value];
        break;
      }
      seen.set(prefix, value);
    }
    expect(pair).toBeDefined();
    const [first, second] = pair!;
    const fetcher = mock(`${hash(first).slice(5)}:7`);
    const client = new PwnedPasswordsClient(fetcher);
    expect(
      await Promise.all([client.check(first), client.check(second)]),
    ).toEqual([{ status: "breached", count: 7 }, { status: "not-found" }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("limits concurrent range requests to three", async () => {
    let active = 0;
    let peak = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return new Response(body);
    });
    const client = new PwnedPasswordsClient(fetcher);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => client.check(`unique-${i}`)),
    );
    expect(peak).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(10);
  });
  it("times out and aborts a stalled request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => {}));
    expect(await new PwnedPasswordsClient(fetcher, 10).check(secret)).toEqual({
      status: "unavailable",
    });
    expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
  });
  it("times out a stalled response body", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new ReadableStream()));
    expect(await new PwnedPasswordsClient(fetcher, 10).check(secret)).toEqual({
      status: "unavailable",
    });
  });
  it("handles network failure without exposing errors and allows retry", async () => {
    const fetcher = mock().mockRejectedValueOnce(new Error(secret));
    const client = new PwnedPasswordsClient(fetcher);
    expect(await client.check(secret)).toEqual({ status: "unavailable" });
    expect(await client.check(secret)).toEqual({
      status: "breached",
      count: 42,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([404, 429, 503])("degrades on HTTP %s", async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(body, { status }));
    expect(await new PwnedPasswordsClient(fetcher).check(secret)).toEqual({
      status: "unavailable",
    });
  });
  it.each([
    "",
    "<html>unavailable</html>",
    `${suffix}:bad`,
    `${suffix}:-1`,
    `${suffix}:1.5`,
    `${suffix}:9007199254740992`,
    "ABC:4",
    `${suffix}:2\ninvalid`,
    `${suffix}:1\n${suffix}:2`,
  ])("rejects malformed response %s", async (text) => {
    expect(() => parseRange(text)).toThrow("Invalid range");
    expect(await new PwnedPasswordsClient(mock(text)).check(secret)).toEqual({
      status: "unavailable",
    });
  });
  it("expires cached responses after five minutes", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const fetcher = mock();
    const client = new PwnedPasswordsClient(fetcher);
    await client.check(secret);
    clock.mockReturnValue(now + 300001);
    await client.check(secret);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("disposal aborts active work and prevents queued or future requests", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => {}));
    const client = new PwnedPasswordsClient(fetcher);
    const checks = Promise.all(
      Array.from({ length: 6 }, (_, i) => client.check(`cancel-${i}`)),
    );
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    client.dispose();
    expect(
      (await checks).every((value) => value.status === "unavailable"),
    ).toBe(true);
    expect(await client.check(secret)).toEqual({ status: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("marks breaches High and serializes no password or hash in findings", async () => {
    const result = await auditWithBreaches(
      [{ id: "1", website: "example.org", username: "user", password: secret }],
      new PwnedPasswordsClient(mock()),
    );
    expect(result[0]).toMatchObject({
      severity: "High",
      breach: { status: "breached", count: 42 },
    });
    expect(result[0]!.actions.join(" ")).toContain(
      "Change this password immediately",
    );
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain(hash(secret));
  });
  it("preserves local audit findings when HIBP is unavailable", async () => {
    const fetcher = mock().mockRejectedValue(new Error("offline"));
    const result = await auditWithBreaches(
      ["1", "2"].map((id) => ({
        id,
        website: "example.org",
        username: "user",
        password: "password",
      })),
      new PwnedPasswordsClient(fetcher),
    );
    expect(
      result.every(
        (value) =>
          value.severity === "High" &&
          value.reasons.includes("Exact password reuse") &&
          value.breach?.status === "unavailable",
      ),
    ).toBe(true);
    expect(result[0]!.actions.join(" ")).toContain("retry the audit later");
  });
});
