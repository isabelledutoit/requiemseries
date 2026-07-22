"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Admins reach /admin (either via the ?next from a gated redirect, or
  // /welcome bounces them there). Public sign-ups land on /welcome.
  const next = params.get("next") || "/welcome";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res =
        mode === "signup"
          ? await signUp.email({ email, password, name })
          : await signIn.email({ email, password });
      if (res.error)
        throw new Error(res.error.message || "Authentication failed.");
      router.push(next.startsWith("/") ? next : "/admin");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <p className="auth-kicker">Requiem</p>
      <h1 className="auth-title">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h1>
      {mode === "signup" && (
        <label className="auth-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
      )}
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      {err && <p className="auth-err">{err}</p>}
      <button type="submit" className="auth-btn" disabled={busy}>
        {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setErr(null);
        }}
      >
        {mode === "signup"
          ? "Have an account? Sign in"
          : "Need an account? Create one"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
