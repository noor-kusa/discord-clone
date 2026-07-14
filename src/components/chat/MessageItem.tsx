import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export interface MessageItemData {
  _id: Id<"messages">;
  authorId: Id<"users">;
  authorName: string;
  content: string;
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
}

export default function MessageItem({
  message,
  currentUserId,
  kind,
}: {
  message: MessageItemData;
  currentUserId: Id<"users"> | undefined;
  kind: "channel" | "dm";
}) {
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const editDmMessage = useMutation(api.directMessages.editDmMessage);
  const deleteDmMessage = useMutation(api.directMessages.deleteDmMessage);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const isAuthor = currentUserId === message.authorId;
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleSaveEdit() {
    if (draft.trim().length === 0) return;
    if (kind === "channel") {
      await editMessage({ messageId: message._id, content: draft });
    } else {
      await editDmMessage({ messageId: message._id, content: draft });
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (kind === "channel") {
      await deleteMessage({ messageId: message._id });
    } else {
      await deleteDmMessage({ messageId: message._id });
    }
  }

  if (message.deletedAt) {
    return <div className="px-4 py-1 text-sm italic text-gray-500">Message deleted</div>;
  }

  return (
    <div className="group px-4 py-1 hover:bg-black/10">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-white">{message.authorName}</span>
        <span className="text-xs text-gray-500">{timestamp}</span>
        {message.editedAt && <span className="text-xs text-gray-500">(edited)</span>}
      </div>

      {editing ? (
        <div className="mt-1 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            className="flex-1 rounded bg-discord-bg px-2 py-1 text-gray-100 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSaveEdit();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button onClick={handleSaveEdit} className="text-xs text-discord-accent">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400">
            Cancel
          </button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-gray-200">{message.content}</p>
      )}

      {isAuthor && !editing && (
        <div className="hidden gap-2 group-hover:flex">
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:underline">
            Edit
          </button>
          <button onClick={() => void handleDelete()} className="text-xs text-red-400 hover:underline">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
