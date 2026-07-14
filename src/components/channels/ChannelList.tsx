import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function ChannelList({
  serverId,
  activeChannelId,
  isOwner,
  onCreateChannel,
}: {
  serverId: Id<"servers">;
  activeChannelId?: Id<"channels">;
  isOwner: boolean;
  onCreateChannel: () => void;
}) {
  const channels = useQuery(api.channels.listChannels, { serverId });
  const occupancy = useQuery(api.calls.listVoiceChannelOccupancy, { serverId });
  const renameChannel = useMutation(api.channels.renameChannel);
  const deleteChannel = useMutation(api.channels.deleteChannel);
  const navigate = useNavigate();

  const textChannels = (channels ?? []).filter((c) => c.type === "text");
  const voiceChannels = (channels ?? []).filter((c) => c.type === "voice");

  function membersFor(channelId: Id<"channels">) {
    return occupancy?.find((o) => o.channelId === channelId)?.members ?? [];
  }

  async function handleRename(channelId: Id<"channels">, currentName: string) {
    const name = window.prompt("Rename channel", currentName);
    if (name && name.trim() && name.trim() !== currentName) {
      await renameChannel({ channelId, name: name.trim() });
    }
  }

  async function handleDelete(channelId: Id<"channels">, name: string) {
    if (window.confirm(`Delete #${name}? This removes its message history permanently.`)) {
      await deleteChannel({ channelId });
      if (activeChannelId === channelId) navigate(`/servers/${serverId}`);
    }
  }

  function ChannelRow({ channel, icon }: { channel: NonNullable<typeof channels>[number]; icon: string }) {
    return (
      <div className="group flex items-center">
        <button
          onClick={() => navigate(`/servers/${serverId}/channels/${channel._id}`)}
          className={`flex-1 rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-discord-bg ${
            activeChannelId === channel._id ? "bg-discord-bg text-white" : ""
          }`}
        >
          {icon} {channel.name}
        </button>
        {isOwner && (
          <div className="hidden gap-1 pr-1 group-hover:flex">
            <button
              onClick={() => void handleRename(channel._id, channel.name)}
              title="Rename"
              className="text-xs text-gray-400 hover:text-white"
            >
              ✏️
            </button>
            <button
              onClick={() => void handleDelete(channel._id, channel.name)}
              title="Delete"
              className="text-xs text-gray-400 hover:text-red-400"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-60 shrink-0 flex-col bg-discord-sidebar">
      <div className="flex items-center justify-between border-b border-black/20 p-3">
        <span className="font-semibold text-white">Channels</span>
        {isOwner && (
          <button
            onClick={onCreateChannel}
            className="text-xl leading-none text-gray-400 hover:text-white"
            title="Create channel"
          >
            +
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="mb-1 mt-2 px-2 text-xs font-semibold uppercase text-gray-400">
          Text Channels
        </p>
        {textChannels.map((channel) => (
          <ChannelRow key={channel._id} channel={channel} icon="#" />
        ))}
        <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase text-gray-400">
          Voice Channels
        </p>
        {voiceChannels.map((channel) => (
          <div key={channel._id}>
            <ChannelRow channel={channel} icon="🔊" />
            {membersFor(channel._id).map((name) => (
              <div key={name} className="pl-6 text-xs text-gray-400">
                🎙️ {name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
