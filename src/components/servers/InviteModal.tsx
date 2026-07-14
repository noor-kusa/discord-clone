import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function InviteModal({
  serverId,
  inviteToken,
  onClose,
}: {
  serverId: Id<"servers">;
  inviteToken: string;
  onClose: () => void;
}) {
  const regenerateInvite = useMutation(api.servers.regenerateInvite);
  const [token, setToken] = useState(inviteToken);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/invite/${token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRegenerate() {
    const next = await regenerateInvite({ serverId });
    setToken(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-md bg-discord-sidebar p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Invite friends</h2>
        <div className="mb-4 flex items-center gap-2 rounded bg-discord-bg p-2">
          <input readOnly value={inviteUrl} className="flex-1 bg-transparent text-sm text-gray-200 outline-none" />
          <button
            onClick={handleCopy}
            className="rounded bg-discord-accent px-3 py-1 text-sm font-semibold text-white"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">This invite link never expires.</p>
        <div className="flex justify-between">
          <button onClick={handleRegenerate} className="text-sm text-discord-accent hover:underline">
            Generate a new link
          </button>
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-300 hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
