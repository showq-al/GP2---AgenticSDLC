"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function PlasmaBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070510]" />
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-purple-600/35 blur-3xl" />
      <div className="absolute top-10 -right-40 h-[560px] w-[560px] rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute bottom-[-220px] left-1/3 h-[640px] w-[640px] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/45" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
//Need to determine where to redirect after login
  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      // Successful login -redirect to "dashboard""
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full">
      <PlasmaBackground />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-start justify-center px-6 pt-24 md:items-center md:pt-0">
        <div className="w-full max-w-[560px]">
          {/* Logo + Title */}
          <div className="mb-8 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-black/35 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-purple-300 text-xl">∞</span>
            </div>
            <h1 className="text-5xl font-light tracking-wide">AgenticSDLC</h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white/10 p-8 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
            <h2 className="mb-7 text-center text-lg font-medium text-white/90">
              Sign in to your account
            </h2>

            <form onSubmit={onLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70">
                  Email address
                </label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder=""
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70">
                  Password
                </label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder=""
                />

                <div className="pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-purple-200/80 hover:text-purple-200 underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {msg && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-purple-600/60 px-4 py-3 font-medium text-white shadow-lg shadow-purple-900/30 ring-1 ring-white/10 transition hover:bg-purple-600/75 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="pt-3 text-center text-xs text-white/70">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-purple-200/90 hover:text-purple-200 underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-6 h-px w-full bg-white/10" />
        </div>
      </div>
    </main>
  );
}
