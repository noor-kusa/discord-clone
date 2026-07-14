import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function TypingIndicator({ channelId }: { channelId: Id<"channels"> }) {
  const typingUsers = useQuery(api.messages.listTyping, { channelId });

  if (!typingUsers || typingUsers.length === 0) return <div className="h-5" />;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
        : "Several people are typing…";

  return <div className="h-5 px-4 text-xs italic text-gray-400">{text}</div>;
}
