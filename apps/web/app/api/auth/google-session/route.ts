import { NextResponse, type NextRequest } from "next/server";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  const wantsJson = req.headers.get("accept")?.includes("application/json");
  const redirectHome = wantsJson
    ? NextResponse.json({ authenticated: false }, { status: 401 })
    : NextResponse.redirect(new URL("/", req.url));

  if (!session?.user?.email) {
    return redirectHome;
  }

  try {
    // Exchange Google session for an Express session token
    const apiUrl = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";
    const resp = await fetch(`${apiUrl}/auth/google-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proactive-CSRF": "1",
      },
      body: JSON.stringify({ email: session.user.email }),
    });

    if (!resp.ok) {
      console.error("[google-session] Express sync failed:", resp.status);
      return redirectHome;
    }

    const data = (await resp.json()) as { token: string };
    const response = wantsJson
      ? NextResponse.json({ authenticated: true, user: session.user })
      : NextResponse.redirect(new URL("/", req.url));

    const isProduction = process.env.NODE_ENV === "production";

    // Set the proactive_session cookie so vault-context /auth/me works
    response.cookies.set("proactive_session", data.token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
      sameSite: "lax",
      secure: isProduction,
    });

    if (isProduction) {
      response.cookies.set("__Host-proactive_session", data.token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60, // 8 hours
        path: "/",
        sameSite: "lax",
        secure: true,
      });
    }

    return response;
  } catch (err) {
    console.error("[google-session] Error:", err);
    return redirectHome;
  }
}
