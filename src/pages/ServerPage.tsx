import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import ServerRail from "../components/layout/ServerRail";
import ChannelList from "../components/channels/ChannelList";
import MemberList from "../components/layout/MemberList";
import CreateServerModal from "../components/servers/CreateServerModal";
import CreateChannelModal from "../components/channels/CreateChannelModal";
import ServerSettings from "../components/servers/ServerSettings";

export default function ServerPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const servers = useQuery(api.servers.listMyServers);
  const server = servers?.find((s) => s._id === serverId);

  if (!serverId) return null;
  const typedServerId = serverId as Id<"servers">;
  const isOwner = !!currentUser && !!server && server.ownerId === currentUser._id;

  return (
    <div className="flex h-screen bg-discord-bg">
      <ServerRail onCreateServer={() => setShowCreateServer(true)} />
      <ChannelList
        serverId={typedServerId}
        activeChannelId={channelId as Id<"channels"> | undefined}
        onCreateChannel={() => setShowCreateChannel(true)}
      />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-black/20 p-3">
          <span className="font-semibold text-white">{server?.name ?? "Loading…"}</span>
          <button onClick={() => setShowSettings(true)} className="text-sm text-gray-400 hover:text-white">
            Settings
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center text-gray-400">
          {channelId
            ? "Chat is coming in the next milestone (User Story 1)."
            : "Select a channel to get started."}
        </div>
      </div>
      <MemberList serverId={typedServerId} />

      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} />}
      {showCreateChannel && (
        <CreateChannelModal serverId={typedServerId} onClose={() => setShowCreateChannel(false)} />
      )}
      {showSettings && server && (
        <ServerSettings
          serverId={typedServerId}
          isOwner={isOwner}
          inviteToken={server.inviteToken}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
