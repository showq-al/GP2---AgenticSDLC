"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace("/signup");
    }
  }, [email, router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    if (!code || code.length < 6) {
      setMsg("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setMsg(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        setMsg(error.message);
      } else {
        setMsg("Verification code sent! Please check your email.");
      }
    } finally {
      setResending(false);
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
            <p className="text-sm text-gray-400">Check your inbox</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-xs text-gray-400">
                Enter the verification code we just sent to{" "}
                <span className="text-white font-medium break-all">
                  {email}
                </span>
              </p>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm text-gray-300">
                  Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(value);
                  }}
                  required
                  autoComplete="one-time-code"
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
              </div>

              {msg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full mt-2 rounded-lg bg-purple-600/80 py-2.5 text-white text-sm font-medium hover:bg-purple-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Sign up"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-purple-300 hover:text-purple-200 underline disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
              </div>

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
