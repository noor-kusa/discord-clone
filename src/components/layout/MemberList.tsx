import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function MemberList({ serverId }: { serverId: Id<"servers"> }) {
  const members = useQuery(api.servers.getServerMembers, { serverId });
  const presence = useQuery(
    api.users.getPresence,
    members ? { userIds: members.map((m) => m._id) } : "skip",
  );

  const isOnline = (userId: Id<"users">) =>
    presence?.find((p) => p.userId === userId)?.isOnline ?? false;

  return (
    <div className="w-60 shrink-0 bg-discord-sidebar p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
        Members — {members?.length ?? 0}
      </h3>
      <ul className="space-y-1">
        {(members ?? []).map((member) => (
          <li key={member._id} className="flex items-center gap-2 rounded px-2 py-1 text-gray-200 hover:bg-discord-bg">
            <span
              className={`h-2 w-2 rounded-full ${isOnline(member._id) ? "bg-green-500" : "bg-gray-500"}`}
            />
            <span className="text-sm">{member.displayName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
