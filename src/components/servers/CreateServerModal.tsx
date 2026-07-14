import { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";

export default function CreateServerModal({ onClose }: { onClose: () => void }) {
  const createServer = useMutation(api.servers.createServer);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const serverId = await createServer({ name: name.trim() });
      onClose();
      navigate(`/servers/${serverId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-md bg-discord-sidebar p-6 shadow-xl"
      >
        <h2 className="mb-1 text-xl font-bold text-white">Create a server</h2>
        <p className="mb-4 text-sm text-gray-400">
          Your server starts with a default #general channel.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Server name"
          className="mb-4 w-full rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
          required
        />
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-300 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-discord-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
