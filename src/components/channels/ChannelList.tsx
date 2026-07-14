import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function ChannelList({
  serverId,
  activeChannelId,
  onCreateChannel,
}: {
  serverId: Id<"servers">;
  activeChannelId?: Id<"channels">;
  onCreateChannel: () => void;
}) {
  const channels = useQuery(api.channels.listChannels, { serverId });
  const navigate = useNavigate();

  const textChannels = (channels ?? []).filter((c) => c.type === "text");
  const voiceChannels = (channels ?? []).filter((c) => c.type === "voice");

  return (
    <div className="flex w-60 shrink-0 flex-col bg-discord-sidebar">
      <div className="flex items-center justify-between border-b border-black/20 p-3">
        <span className="font-semibold text-white">Channels</span>
        <button
          onClick={onCreateChannel}
          className="text-xl leading-none text-gray-400 hover:text-white"
          title="Create channel"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="mb-1 mt-2 px-2 text-xs font-semibold uppercase text-gray-400">
          Text Channels
        </p>
        {textChannels.map((channel) => (
          <button
            key={channel._id}
            onClick={() => navigate(`/servers/${serverId}/channels/${channel._id}`)}
            className={`block w-full rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-discord-bg ${
              activeChannelId === channel._id ? "bg-discord-bg text-white" : ""
            }`}
          >
            # {channel.name}
          </button>
        ))}
        <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase text-gray-400">
          Voice Channels
        </p>
        {voiceChannels.map((channel) => (
          <button
            key={channel._id}
            onClick={() => navigate(`/servers/${serverId}/channels/${channel._id}`)}
            className={`block w-full rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-discord-bg ${
              activeChannelId === channel._id ? "bg-discord-bg text-white" : ""
            }`}
          >
            🔊 {channel.name}
          </button>
        ))}
      </div>
    </div>
  );
}
