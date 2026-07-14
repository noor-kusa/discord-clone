import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const joinServerByInvite = useMutation(api.servers.joinServerByInvite);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    joinServerByInvite({ inviteToken: token })
      .then((serverId) => navigate(`/servers/${serverId}`, { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : "Invalid invite"));
  }, [token, joinServerByInvite, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-discord-bg text-gray-300">
      {error ? `Couldn't join: ${error}` : "Joining server…"}
    </div>
  );
}
