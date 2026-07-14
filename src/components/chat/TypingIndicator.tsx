import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChatTarget } from "./ChatTarget";

export default function TypingIndicator({ target }: { target: ChatTarget }) {
  const typingUsersChannel = useQuery(
    api.messages.listTyping,
    target.kind === "channel" ? { channelId: target.channelId } : "skip",
  );
  const typingUsersDm = useQuery(
    api.directMessages.listDmTyping,
    target.kind === "dm" ? { dmThreadId: target.dmThreadId } : "skip",
  );
  const typingUsers = target.kind === "channel" ? typingUsersChannel : typingUsersDm;

  if (!typingUsers || typingUsers.length === 0) return <div className="h-5" />;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
        : "Several people are typing…";

  return <div className="h-5 px-4 text-xs italic text-gray-400">{text}</div>;
}
