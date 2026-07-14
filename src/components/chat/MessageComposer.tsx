import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChatTarget } from "./ChatTarget";

const MAX_LENGTH = 2000;
const TYPING_THROTTLE_MS = 1_000;

export default function MessageComposer({ target }: { target: ChatTarget }) {
  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const sendDmMessage = useMutation(api.directMessages.sendDmMessage);
  const setDmTyping = useMutation(api.directMessages.setDmTyping);
  const [content, setContent] = useState("");
  const lastTypingSentAt = useRef(0);

  function handleChange(value: string) {
    setContent(value);
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      if (target.kind === "channel") void setTyping({ channelId: target.channelId });
      else void setDmTyping({ dmThreadId: target.dmThreadId });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) return;
    setContent("");
    if (target.kind === "channel") {
      await sendMessage({ channelId: target.channelId, content: trimmed });
    } else {
      await sendDmMessage({ dmThreadId: target.dmThreadId, content: trimmed });
    }
  }

  const overLimit = content.length > MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="rounded bg-discord-sidebar px-3 py-2">
        <input
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Message"
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
