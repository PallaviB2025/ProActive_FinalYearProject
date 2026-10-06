import { NextResponse, type NextRequest } from "next/server";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  const wantsJson = req.headers.get("accept")?.includes("application/json");

  // If there's no NextAuth session, return unauthenticated
  if (!session?.user?.email) {
    return wantsJson
      ? NextResponse.json({ authenticated: false, error: "No NextAuth session" }, { status: 401 })
      : NextResponse.redirect(new URL("/", req.url));
  }

  const email = session.user.email.toLowerCase().trim();

  try {
    const apiUrl = process.env.API_ORIGIN ?? "https://proactive-api-pallavib2025.vercel.app";
    console.log(`[google-session] Syncing user ${email} with backend at: ${apiUrl}`);

    // Call real Express backend /auth/google-sync
    const resp = await fetch(`${apiUrl}/auth/google-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proactive-CSRF": "1",
      },
      body: JSON.stringify({ email }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[google-session] Backend sync error: ${resp.status} - ${errText}`);
      return wantsJson
        ? NextResponse.json({ authenticated: false, error: `Backend sync error: ${resp.status}` }, { status: 401 })
        : NextResponse.redirect(new URL("/", req.url));
    }

    const data = (await resp.json()) as { id: string; email: string; token: string };

    // Query vault status to check if user already has an active vault
    let hasVault = false;
    let metadata = null;
    try {
      const vaultResp = await fetch(`${apiUrl}/vault`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
          "X-Proactive-Session": data.token,
        },
      });
      if (vaultResp.ok) {
        const vData = (await vaultResp.json()) as { metadata: unknown };
        if (vData?.metadata) {
          hasVault = true;
          metadata = vData.metadata;
        }
      }
    } catch (vErr) {
      console.warn("[google-session] Vault check warning:", vErr);
    }

    const response = wantsJson
      ? NextResponse.json({
          authenticated: true,
          verified: true,
          token: data.token,
          hasVault,
          metadata,
          user: {
            id: data.id,
            email: data.email,
            name: session.user.name ?? data.email.split("@")[0],
          },
        })
      : NextResponse.redirect(new URL("/", req.url));

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

    // Set real verified database session cookie
    response.cookies.set("proactive_session", data.token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
    });

    if (isProduction) {
      response.cookies.set("__Host-proactive_session", data.token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60,
        path: "/",
        sameSite: "lax",
        secure: true,
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[google-session] Fatal sync error:`, message);
    return wantsJson
      ? NextResponse.json({ authenticated: false, error: message }, { status: 500 })
      : NextResponse.redirect(new URL("/", req.url));
  }
}
