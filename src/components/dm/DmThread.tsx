import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import MessageList from "../chat/MessageList";
import MessageComposer from "../chat/MessageComposer";
import TypingIndicator from "../chat/TypingIndicator";

export default function DmThread({ threadId }: { threadId: Id<"directMessageThreads"> }) {
  const threads = useQuery(api.directMessages.listMyDmThreads);
  const thread = threads?.find((t) => t.threadId === threadId);
  const target = { kind: "dm" as const, dmThreadId: threadId };

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-black/20 p-3 font-semibold text-white">
        {thread?.otherUser?.displayName ?? "Loading…"}
      </div>
      <MessageList target={target} />
      <TypingIndicator target={target} />
      <MessageComposer target={target} />
    </div>
  );
}
