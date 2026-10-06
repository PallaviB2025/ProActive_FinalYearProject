export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (typeof window !== "undefined"
      ? "/api"
      : "http://127.0.0.1:4000");
  const headers: Record<string, string> = {};
  if (method !== "GET" && method !== "HEAD") {
    headers["X-Proactive-CSRF"] = "1";
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(response.status, result?.error ?? (response.status === 429
      ? "Too many requests. Wait a minute before retrying." : "Request failed"));
  return result as T;
}
