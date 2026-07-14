import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function CreateChannelModal({
  serverId,
  onClose,
}: {
  serverId: Id<"servers">;
  onClose: () => void;
}) {
  const createChannel = useMutation(api.channels.createChannel);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "voice">("text");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createChannel({ serverId, name: name.trim(), type });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-md bg-discord-sidebar p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Create Channel</h2>

        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input type="radio" checked={type === "text"} onChange={() => setType("text")} />
            Text
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input type="radio" checked={type === "voice"} onChange={() => setType("voice")} />
            Voice
          </label>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="channel-name"
          className="mb-4 w-full rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
          required
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-300 hover:underline">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-discord-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create Channel
          </button>
        </div>
      </form>
    </div>
  );
}
