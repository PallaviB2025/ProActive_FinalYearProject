import { auth, signIn, signOut } from "../../auth";
import Image from "next/image";

export default async function LoginButton() {
  const session = await auth();

  /* ── Signed In ─────────────────────────────────────────────── */
  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={36}
            height={36}
            className="rounded-full ring-2 ring-white shadow-sm flex-none"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center ring-2 ring-white shadow-sm flex-none select-none">
            {session.user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
        )}

        {/* Name + email */}
        <div className="hidden sm:block leading-tight overflow-hidden">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {session.user.name}
          </p>
          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
            {session.user.email}
          </p>
        </div>

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  /* ── Signed Out ─────────────────────────────────────────────── */
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
      >
        {/* Official Google "G" logo */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="flex-none"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>
    </form>
  );
}
