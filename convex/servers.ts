import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  serverId: Id<"servers">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("serverMembers")
    .withIndex("by_serverId_and_userId", (q) =>
      q.eq("serverId", serverId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new Error("Not a member of this server");
  return membership;
}

function randomToken() {
  return Array.from({ length: 24 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
}

export const createServer = mutation({
  args: { name: v.string(), imageUrl: v.optional(v.string()) },
  handler: async (ctx, { name, imageUrl }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const serverId = await ctx.db.insert("servers", {
      name,
      imageUrl,
      ownerId: userId,
      inviteToken: randomToken(),
    });
    await ctx.db.insert("serverMembers", { serverId, userId, joinedAt: now });
    await ctx.db.insert("channels", {
      serverId,
      name: "general",
      type: "text",
      createdAt: now,
    });
    return serverId;
  },
});

export const renameServer = mutation({
  args: { serverId: v.id("servers"), name: v.string() },
  handler: async (ctx, { serverId, name }) => {
    const userId = await requireAuth(ctx);
    const server = await ctx.db.get(serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId !== userId) throw new Error("Only the owner can rename the server");
    await ctx.db.patch(serverId, { name });
  },
});

export const deleteServer = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await requireAuth(ctx);
    const server = await ctx.db.get(serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId !== userId) throw new Error("Only the owner can delete the server");
    await cascadeDeleteServer(ctx, serverId);
  },
});

export async function cascadeDeleteServer(ctx: MutationCtx, serverId: Id<"servers">) {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
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
    .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
    .collect();
  for (const m of members) await ctx.db.delete(m._id);
  await ctx.db.delete(serverId);
}

export const regenerateInvite = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await requireAuth(ctx);
    const server = await ctx.db.get(serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId !== userId) throw new Error("Only the owner can regenerate the invite");
    const inviteToken = randomToken();
    await ctx.db.patch(serverId, { inviteToken });
    return inviteToken;
  },
});

export const joinServerByInvite = mutation({
  args: { inviteToken: v.string() },
  handler: async (ctx, { inviteToken }) => {
    const userId = await requireAuth(ctx);
    const server = await ctx.db
      .query("servers")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", inviteToken))
      .unique();
    if (!server) throw new Error("Invalid invite link");
    const existing = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId_and_userId", (q) =>
        q.eq("serverId", server._id).eq("userId", userId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("serverMembers", {
        serverId: server._id,
        userId,
        joinedAt: Date.now(),
      });
    }
    return server._id;
  },
});

export const removeMember = mutation({
  args: { serverId: v.id("servers"), userId: v.id("users") },
  handler: async (ctx, { serverId, userId }) => {
    const callerId = await requireAuth(ctx);
    const server = await ctx.db.get(serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId !== callerId) throw new Error("Only the owner can remove members");
    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId_and_userId", (q) =>
        q.eq("serverId", serverId).eq("userId", userId),
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);
    // Disconnect the removed member from any active call in this server (Edge Cases).
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
      .collect();
    for (const channel of channels) {
      const call = await ctx.db
        .query("calls")
        .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .unique();
      if (call) {
        const participant = await ctx.db
          .query("callParticipants")
          .withIndex("by_callId_userId", (q) => q.eq("callId", call._id).eq("userId", userId))
          .unique();
        if (participant && !participant.leftAt) {
          await ctx.db.patch(participant._id, { leftAt: Date.now() });
        }
      }
    }
  },
});

export const leaveServer = mutation({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await requireAuth(ctx);
    const server = await ctx.db.get(serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId === userId) {
      // FR-027 / Clarifications: owner leaving deletes the whole server, no ownership transfer.
      await cascadeDeleteServer(ctx, serverId);
      return;
    }
    const membership = await requireMembership(ctx, serverId, userId);
    await ctx.db.delete(membership._id);
  },
});

export const listMyServers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const servers = await Promise.all(memberships.map((m) => ctx.db.get(m.serverId)));
    return servers.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

export const getServerMembers = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, { serverId }) => {
    const userId = await requireAuth(ctx);
    await requireMembership(ctx, serverId, userId);

    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
      .collect();
    const users = await Promise.all(memberships.map((m) => ctx.db.get(m.userId)));
    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});
