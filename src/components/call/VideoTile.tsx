import { useEffect, useRef } from "react";

export default function VideoTile({
  stream,
  label,
  muted,
  micOn,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  micOn?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover"
      />
      <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {micOn === false && <span title="Muted">🔇</span>}
        {label}
      </div>
    </div>
  );
}
