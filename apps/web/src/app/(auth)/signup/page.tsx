"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Plasma from "../../../components/ui/Plasma";
import { supabase } from "../../../lib/supabase";

// Name validation: letters and spaces only, 2-50 chars
const NAME_PATTERN = /^[A-Za-z\s]+$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

// Password validation: 8+ chars, uppercase, lowercase, number, special character, NO spaces
const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const HAS_SPACE = /\s/;

function validateName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${NAME_MIN_LENGTH} characters` };
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be no more than ${NAME_MAX_LENGTH} characters` };
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters and spaces" };
  }
  return { valid: true, error: null };
}

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameValidation = useMemo(() => validateName(name), [name]);
  const passwordChecks = useMemo(
    () => getPasswordChecks(password),
    [password]
  );
  const passwordValid = useMemo(
    () => allPasswordChecksPass(passwordChecks),
    [passwordChecks]
  );
  const passwordsMatch = useMemo(
    () => password === confirmPassword && confirmPassword.length > 0,
    [password, confirmPassword]
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow letters and spaces
    if (value === "" || /^[A-Za-z\s]*$/.test(value)) {
      setName(value);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to lowercase as user types
    setEmail(e.target.value.toLowerCase());
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);

    // Validate name
    if (!nameValidation.valid) {
      setMsg(nameValidation.error || "Invalid name");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      setMsg("Please enter a valid email address");
      return;
    }

    // Validate password
    if (!passwordValid) {
      setMsg("Please meet all password requirements.");
      return;
    }

    // Validate confirm password
    if (!passwordsMatch) {
      setMsg("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        // Log full error for debugging
        console.log("Signup error details:", {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
          name: (error as any).name,
          fullError: JSON.stringify(error, null, 2),
        });

        const errorMessage = (error.message || "").toLowerCase();
        const errorCode = ((error as any).code || "").toLowerCase();
        const statusCode = (error as any).status;
        const errorName = ((error as any).name || "").toLowerCase();
        
        // Check all possible indicators that email already exists
        const isEmailExistsError =
          // Error codes
          errorCode === "user_already_exists" ||
          errorCode === "email_already_registered" ||
          errorCode === "signup_disabled" ||
          errorName === "authuseralreadyregistered" ||
          // Status codes
          statusCode === 422 ||
          statusCode === 400 ||
          // Error messages (comprehensive)
          /already.*registered/i.test(errorMessage) ||
          /already.*exists/i.test(errorMessage) ||
          /user.*already/i.test(errorMessage) ||
          /email.*already/i.test(errorMessage) ||
          /email.*taken/i.test(errorMessage) ||
          /email.*registered/i.test(errorMessage) ||
          errorMessage.includes("user already registered") ||
          errorMessage.includes("email address is already registered") ||
          errorMessage.includes("an account with this email already exists");

        if (isEmailExistsError) {
          setMsg("This email is already registered. Please sign in instead.");
        } else {
          // Show the actual error message so we can debug
          setMsg(error.message);
        }
        return;
      }
      
      // Supabase returns an existing user with empty identities array when email is already registered
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMsg("This email is already registered. Please sign in instead.");
        return;
      }

      // Check if user already exists and is verified
      if (data?.user?.email_confirmed_at) {
        setMsg("This email is already registered and verified. Please sign in instead.");
        return;
      }

      // Success: redirect to verification (handles both new signups and unverified existing emails)
      router.replace(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: any) {
      // Catch any unexpected errors
      console.log("Signup exception:", err);
      const errorMessage = (err?.message || String(err) || "").toLowerCase();
      if (
        /already.*registered|already exists|user.*exists|email.*taken/i.test(errorMessage)
      ) {
        setMsg("This email is already registered. Please sign in instead.");
      } else {
        setMsg(err?.message || "An error occurred. Please try again.");
      }
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
              <div>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={handleNameChange}
                  required
                  autoComplete="name"
                  maxLength={NAME_MAX_LENGTH}
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
                {name.length > 0 && !nameValidation.valid && (
                  <p className="text-xs text-red-400 mt-1">{nameValidation.error}</p>
                )}
              </div>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={handleEmailChange}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={handlePasswordChange}
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
                  <li
                    className={
                      passwordChecks.noSpaces ? "text-emerald-400/90" : ""
                    }
                  >
                    {passwordChecks.noSpaces ? "✓" : "○"} No spaces allowed
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
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
                disabled={
                  loading ||
                  !nameValidation.valid ||
                  !passwordValid ||
                  !passwordsMatch
                }
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
