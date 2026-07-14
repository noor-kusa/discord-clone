import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 5_000;

export default function PresenceHeartbeat() {
  const heartbeat = useMutation(api.users.heartbeat);

  useEffect(() => {
    void heartbeat();
    const id = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [heartbeat]);

  return null;
}
