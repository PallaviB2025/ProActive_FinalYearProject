"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useVault } from "../../lib/vault-context";

export function AuthCard() {
  const { authenticate, busy, setMessage } = useVault();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleTabSwitch = (isReg: boolean) => {
    setRegister(isReg);
    setEmail("");
    setPassword("");
    setMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await authenticate(email.trim(), password, register);
  };

  return (
    <section className="auth-journey">
      <div className="auth-context">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-mono font-semibold tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            Zero-Knowledge Architecture
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Security that stays in your hands.
          </h2>
          <p className="mt-4 text-sm text-slate-300 font-normal leading-relaxed">
            ProActive keeps encrypted vault records completely separate from your master credentials. Your plaintext secrets never touch our servers.
          </p>
        </div>
        <ul className="auth-principles mt-8 space-y-3" aria-label="Security principles">
          <li className="flex items-center gap-2.5 text-xs text-slate-200">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Client-side AES-256-GCM encryption</span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-slate-200">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Argon2id & PBKDF2-SHA256 derivation</span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-slate-200">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Automated breach intelligence via k-anonymity</span>
          </li>
        </ul>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card w-full">
          {/* Segmented Pill Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleTabSwitch(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !register
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                register
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {register ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {register
                  ? "Register with email and password to start your secure encrypted vault."
                  : "Sign in with your email and password to open your vault."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="text-xs text-slate-700 font-semibold mb-1.5 block">
                  Email Address
                </label>
                <input
                  name="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold mb-1.5 block">
                  {register ? "Account Password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    name="user-secret-field"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={256}
                    placeholder={register ? "At least 12 characters" : "Enter your password"}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {register && (
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">ℹ</span>
                    At least 12 characters, including uppercase, lowercase, and a number.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2"
              >
                {busy
                  ? "Processing..."
                  : register
                  ? "Create Account & Open Vault"
                  : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={() => signIn("google", { redirectTo: "/" })}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              {/* Official Google "G" logo */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                disabled={busy}
                onClick={() => handleTabSwitch(!register)}
              >
                {register
                  ? "Already have an account? Sign in here"
                  : "Need an account? Click here to Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
