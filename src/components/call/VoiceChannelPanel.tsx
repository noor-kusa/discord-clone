import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCall } from "../../hooks/useCall";
import { ChatTarget } from "../chat/ChatTarget";
import VideoTile from "./VideoTile";
import CallControls from "./CallControls";

export default function VoiceChannelPanel({ target }: { target: ChatTarget }) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const { activeCall, joined, join, leave, micOn, cameraOn, toggleMic, toggleCamera, localStream, remoteStreams } =
    useCall(target);

  const participantCount = activeCall?.participants.length ?? 0;
  const isFull = participantCount >= 4 && !joined;

  if (!joined) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-300">
        <p>
          {participantCount > 0
            ? `${participantCount} participant${participantCount === 1 ? "" : "s"} in this call`
            : "No one is in this voice channel yet."}
        </p>
        <button
          onClick={() => void join()}
          disabled={isFull}
          className="rounded bg-discord-accent px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFull ? "Channel full" : "Join Voice"}
        </button>
      </div>
    );
  }

  const others = (activeCall?.participants ?? []).filter((p) => p.userId !== currentUser?._id);

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-4">
        <VideoTile stream={localStream} label={`${currentUser?.displayName ?? "You"} (you)`} muted micOn={micOn} />
        {others.map((p) => (
          <VideoTile
            key={p.userId}
            stream={remoteStreams[p.userId] ?? null}
            label={p.displayName}
            micOn={p.micOn}
          />
        ))}
      </div>
      <CallControls
        micOn={micOn}
        cameraOn={cameraOn}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onLeave={() => void leave()}
      />
    </div>
  );
}
