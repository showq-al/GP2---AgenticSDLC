"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const HAS_SPACE = /\s/;

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: HAS_UPPERCASE.test(password),
    hasLowercase: HAS_LOWERCASE.test(password),
    hasNumber: HAS_NUMBER.test(password),
    hasSpecial: HAS_SPECIAL.test(password),
    noSpaces: !HAS_SPACE.test(password),
  };
}
function allPasswordChecksPass(checks: ReturnType<typeof getPasswordChecks>) {
  return Object.values(checks).every(Boolean);
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordValid = useMemo(
    () => allPasswordChecksPass(passwordChecks),
    [passwordChecks]
  );
  const passwordsMatch = useMemo(
    () => password === confirm && confirm.length > 0,
    [password, confirm]
  );

  const canSubmit = passwordValid && passwordsMatch;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    if (!passwordValid) {
      setMsg("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: userErr } = await supabase.auth.getUser();

      if (userErr) {
        setMsg("Your reset session is missing/expired. Please request a new code.");
        return;
      }
      if (!data.user) {
        setMsg("Your reset session is missing/expired. Please request a new code.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMsg(error.message);
        return;
      }

      await supabase.auth.signOut();
      router.replace("/login");
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
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-medium tracking-wide text-white">
              Set a new password
            </h1>
            <p className="text-sm text-gray-400">
              Choose a new password for your account.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />

                <ul className="text-xs text-gray-400 space-y-1">
                  <li className={passwordChecks.minLength ? "text-emerald-400/90" : ""}>
                    {passwordChecks.minLength ? "✓" : "○"} 8 characters or more
                  </li>
                  <li className={passwordChecks.hasUppercase ? "text-emerald-400/90" : ""}>
                    {passwordChecks.hasUppercase ? "✓" : "○"} One uppercase letter
                  </li>
                  <li className={passwordChecks.hasLowercase ? "text-emerald-400/90" : ""}>
                    {passwordChecks.hasLowercase ? "✓" : "○"} One lowercase letter
                  </li>
                  <li className={passwordChecks.hasNumber ? "text-emerald-400/90" : ""}>
                    {passwordChecks.hasNumber ? "✓" : "○"} One number
                  </li>
                  <li className={passwordChecks.hasSpecial ? "text-emerald-400/90" : ""}>
                    {passwordChecks.hasSpecial ? "✓" : "○"} One special character
                  </li>
                  <li className={passwordChecks.noSpaces ? "text-emerald-400/90" : ""}>
                    {passwordChecks.noSpaces ? "✓" : "○"} No spaces allowed
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {msg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full mt-2 rounded-lg bg-purple-600/80 py-2.5 text-white text-sm font-medium hover:bg-purple-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              <div className="pt-3 text-center text-xs text-gray-300">
                Back to{" "}
                <Link
                  href="/login"
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}