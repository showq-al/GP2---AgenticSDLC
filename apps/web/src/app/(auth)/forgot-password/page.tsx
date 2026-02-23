"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        const msgLower = (error.message || "").toLowerCase();

        console.log("Forgot password OTP error:", error.message);

        if (msgLower.includes("rate limit") || msgLower.includes("too many requests")) {
          setMsg("Too many attempts. Please wait a few minutes and try again.");
          return;
        }

        // IMPORTANT:
        // This error often appears when the email doesn't exist OR OTP signup is disabled.
        // Best practice: do NOT reveal if the email exists.
        if (msgLower.includes("signups not allowed for otp")) {
          setMsg("If an account exists for this email, we sent a 6-digit code.");
          return;
        }

        // Optional: if you still want a “not found” message (NOT recommended for security),
        // you can keep this. But Supabase usually doesn't reliably return "user not found".
        if (
          msgLower.includes("user not found") ||
          msgLower.includes("invalid login credentials")
        ) {
          setMsg("No account found for this email.");
          return;
        }

        setMsg("Could not send code. Please try again.");
        return;
      }

      // Success
      setMsg("If an account exists for this email, we sent a 6-digit code.");
      router.push(
        `/verify-otp?type=recovery&email=${encodeURIComponent(normalizedEmail)}`
      );
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
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-medium tracking-wide text-white">
              Reset password
            </h1>
            <p className="text-sm text-gray-400">
              Enter your email to receive a 6-digit OTP code.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

              {msg && (
                <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-lg bg-purple-600/80 py-2.5 text-white text-sm font-medium hover:bg-purple-600 transition disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send code"}
              </button>

              <div className="pt-3 text-center text-xs text-gray-300">
                Remembered your password?{" "}
                <Link
                  href="/login"
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  Back to login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
