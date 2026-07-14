import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function MemberList({ serverId }: { serverId: Id<"servers"> }) {
  const members = useQuery(api.servers.getServerMembers, { serverId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const presence = useQuery(
    api.users.getPresence,
    members ? { userIds: members.map((m) => m._id) } : "skip",
  );
  const getOrCreateDmThread = useMutation(api.directMessages.getOrCreateDmThread);
  const navigate = useNavigate();

  const isOnline = (userId: Id<"users">) =>
    presence?.find((p) => p.userId === userId)?.isOnline ?? false;

  async function handleMemberClick(memberId: Id<"users">) {
    if (memberId === currentUser?._id) return;
    const threadId = await getOrCreateDmThread({ otherUserId: memberId });
    navigate(`/dm/${threadId}`);
  }

  return (
    <div className="w-60 shrink-0 bg-discord-sidebar p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
        Members — {members?.length ?? 0}
      </h3>
      <ul className="space-y-1">
        {(members ?? []).map((member) => (
          <li key={member._id}>
            <button
              onClick={() => void handleMemberClick(member._id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-gray-200 hover:bg-discord-bg"
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline(member._id) ? "bg-green-500" : "bg-gray-500"}`}
              />
              <span className="text-sm">{member.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
