import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const PRESENCE_TIMEOUT_MS = 10_000; // FR: presence must flip within 10s (Clarifications)

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: { displayName: v.optional(v.string()), avatarUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      ...(args.displayName !== undefined ? { displayName: args.displayName } : {}),
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
    });
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", { userId, lastSeen: Date.now() });
    }
  },
});

export const getPresence = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, { userIds }) => {
    const now = Date.now();
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const row = await ctx.db
          .query("presence")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
        const isOnline = !!row && now - row.lastSeen < PRESENCE_TIMEOUT_MS;
        return { userId, isOnline };
      }),
    );
    return results;
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Cascade-delete every server this user owns (FR-027: no ownership transfer in v1).
    const owned = await ctx.db
      .query("servers")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .collect();
    for (const server of owned) {
      const channels = await ctx.db
        .query("channels")
        .withIndex("by_serverId", (q) => q.eq("serverId", server._id))
        .collect();
      for (const channel of channels) {
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_channelId_createdAt", (q) => q.eq("channelId", channel._id))
          .collect();
        for (const m of msgs) await ctx.db.delete(m._id);
        await ctx.db.delete(channel._id);
      }
      const members = await ctx.db
        .query("serverMembers")
        .withIndex("by_serverId", (q) => q.eq("serverId", server._id))
        .collect();
      for (const m of members) await ctx.db.delete(m._id);
      await ctx.db.delete(server._id);
    }

    // Remove membership rows in servers this user doesn't own.
    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    await ctx.db.delete(userId);
  },
});
