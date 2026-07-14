import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

type Flow = "signIn" | "signUp";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", {
        email,
        password,
        flow,
        ...(flow === "signUp" ? { displayName } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-discord-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-md bg-discord-sidebar p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          {flow === "signIn" ? "Welcome back!" : "Create an account"}
        </h1>

        {flow === "signUp" && (
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-400">
              Display Name
            </span>
            <input
              className="w-full rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-400">Email</span>
          <input
            type="email"
            className="w-full rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-400">
            Password
          </span>
          <input
            type="password"
            className="w-full rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-discord-accent py-2 font-semibold text-white disabled:opacity-50"
        >
          {flow === "signIn" ? "Log In" : "Sign Up"}
        </button>

        <button
          type="button"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          className="mt-4 w-full text-center text-sm text-discord-accent"
        >
          {flow === "signIn"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
