"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import Squares from "../components/ui/Squares";
import BackgroundDoodles from "../components/sections/BackgroundDoodles";
import TargetCursor from "../components/ui/TargetCursor";
import IrisOpenOnMount from "../components/ui/IrisOpenOnMount";
import { playSfx } from "../components/ui/sfx";
import { registerUserAction } from "@/actions/auth/register";
import { signInUserAction } from "@/actions/auth/sign-in";
import type { AuthMode } from "@/types/auth";
import { encodeStateParam } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerModalMessage, setRegisterModalMessage] = useState<string>("");
  const heading = authMode === "sign-in" ? "Sign in to AlgoHub" : "Create your AlgoHub account";
  const description =
    authMode === "sign-in"
      ? "Access your saved lessons, track progress, and pick up right where you left off."
      : "Start fresh with a new AlgoHub account to save progress, earn badges, and unlock exclusive lessons.";

  const handleButtonHover = useCallback(() => {
    playSfx("/gun_sfx.mp3", 0.6);
  }, []);

  const maskEmail = useCallback((email: string) => email.replace(/(.{2}).+(@.+)/, "$1•••$2"), []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      setShowRegisterModal(false);

      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      const email = ((formData.get("email") as string | null) ?? "").trim();
      const password = (formData.get("password") as string | null) ?? "";
      const displayName = ((formData.get("display-name") as string | null) ?? "").trim();

      if (!email || !password) {
        setStatusMessage("Please provide both an email and password to continue.");
        return;
      }

      if (authMode === "register") {
        if (!displayName) {
          setStatusMessage("Add a display name so we can personalize your profile.");
          return;
        }

        const confirmPassword = (formData.get("confirm-password") as string | null) ?? "";
        if (password !== confirmPassword) {
          setStatusMessage("Those passwords don't match yet. Double-check and try again.");
          return;
        }
      }

      setIsSubmitting(true);
      setStatusMessage(authMode === "sign-in" ? "Checking your credentials..." : "Creating your AlgoHub account...");

      try {
        if (authMode === "register") {
          const result = await registerUserAction({ email, password, displayName });
          setStatusMessage(result.message);
          if (result.success) {
            setRegisterModalMessage(result.message || "Check your inbox to confirm your account.");
            setShowRegisterModal(true);
            formElement.reset();
          }
        } else {
          const result = await signInUserAction({ email, password });
          setStatusMessage(result.message);
          if (result.success) {
            if (result.session?.access_token && result.session.refresh_token) {
              try {
                const supabase = getSupabaseClient();
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: result.session.access_token,
                  refresh_token: result.session.refresh_token,
                });
                if (sessionError) {
                  console.error("Failed to persist Supabase session", sessionError);
                }
              } catch (sessionError) {
                console.error("Failed to persist Supabase session", sessionError);
              }
            } else {
              console.warn("Missing Supabase session tokens in sign-in result");
            }
            const profileName = result.profile?.displayName ?? result.email ?? maskEmail(email);
            setStatusMessage(result.message || `Welcome back, ${profileName}! Redirecting you to the hub...`);
            const profilePayload = result.profile ?? null;
            const authPayload = result.authUser ?? null;
            setTimeout(() => {
              const params = new URLSearchParams();
              if (authPayload) {
                params.set("auth", encodeStateParam(authPayload));
              }
              if (profilePayload) {
                params.set("profile", encodeStateParam(profilePayload));
              }
              router.push(params.toString() ? `/?${params.toString()}` : "/");
            }, 900);
          }
        }
      } catch (error) {
        console.error("Failed to submit auth form", error);
        setStatusMessage("We hit a snag talking to the server. Please try again in a moment.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [authMode, isSubmitting, maskEmail, router],
  );

  const handleBackHome = useCallback(() => {
    playSfx("/button_click.mp3", 0.6);
    router.push("/");
  }, [router]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal"
        borderColor="#ffffff22"
        hoverFillColor="#ffffff"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <BackgroundDoodles />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md rounded-3xl bg-white/12 px-8 py-9 text-center shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/25 backdrop-blur-2xl sm:px-9 sm:py-10">
          <div className="flex flex-col items-center gap-5">
            <div className="relative inline-flex items-center overflow-hidden rounded-full bg-white/12 p-1.5 ring-1 ring-white/15">
              <div className="relative z-10 isolate flex items-center gap-0 rounded-full bg-black/40 p-1 backdrop-blur-sm">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-full bg-sky-500/90 shadow-[0_10px_30px_rgba(56,189,248,0.45)] ring-1 ring-white/80 transition-all duration-300 ease-out"
                  style={{
                    width: "calc(50% - 0.25rem)",
                    transform:
                      authMode === "sign-in"
                        ? "translateX(0.25rem)"
                        : "translateX(calc(100% + 0.25rem))",
                    opacity: 0.97,
                  }}
                />
                {["sign-in", "register"].map((mode) => {
                  const typed = mode as AuthMode;
                  const isActive = authMode === typed;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setStatusMessage(null);
                        setShowRegisterModal(false);
                        setAuthMode(typed);
                        playSfx("/button_click.mp3", 0.55);
                      }}
                      className={`relative px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                        isActive
                          ? "text-sky-100"
                          : "text-white/60 hover:text-white/85"
                      }`}
                    >
                      {mode === "sign-in" ? "Sign In" : "Register"}
                    </button>
                  );
                })}
              </div>
            </div>
            <Image src="/algohub-transparent.png" alt="AlgoHub" width={160} height={160} priority className="h-28 w-28 drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]" />
            <h1 className="text-3xl font-extrabold tracking-tight">{heading}</h1>
            <p className="max-w-sm text-sm text-white/85">{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            {authMode === "register" && (
              <div>
                <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Display Name
                </label>
                <input
                  id="display-name"
                  name="display-name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="AlgoAce"
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                {authMode === "sign-in" ? "Password" : "Create Password"}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
              />
            </div>
            {authMode === "register" && (
              <div>
                <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/60 shadow-[0_6px_18px_rgba(15,23,42,0.22)] backdrop-blur-md focus:border-white focus:outline-none focus:ring-2 focus:ring-white/80"
                />
              </div>
            )}
            <button
              type="submit"
              onMouseEnter={handleButtonHover}
              className="cursor-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold tracking-wide shadow-[0_10px_0_0_rgb(2,132,199)] transition-all duration-200 hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgb(2,132,199)] hover:scale-[1.01] active:translate-y-[3px] active:shadow-[0_5px_0_0_rgb(2,132,199)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? authMode === "sign-in"
                  ? "Signing In..."
                  : "Registering..."
                : authMode === "sign-in"
                ? "Sign In"
                : "Register"}
            </button>
          </form>

          <div className="mt-4 space-y-3 text-center text-sm text-white/80">
            {statusMessage && <p className="text-xs text-white/70">{statusMessage}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={handleBackHome}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-white/18"
              >
                Back to Landing
              </button>
              <Link href="/learn" className="text-xs font-semibold uppercase tracking-wide text-white/70 underline-offset-4 hover:underline">
                Explore the roadmap instead
              </Link>
            </div>
          </div>
        </div>
      </section>
      {showRegisterModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={() => {
            playSfx("/button_click.mp3", 0.55);
            setShowRegisterModal(false);
          }}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white/15 p-6 text-center shadow-[0_25px_60px_rgba(15,23,42,0.6)] ring-1 ring-white/30 backdrop-blur-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-500/45 via-sky-400/25 to-emerald-400/30" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-[0_12px_30px_rgba(56,189,248,0.35)] ring-1 ring-white/40">
              <span className="text-3xl font-black text-white">✉️</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Almost there!</h2>
            <p className="mt-2 text-sm text-white/85">{registerModalMessage}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/60">Check your inbox to finish signing up</p>
            <div className="mt-6 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  playSfx("/button_click.mp3", 0.55);
                  setShowRegisterModal(false);
                }}
                className="inline-flex items-center justify-center rounded-full bg-white/18 px-6 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:bg-white/28"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <IrisOpenOnMount />
    </main>
  );
}
