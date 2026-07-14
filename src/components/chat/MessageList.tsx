import { usePaginatedQuery, useQuery } from "convex/react";
import { useRef } from "react";
import { api } from "../../../convex/_generated/api";
import MessageItem from "./MessageItem";
import { ChatTarget } from "./ChatTarget";

export default function MessageList({ target }: { target: ChatTarget }) {
  const currentUser = useQuery(api.users.getCurrentUser);

  const channelPage = usePaginatedQuery(
    api.messages.listMessages,
    target.kind === "channel" ? { channelId: target.channelId } : "skip",
    { initialNumItems: 25 },
  );
  const dmPage = usePaginatedQuery(
    api.directMessages.listDmMessages,
    target.kind === "dm" ? { dmThreadId: target.dmThreadId } : "skip",
    { initialNumItems: 25 },
  );
  const { results, status, loadMore } = target.kind === "channel" ? channelPage : dmPage;

  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < 100 && status === "CanLoadMore") {
      loadMore(25);
    }
  }

  const ordered = [...results].reverse();

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-2">
      {status === "LoadingMore" && (
        <p className="px-4 py-1 text-center text-xs text-gray-500">Loading older messages…</p>
      )}
      {ordered.map((message) => (
        <MessageItem
          key={message._id}
          message={message}
          currentUserId={currentUser?._id}
          kind={target.kind}
        />
      ))}
      {ordered.length === 0 && status !== "LoadingFirstPage" && (
        <p className="px-4 py-8 text-center text-gray-500">No messages yet — say hello!</p>
      )}
    </div>
  );
}
