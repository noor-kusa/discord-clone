import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";

export default function ServerRail({ onCreateServer }: { onCreateServer: () => void }) {
  const servers = useQuery(api.servers.listMyServers);
  const navigate = useNavigate();
  const { serverId } = useParams();

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 bg-discord-rail py-3">
      {(servers ?? []).map((server) => (
        <button
          key={server._id}
          onClick={() => navigate(`/servers/${server._id}`)}
          title={server.name}
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-discord-sidebar text-sm font-semibold text-white transition-all hover:rounded-2xl hover:bg-discord-accent ${
            serverId === server._id ? "rounded-2xl bg-discord-accent" : ""
          }`}
        >
          {server.name.slice(0, 2).toUpperCase()}
        </button>
      ))}
      <button
        onClick={onCreateServer}
        title="Create a server"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-discord-sidebar text-2xl text-green-400 transition-all hover:rounded-2xl hover:bg-green-600 hover:text-white"
      >
        +
      </button>
    </div>
  );
}
