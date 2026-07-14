import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import ServerRail from "../components/layout/ServerRail";
import CreateServerModal from "../components/servers/CreateServerModal";

export default function HomePage() {
  const [showCreate, setShowCreate] = useState(false);
  const { signOut } = useAuthActions();

  return (
    <div className="flex h-screen bg-discord-bg">
      <ServerRail onCreateServer={() => setShowCreate(true)} />
      <div className="flex flex-1 flex-col items-center justify-center text-gray-300">
        <p className="mb-4 text-lg">No server selected yet.</p>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-discord-accent px-4 py-2 font-semibold text-white"
        >
          Create your first server
        </button>
        <button onClick={() => void signOut()} className="mt-6 text-sm text-gray-400 hover:underline">
          Log out
        </button>
      </div>
      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
