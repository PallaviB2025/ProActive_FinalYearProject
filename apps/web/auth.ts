import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * NextAuth / Auth.js v5 Configuration
 *
 * Configures Google OAuth with JWT session strategy, host trust for localhost/proxies,
 * and explicit environment variable mapping for production deployments (e.g., Vercel).
 */
export const config: NextAuthConfig = {
  // Trust localhost / reverse proxies / Vercel deployment URLs
  trustHost: true,

  // Explicit secret mapping for Auth.js session signing
  secret: process.env.AUTH_SECRET,

  // OAuth Providers
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],

  // Stateless JWT session strategy
  session: {
    strategy: "jwt",
  },

  // Auth Lifecycle Callbacks
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) return isLoggedIn;
      return true;
    },
    session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

// Export modular Auth handlers and helpers
export const { handlers, auth, signIn, signOut } = NextAuth(config);
