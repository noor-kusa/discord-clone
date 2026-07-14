import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";

export default function DmList() {
  const threads = useQuery(api.directMessages.listMyDmThreads);
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();

  return (
    <div className="flex w-60 shrink-0 flex-col bg-discord-sidebar">
      <div className="border-b border-black/20 p-3 font-semibold text-white">Direct Messages</div>
      <div className="flex-1 overflow-y-auto p-2">
        {(threads ?? []).map((t) =>
          t.otherUser ? (
            <button
              key={t.threadId}
              onClick={() => navigate(`/dm/${t.threadId}`)}
              className={`block w-full rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-discord-bg ${
                threadId === t.threadId ? "bg-discord-bg text-white" : ""
              }`}
            >
              {t.otherUser.displayName}
            </button>
          ) : null,
        )}
        {threads?.length === 0 && (
          <p className="px-2 py-4 text-xs text-gray-500">
            Open a server's member list and click a member to start a DM.
          </p>
        )}
      </div>
    </div>
  );
}
