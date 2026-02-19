"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: HAS_UPPERCASE.test(password),
    hasLowercase: HAS_LOWERCASE.test(password),
    hasNumber: HAS_NUMBER.test(password),
    hasSpecial: HAS_SPECIAL.test(password),
  };
}

function allPasswordChecksPass(checks: ReturnType<typeof getPasswordChecks>) {
  return Object.values(checks).every(Boolean);
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") ? r : "/";
  }, [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () => getPasswordChecks(password),
    [password]
  );
  const passwordValid = useMemo(
    () => allPasswordChecksPass(passwordChecks),
    [passwordChecks]
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    if (!passwordValid) {
      setMsg("Please meet all password requirements.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Plasma
          color="#8B5CF6"
          speed={0.3}
          direction="forward"
          scale={1.5}
          opacity={0.3}
          mouseInteractive={true}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-1">
              <img
                src="/images/AgenticSDLCLogo.png"
                alt="AgenticSDLC Logo"
                width={70}
              />
              <h1 className="text-4xl font-medium tracking-wide text-white">
                AgenticSDLC
              </h1>
            </div>
            <p className="text-sm text-gray-400">Create your account</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
                <ul className="text-xs text-gray-400 space-y-1">
                  <li
                    className={
                      passwordChecks.minLength ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.minLength ? "✓" : "○"} 8 characters or more
                  </li>
                  <li
                    className={
                      passwordChecks.hasUppercase ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.hasUppercase ? "✓" : "○"} One uppercase
                    letter
                  </li>
                  <li
                    className={
                      passwordChecks.hasLowercase ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.hasLowercase ? "✓" : "○"} One lowercase
                    letter
                  </li>
                  <li
                    className={
                      passwordChecks.hasNumber ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.hasNumber ? "✓" : "○"} One number
                  </li>
                  <li
                    className={
                      passwordChecks.hasSpecial ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.hasSpecial ? "✓" : "○"} One special
                    character (!@#$%^&* etc.)
                  </li>
                </ul>
              </div>

              {msg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !passwordValid}
                className="w-full mt-2 rounded-lg bg-purple-600/80 py-2.5 text-white text-sm font-medium hover:bg-purple-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>

              <div className="pt-3 text-center text-xs text-gray-300">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
