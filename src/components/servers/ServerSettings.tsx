import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import InviteModal from "./InviteModal";

export default function ServerSettings({
  serverId,
  isOwner,
  inviteToken,
  onClose,
}: {
  serverId: Id<"servers">;
  isOwner: boolean;
  inviteToken: string;
  onClose: () => void;
}) {
  const members = useQuery(api.servers.getServerMembers, { serverId });
  const renameServer = useMutation(api.servers.renameServer);
  const removeMember = useMutation(api.servers.removeMember);
  const leaveServer = useMutation(api.servers.leaveServer);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await renameServer({ serverId, name: name.trim() });
    setName("");
  }

  async function handleLeave() {
    await leaveServer({ serverId });
    onClose();
    navigate("/");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-md bg-discord-sidebar p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Server Settings</h2>

        {isOwner && (
          <form onSubmit={handleRename} className="mb-4 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New server name"
              className="flex-1 rounded bg-discord-bg px-3 py-2 text-gray-100 outline-none"
            />
            <button type="submit" className="rounded bg-discord-accent px-3 py-2 text-sm font-semibold text-white">
              Rename
            </button>
          </form>
        )}

        <button
          onClick={() => setShowInvite(true)}
          className="mb-4 w-full rounded bg-discord-bg px-3 py-2 text-left text-sm text-gray-200 hover:bg-black/30"
        >
          Invite people…
        </button>

        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Members</h3>
        <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
          {(members ?? []).map((m) => (
            <li key={m._id} className="flex items-center justify-between rounded px-2 py-1 text-gray-200">
              <span>{m.displayName}</span>
              {isOwner && (
                <button
                  onClick={() => removeMember({ serverId, userId: m._id })}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="flex justify-between">
          <button onClick={handleLeave} className="text-sm text-red-400 hover:underline">
            {isOwner ? "Delete server" : "Leave server"}
          </button>
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-300 hover:underline">
            Close
          </button>
        </div>
      </div>

      {showInvite && (
        <InviteModal serverId={serverId} inviteToken={inviteToken} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
