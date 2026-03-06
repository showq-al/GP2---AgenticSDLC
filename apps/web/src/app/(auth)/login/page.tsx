"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") ? r : "/dashboard/chat";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to lowercase as user types
    setEmail(e.target.value.toLowerCase());
  };

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      // Normalize email to lowercase before validation
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        setMsg("Please enter a valid email address");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        // Check if error is due to unverified email
        if (
          error.message.includes("Email not confirmed") ||
          error.message.includes("email_not_confirmed") ||
          error.message.includes("unverified")
        ) {
          setMsg(
            "Please verify your email first. Check your inbox for the verification code."
          );
        } else {
          setMsg(error.message);
        }
        return;
      }

      // Double-check: verify the user's email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setMsg(
          "Your email is not verified. Please complete email verification first."
        );
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
      {/* Plasma background */}
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

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo + title */}
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

            <p className="text-sm text-gray-400">
              Sign in to your account
            </p>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            <form onSubmit={onLogin} className="space-y-4">
              {/* Email */}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={handleEmailChange}
                required
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Forgot password */}
              <div className="text-xs">
                <Link
                  href="/forgot-password"
                  className="text-purple-300 hover:text-purple-200"
                >
                  Forgot password?
                </Link>
              </div>

              {msg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {msg}
                </div>
              )}

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-lg bg-purple-600/80 py-2.5 text-white text-sm font-medium hover:bg-purple-600 transition disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              {/* Sign up */}
              <div className="pt-3 text-center text-xs text-gray-300">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}