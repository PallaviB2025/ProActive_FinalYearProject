"use server";

import { signIn } from "../auth";

export async function signInWithGoogle() {
  // Redirect to bridge route which syncs Google session → Express session → then sends to /
  await signIn("google", { redirectTo: "/api/auth/google-session" });
}
