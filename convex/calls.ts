import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const MAX_PARTICIPANTS = 4; // FR-017 hard cap (Clarifications)
const HEARTBEAT_STALE_MS = 15_000; // ~3 missed 5s heartbeats before treating as disconnected

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireVoiceChannelOrDmAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  channelId?: Id<"channels">,
  dmThreadId?: Id<"directMessageThreads">,
) {
  if (channelId) {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found");
    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId_and_userId", (q) =>
        q.eq("serverId", channel.serverId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("Not a member of this server");
  } else if (dmThreadId) {
    const thread = await ctx.db.get(dmThreadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.userAId !== userId && thread.userBId !== userId) {
      throw new Error("Not a participant in this conversation");
    }
  } else {
    throw new Error("Must specify channelId or dmThreadId");
  }
}

async function activeParticipants(ctx: QueryCtx | MutationCtx, callId: Id<"calls">) {
  const rows = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId", (q) => q.eq("callId", callId))
    .collect();
  const now = Date.now();
  return rows.filter((p) => !p.leftAt && now - p.lastHeartbeat < HEARTBEAT_STALE_MS);
}

export const joinCall = mutation({
  args: { channelId: v.optional(v.id("channels")), dmThreadId: v.optional(v.id("directMessageThreads")) },
  handler: async (ctx, { channelId, dmThreadId }) => {
    const userId = await requireAuth(ctx);
    await requireVoiceChannelOrDmAccess(ctx, userId, channelId, dmThreadId);

    let call = channelId
      ? await ctx.db
          .query("calls")
          .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
          .filter((q) => q.eq(q.field("endedAt"), undefined))
          .unique()
      : await ctx.db
          .query("calls")
          .withIndex("by_dmThreadId", (q) => q.eq("dmThreadId", dmThreadId))
          .filter((q) => q.eq(q.field("endedAt"), undefined))
          .unique();

    if (!call) {
      const callId = await ctx.db.insert("calls", {
        channelId,
        dmThreadId,
        startedAt: Date.now(),
      });
      call = (await ctx.db.get(callId))!;
    }

    const existingParticipant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_userId", (q) => q.eq("callId", call._id).eq("userId", userId))
      .unique();

    if (existingParticipant && !existingParticipant.leftAt) {
      return call._id; // already in the call (e.g. duplicate join click)
    }

    const active = await activeParticipants(ctx, call._id);
    if (active.length >= MAX_PARTICIPANTS) {
      throw new Error("Channel full"); // FR-017 / Clarifications
    }

    if (existingParticipant) {
      await ctx.db.patch(existingParticipant._id, {
        leftAt: undefined,
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        micOn: true,
        cameraOn: true,
      });
    } else {
      await ctx.db.insert("callParticipants", {
        callId: call._id,
        userId,
        joinedAt: Date.now(),
        micOn: true,
        cameraOn: true,
        lastHeartbeat: Date.now(),
      });
    }

    return call._id;
  },
});

export const leaveCall = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const userId = await requireAuth(ctx);
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_userId", (q) => q.eq("callId", callId).eq("userId", userId))
      .unique();
    if (participant && !participant.leftAt) {
      await ctx.db.patch(participant._id, { leftAt: Date.now() });
    }
    const remaining = await activeParticipants(ctx, callId);
    if (remaining.length === 0) {
      const call = await ctx.db.get(callId);
      if (call && !call.endedAt) await ctx.db.patch(callId, { endedAt: Date.now() });
    }
  },
});

export const setMicCamera = mutation({
  args: { callId: v.id("calls"), micOn: v.optional(v.boolean()), cameraOn: v.optional(v.boolean()) },
  handler: async (ctx, { callId, micOn, cameraOn }) => {
    const userId = await requireAuth(ctx);
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_userId", (q) => q.eq("callId", callId).eq("userId", userId))
      .unique();
    if (!participant) throw new Error("Not a participant in this call");
    await ctx.db.patch(participant._id, {
      ...(micOn !== undefined ? { micOn } : {}),
      ...(cameraOn !== undefined ? { cameraOn } : {}),
    });
  },
});

export const callHeartbeat = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const userId = await requireAuth(ctx);
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_userId", (q) => q.eq("callId", callId).eq("userId", userId))
      .unique();
    if (participant && !participant.leftAt) {
      await ctx.db.patch(participant._id, { lastHeartbeat: Date.now() });
    }
  },
});

export const getActiveCall = query({
  args: { channelId: v.optional(v.id("channels")), dmThreadId: v.optional(v.id("directMessageThreads")) },
  handler: async (ctx, { channelId, dmThreadId }) => {
    const userId = await requireAuth(ctx);
    await requireVoiceChannelOrDmAccess(ctx, userId, channelId, dmThreadId);

    const call = channelId
      ? await ctx.db
          .query("calls")
          .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
          .filter((q) => q.eq(q.field("endedAt"), undefined))
          .unique()
      : await ctx.db
          .query("calls")
          .withIndex("by_dmThreadId", (q) => q.eq("dmThreadId", dmThreadId))
          .filter((q) => q.eq(q.field("endedAt"), undefined))
          .unique();

    if (!call) return null;
    const active = await activeParticipants(ctx, call._id);
    const withUsers = await Promise.all(
      active.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, displayName: user?.displayName ?? "Unknown" };
      }),
    );
    return { callId: call._id, participants: withUsers };
  },
});

export const listVoiceChannelOccupancy = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await requireAuth(ctx);
    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId_and_userId", (q) =>
        q.eq("serverId", serverId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("Not a member of this server");

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
      .collect();
    const voiceChannels = channels.filter((c) => c.type === "voice");

    return await Promise.all(
      voiceChannels.map(async (channel) => {
        const call = await ctx.db
          .query("calls")
          .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("endedAt"), undefined))
          .unique();
        if (!call) return { channelId: channel._id, members: [] as string[] };
        const active = await activeParticipants(ctx, call._id);
        const users = await Promise.all(active.map((p) => ctx.db.get(p.userId)));
        return {
          channelId: channel._id,
          members: users.filter(Boolean).map((u) => u!.displayName),
        };
      }),
    );
  },
});
