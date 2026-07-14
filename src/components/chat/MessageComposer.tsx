import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const MAX_LENGTH = 2000;
const TYPING_THROTTLE_MS = 1_000;

export default function MessageComposer({ channelId }: { channelId: Id<"channels"> }) {
  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const [content, setContent] = useState("");
  const lastTypingSentAt = useRef(0);

  function handleChange(value: string) {
    setContent(value);
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      void setTyping({ channelId });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) return;
    setContent("");
    await sendMessage({ channelId, content: trimmed });
  }

  const overLimit = content.length > MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="rounded bg-discord-sidebar px-3 py-2">
        <input
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Message #general"
          className="w-full bg-transparent text-gray-100 outline-none"
        />
      </div>
      {overLimit && (
        <p className="mt-1 text-xs text-red-400">
          Message exceeds {MAX_LENGTH} character limit ({content.length}/{MAX_LENGTH}).
        </p>
      )}
    </form>
  );
}
