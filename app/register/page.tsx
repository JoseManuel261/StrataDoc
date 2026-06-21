"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function RegisterPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="glass w-full max-w-sm animate-fade-up rounded-xl p-6 text-center">
          <h1 className="font-display text-xl text-[var(--text)]">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Te enviamos un enlace de confirmación a{" "}
            <span className="text-[var(--text)]">{email}</span>. Una vez
            confirmes, podrás iniciar sesión en StrataDOC y en Strata con la
            misma cuenta.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-[var(--text)]">
            Strata<span className="text-[var(--accent)]">DOC</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Crea tu cuenta — funciona también en Strata
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass space-y-4 rounded-xl p-6">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="mono text-xs uppercase tracking-wide text-[var(--text-dim)]"
            >
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="mono text-xs uppercase tracking-wide text-[var(--text-dim)]"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="mono text-xs uppercase tracking-wide text-[var(--text-dim)]"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--red-text)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
