import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import MessageList from "../chat/MessageList";
import MessageComposer from "../chat/MessageComposer";
import TypingIndicator from "../chat/TypingIndicator";
import VoiceChannelPanel from "../call/VoiceChannelPanel";

export default function DmThread({ threadId }: { threadId: Id<"directMessageThreads"> }) {
  const threads = useQuery(api.directMessages.listMyDmThreads);
  const thread = threads?.find((t) => t.threadId === threadId);
  const target = { kind: "dm" as const, dmThreadId: threadId };
  const [showCall, setShowCall] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-black/20 p-3">
        <span className="font-semibold text-white">{thread?.otherUser?.displayName ?? "Loading…"}</span>
        <button
          onClick={() => setShowCall((v) => !v)}
          className="text-sm text-gray-400 hover:text-white"
        >
          {showCall ? "Back to chat" : "📹 Start Video Call"}
        </button>
      </div>
      {showCall ? (
        <VoiceChannelPanel target={target} />
      ) : (
        <>
          <MessageList target={target} />
          <TypingIndicator target={target} />
          <MessageComposer target={target} />
        </>
      )}
    </div>
  );
}
