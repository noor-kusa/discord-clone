export default function CallControls({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: {
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex justify-center gap-3 border-t border-black/20 p-3">
      <button
        onClick={onToggleMic}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${
          micOn ? "bg-discord-sidebar text-white" : "bg-red-600 text-white"
        }`}
      >
        {micOn ? "Mute" : "Unmute"}
      </button>
      <button
        onClick={onToggleCamera}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${
          cameraOn ? "bg-discord-sidebar text-white" : "bg-red-600 text-white"
        }`}
      >
        {cameraOn ? "Stop Video" : "Start Video"}
      </button>
      <button
        onClick={onLeave}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Leave Call
      </button>
    </div>
  );
}
