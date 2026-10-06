export type BreachStatus =
  | { status: "breached"; count: number }
  | { status: "not-found" }
  | { status: "unavailable" };

// Reject partial/malformed data rather than reporting a false negative.
export function parseRange(body: string): Map<string, number> {
  if (!body.trim() || body.length > 2_000_000) throw new Error("Invalid range");
  const entries = new Map<string, number>();
  for (const line of body.trim().split(/\r?\n/)) {
    const match = /^([A-Fa-f0-9]{35}):([0-9]+)$/.exec(line);
    if (!match) throw new Error("Invalid range");
    const suffix = match[1]!.toUpperCase();
    const count = Number(match[2]);
    if (!Number.isSafeInteger(count) || entries.has(suffix))
      throw new Error("Invalid range");
    entries.set(suffix, count);
  }
  return entries;
}

// One client per unlocked tab session. Only range responses are cached; never
// passwords, full hashes, or per-credential results. No persistent browser cache.
export class PwnedPasswordsClient {
  private cache = new Map<
    string,
    { expires: number; entries: Map<string, number> }
  >();
  private pending = new Map<string, Promise<Map<string, number>>>();
  private controllers = new Set<AbortController>();
  private queue: (() => void)[] = [];
  private active = 0;
  private disposed = false;

  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private timeoutMs = 8000,
  ) {}

  dispose() {
    this.disposed = true;
    this.cache.clear();
    this.pending.clear();
    for (const controller of this.controllers) controller.abort();
  }

  private async request(prefix: string): Promise<Map<string, number>> {
    if (this.active >= 3)
      await new Promise<void>((resolve) => this.queue.push(resolve));
    else this.active++;
    const controller = new AbortController();
    this.controllers.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (this.disposed) throw new Error("Cancelled");
      const cancelled = new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(new Error("Unavailable")),
          { once: true },
        );
        timer = setTimeout(() => controller.abort(), this.timeoutMs);
      });
      const response = await Promise.race([
        (async () => {
          const result = await this.fetcher(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
              method: "GET",
              headers: { "Add-Padding": "true" },
              credentials: "omit",
              referrerPolicy: "no-referrer",
              cache: "no-store",
              redirect: "error",
              signal: controller.signal,
            },
          );
          if (result.status !== 200) throw new Error("Unavailable");
          return parseRange(await result.text());
        })(),
        cancelled,
      ]);
      if (this.disposed) throw new Error("Cancelled");
      if (this.cache.size >= 128)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(prefix, {
        expires: Date.now() + 5 * 60_000,
        entries: response,
      });
      return response;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }

  private range(prefix: string): Promise<Map<string, number>> {
    const cached = this.cache.get(prefix);
    if (cached && cached.expires > Date.now())
      return Promise.resolve(cached.entries);
    this.cache.delete(prefix);
    const pending = this.pending.get(prefix);
    if (pending) return pending;
    const request = this.request(prefix).finally(() =>
      this.pending.delete(prefix),
    );
    this.pending.set(prefix, request);
    return request;
  }

  async check(password: string): Promise<BreachStatus> {
    try {
      if (this.disposed) return { status: "unavailable" };
      const digest = await crypto.subtle.digest(
        "SHA-1",
        new TextEncoder().encode(password),
      );
      const hex = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      )
        .join("")
        .toUpperCase();
      if (this.disposed) return { status: "unavailable" };
      const count = (await this.range(hex.slice(0, 5))).get(hex.slice(5)) ?? 0;
      return count > 0
        ? { status: "breached", count }
        : { status: "not-found" };
    } catch {
      // Never propagate a remote response or an error containing sensitive input.
      return { status: "unavailable" };
    }
  }
}
