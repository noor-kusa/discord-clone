import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChatTarget } from "../components/chat/ChatTarget";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const HEARTBEAT_INTERVAL_MS = 5_000;

export function useCall(target: ChatTarget) {
  const joinCallMutation = useMutation(api.calls.joinCall);
  const leaveCallMutation = useMutation(api.calls.leaveCall);
  const setMicCameraMutation = useMutation(api.calls.setMicCamera);
  const callHeartbeatMutation = useMutation(api.calls.callHeartbeat);
  const sendSignal = useMutation(api.signals.sendSignal);
  const ackSignal = useMutation(api.signals.ackSignal);
  const currentUser = useQuery(api.users.getCurrentUser);

  const queryArgs =
    target.kind === "channel" ? { channelId: target.channelId } : { dmThreadId: target.dmThreadId };
  const activeCall = useQuery(api.calls.getActiveCall, queryArgs);

  const [callId, setCallId] = useState<Id<"calls"> | null>(null);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<Id<"calls"> | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const makingOfferRef = useRef<Record<string, boolean>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const signals = useQuery(api.signals.listSignalsForMe, callId ? { callId } : "skip");

  const getOrCreatePeer = useCallback(
    (otherUserId: string) => {
      const existing = peersRef.current[otherUserId];
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      localStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current!));

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current[otherUserId] = true;
          await pc.setLocalDescription();
          if (callIdRef.current) {
            await sendSignal({
              callId: callIdRef.current,
              toUserId: otherUserId as Id<"users">,
              type: "offer",
              payload: JSON.stringify(pc.localDescription),
            });
          }
        } finally {
          makingOfferRef.current[otherUserId] = false;
        }
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && callIdRef.current) {
          void sendSignal({
            callId: callIdRef.current,
            toUserId: otherUserId as Id<"users">,
            type: "ice-candidate",
            payload: JSON.stringify(candidate),
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreams((prev) => ({ ...prev, [otherUserId]: e.streams[0] }));
      };

      peersRef.current[otherUserId] = pc;
      return pc;
    },
    [sendSignal],
  );

  const closePeer = useCallback((otherUserId: string) => {
    peersRef.current[otherUserId]?.close();
    delete peersRef.current[otherUserId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[otherUserId];
      return next;
    });
  }, []);

  // Perfect Negotiation: polite peer is deterministically the lower user ID (research.md §3).
  const handleSignal = useCallback(
    async (signal: {
      _id: Id<"signals">;
      fromUserId: Id<"users">;
      type: "offer" | "answer" | "ice-candidate";
      payload: string;
    }) => {
      if (!currentUser) return;
      const polite = currentUser._id < signal.fromUserId;
      const pc = getOrCreatePeer(signal.fromUserId);

      if (signal.type === "offer" || signal.type === "answer") {
        const description = JSON.parse(signal.payload) as RTCSessionDescriptionInit;
        const offerCollision =
          signal.type === "offer" &&
          (makingOfferRef.current[signal.fromUserId] || pc.signalingState !== "stable");

        if (offerCollision && !polite) {
          await ackSignal({ signalId: signal._id });
          return; // impolite peer ignores the colliding offer
        }
        if (offerCollision && polite) {
          await pc.setLocalDescription({ type: "rollback" });
        }

        await pc.setRemoteDescription(description);

        if (signal.type === "offer") {
          await pc.setLocalDescription();
          if (callIdRef.current) {
            await sendSignal({
              callId: callIdRef.current,
              toUserId: signal.fromUserId,
              type: "answer",
              payload: JSON.stringify(pc.localDescription),
            });
          }
        }

        const queued = pendingCandidatesRef.current[signal.fromUserId] ?? [];
        for (const candidate of queued) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current[signal.fromUserId] = [];
      } else {
        const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current[signal.fromUserId] = [
            ...(pendingCandidatesRef.current[signal.fromUserId] ?? []),
            candidate,
          ];
        }
      }

      await ackSignal({ signalId: signal._id });
    },
    [currentUser, getOrCreatePeer, sendSignal, ackSignal],
  );

  useEffect(() => {
    if (!signals) return;
    signals.forEach((s) => void handleSignal(s));
  }, [signals, handleSignal]);

  // Open/close peer connections as the participant roster changes.
  useEffect(() => {
    if (!activeCall || !currentUser) return;
    const otherIds = activeCall.participants
      .map((p) => p.userId)
      .filter((id) => id !== currentUser._id);

    otherIds.forEach((id) => getOrCreatePeer(id));
    Object.keys(peersRef.current).forEach((id) => {
      if (!otherIds.includes(id as Id<"users">)) closePeer(id);
    });
  }, [activeCall, currentUser, getOrCreatePeer, closePeer]);

  useEffect(() => {
    if (!callId) return;
    const id = setInterval(() => void callHeartbeatMutation({ callId }), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [callId, callHeartbeatMutation]);

  const join = useCallback(async () => {
    const args = target.kind === "channel" ? { channelId: target.channelId } : { dmThreadId: target.dmThreadId };
    const id = await joinCallMutation(args);
    callIdRef.current = id;
    setCallId(id);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setJoined(true);
  }, [target, joinCallMutation]);

  const leave = useCallback(async () => {
    if (callIdRef.current) await leaveCallMutation({ callId: callIdRef.current });
    Object.keys(peersRef.current).forEach(closePeer);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    callIdRef.current = null;
    setCallId(null);
    setJoined(false);
  }, [leaveCallMutation, closePeer]);

  useEffect(() => {
    return () => {
      // Best-effort cleanup on unmount; the server-side heartbeat staleness check
      // also handles the case where this never fires (e.g. tab closed).
      if (callIdRef.current) void leaveCallMutation({ callId: callIdRef.current });
      Object.values(peersRef.current).forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      if (callIdRef.current) void setMicCameraMutation({ callId: callIdRef.current, micOn: next });
      return next;
    });
  }, [setMicCameraMutation]);

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      if (callIdRef.current) void setMicCameraMutation({ callId: callIdRef.current, cameraOn: next });
      return next;
    });
  }, [setMicCameraMutation]);

  return {
    activeCall,
    joined,
    join,
    leave,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    localStream,
    remoteStreams,
  };
}
