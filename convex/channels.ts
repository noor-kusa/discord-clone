import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function requireOwner(ctx: MutationCtx, serverId: Id<"servers">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const server = await ctx.db.get(serverId);
  if (!server) throw new Error("Server not found");
  if (server.ownerId !== userId) throw new Error("Only the owner can manage channels");
  return userId;
}

export const createChannel = mutation({
  args: {
    serverId: v.id("servers"),
    name: v.string(),
    type: v.union(v.literal("text"), v.literal("voice")),
  },
  handler: async (ctx, { serverId, name, type }) => {
    await requireOwner(ctx, serverId);
    return await ctx.db.insert("channels", { serverId, name, type, createdAt: Date.now() });
  },
});

export const renameChannel = mutation({
  args: { channelId: v.id("channels"), name: v.string() },
  handler: async (ctx, { channelId, name }) => {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found");
    await requireOwner(ctx, channel.serverId);
    await ctx.db.patch(channelId, { name });
  },
});

export const deleteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, { channelId }) => {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found");
    await requireOwner(ctx, channel.serverId);

    // FR-009: deleting a text channel removes its message history.
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_channelId_createdAt", (q) => q.eq("channelId", channelId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);

    // FR-022 / Clarifications: deleting a voice channel ends its active call immediately.
    if (channel.type === "voice") {
      const call = await ctx.db
        .query("calls")
        .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .unique();
      if (call) {
        await ctx.db.patch(call._id, { endedAt: Date.now() });
        const participants = await ctx.db
          .query("callParticipants")
          .withIndex("by_callId", (q) => q.eq("callId", call._id))
          .collect();
        for (const p of participants) {
          if (!p.leftAt) await ctx.db.patch(p._id, { leftAt: Date.now() });
        }
      }
    }

    await ctx.db.delete(channelId);
  },
});

export const listChannels = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId_and_userId", (q) =>
        q.eq("serverId", serverId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("Not a member of this server");

    return await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
      .collect();
  },
});
