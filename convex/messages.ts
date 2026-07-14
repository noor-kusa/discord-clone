import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const MAX_MESSAGE_LENGTH = 2000; // FR-023
const TYPING_STALE_MS = 3_000;

async function requireChannelMembership(
  ctx: QueryCtx | MutationCtx,
  channelId: Id<"channels">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const channel = await ctx.db.get(channelId);
  if (!channel) throw new Error("Channel not found");
  const membership = await ctx.db
    .query("serverMembers")
    .withIndex("by_serverId_and_userId", (q) =>
      q.eq("serverId", channel.serverId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new Error("Not a member of this server");
  return userId;
}

export const sendMessage = mutation({
  args: { channelId: v.id("channels"), content: v.string() },
  handler: async (ctx, { channelId, content }) => {
    const userId = await requireChannelMembership(ctx, channelId);
    if (content.length === 0) throw new Error("Message cannot be empty");
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds ${MAX_MESSAGE_LENGTH} character limit`);
    }
    await ctx.db.insert("messages", {
      channelId,
      authorId: userId,
      content,
      createdAt: Date.now(),
    });
  },
});

export const editMessage = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  handler: async (ctx, { messageId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be 1-${MAX_MESSAGE_LENGTH} characters`);
    }
    const message = await ctx.db.get(messageId);
    if (!message || message.deletedAt) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Only the author can edit this message");
    await ctx.db.patch(messageId, { content, editedAt: Date.now() });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const message = await ctx.db.get(messageId);
    if (!message || message.deletedAt) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Only the author can delete this message");
    await ctx.db.patch(messageId, { deletedAt: Date.now(), content: "" });
  },
});

export const listMessages = query({
  args: { channelId: v.id("channels"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { channelId, paginationOpts }) => {
    await requireChannelMembership(ctx, channelId);
    const page = await ctx.db
      .query("messages")
      .withIndex("by_channelId_createdAt", (q) => q.eq("channelId", channelId))
      .order("desc")
      .paginate(paginationOpts);

    const authorIds = Array.from(new Set(page.page.map((m) => m.authorId)));
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const authorById = new Map(authors.filter(Boolean).map((a) => [a!._id, a!]));

    return {
      ...page,
      page: page.page.map((m) => ({
        ...m,
        authorName: authorById.get(m.authorId)?.displayName ?? "Unknown",
        authorAvatarUrl: authorById.get(m.authorId)?.avatarUrl,
      })),
    };
  },
});

export const setTyping = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, { channelId }) => {
    const userId = await requireChannelMembership(ctx, channelId);
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: Date.now() });
    } else {
      await ctx.db.insert("typingIndicators", { channelId, userId, updatedAt: Date.now() });
    }
  },
});

export const listTyping = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, { channelId }) => {
    const userId = await requireChannelMembership(ctx, channelId);
    const now = Date.now();
    const rows = await ctx.db
      .query("typingIndicators")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    const active = rows.filter((r) => now - r.updatedAt < TYPING_STALE_MS && r.userId !== userId);
    const users = await Promise.all(active.map((r) => ctx.db.get(r.userId)));
    return users.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => u.displayName);
  },
});
