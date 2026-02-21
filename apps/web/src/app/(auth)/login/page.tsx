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
    return r && r.startsWith("/") ? r : "/";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

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