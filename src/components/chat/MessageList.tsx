import { usePaginatedQuery, useQuery } from "convex/react";
import { useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import MessageItem from "./MessageItem";

export default function MessageList({ channelId }: { channelId: Id<"channels"> }) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.listMessages,
    { channelId },
    { initialNumItems: 25 },
  );
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    // Newest-first, reverse-rendered list: "load more" triggers near the top (older history).
    if (el.scrollTop < 100 && status === "CanLoadMore") {
      loadMore(25);
    }
  }

  // results are newest-first from the server; render oldest-at-top by reversing for display.
  const ordered = [...results].reverse();

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-2"
    >
      {status === "LoadingMore" && (
        <p className="px-4 py-1 text-center text-xs text-gray-500">Loading older messages…</p>
      )}
      {ordered.map((message) => (
        <MessageItem key={message._id} message={message} currentUserId={currentUser?._id} />
      ))}
      {ordered.length === 0 && status !== "LoadingFirstPage" && (
        <p className="px-4 py-8 text-center text-gray-500">No messages yet — say hello!</p>
      )}
    </div>
  );
}
