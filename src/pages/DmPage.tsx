import { useState } from "react";
import { useParams } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import ServerRail from "../components/layout/ServerRail";
import DmList from "../components/dm/DmList";
import DmThread from "../components/dm/DmThread";
import CreateServerModal from "../components/servers/CreateServerModal";

export default function DmPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [showCreateServer, setShowCreateServer] = useState(false);

  return (
    <div className="flex h-screen bg-discord-bg">
      <ServerRail onCreateServer={() => setShowCreateServer(true)} />
      <DmList />
      {threadId ? (
        <DmThread threadId={threadId as Id<"directMessageThreads">} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          Select a conversation.
        </div>
      )}
      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} />}
    </div>
  );
}
