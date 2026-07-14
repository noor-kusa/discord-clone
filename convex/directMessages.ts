import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const MAX_MESSAGE_LENGTH = 2000;

function canonicalPair(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

async function sharesAnyServer(
  ctx: QueryCtx | MutationCtx,
  userA: Id<"users">,
  userB: Id<"users">,
): Promise<boolean> {
  const membershipsA = await ctx.db
    .query("serverMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userA))
    .collect();
  const serverIdsA = new Set(membershipsA.map((m) => m.serverId));
  const membershipsB = await ctx.db
    .query("serverMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userB))
    .collect();
  return membershipsB.some((m) => serverIdsA.has(m.serverId));
}

async function requireThreadParticipant(
  ctx: QueryCtx | MutationCtx,
  dmThreadId: Id<"directMessageThreads">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const thread = await ctx.db.get(dmThreadId);
  if (!thread) throw new Error("Thread not found");
  if (thread.userAId !== userId && thread.userBId !== userId) {
    throw new Error("Not a participant in this conversation");
  }
  return userId;
}

export const getOrCreateDmThread = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, { otherUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === otherUserId) throw new Error("Cannot DM yourself");

    const shared = await sharesAnyServer(ctx, userId, otherUserId);
    if (!shared) throw new Error("You don't share a server with this user"); // FR-016

    const [userAId, userBId] = canonicalPair(userId, otherUserId);
    const existing = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_userA_userB", (q) => q.eq("userAId", userAId).eq("userBId", userBId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("directMessageThreads", {
      userAId,
      userBId,
      createdAt: Date.now(),
    });
  },
});

export const sendDmMessage = mutation({
  args: { dmThreadId: v.id("directMessageThreads"), content: v.string() },
  handler: async (ctx, { dmThreadId, content }) => {
    const userId = await requireThreadParticipant(ctx, dmThreadId);
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be 1-${MAX_MESSAGE_LENGTH} characters`);
    }
    await ctx.db.insert("messages", {
      dmThreadId,
      authorId: userId,
      content,
      createdAt: Date.now(),
    });
  },
});

export const editDmMessage = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  handler: async (ctx, { messageId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be 1-${MAX_MESSAGE_LENGTH} characters`);
    }
    const message = await ctx.db.get(messageId);
    if (!message || message.deletedAt || !message.dmThreadId) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Only the author can edit this message");
    await ctx.db.patch(messageId, { content, editedAt: Date.now() });
  },
});

export const deleteDmMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const message = await ctx.db.get(messageId);
    if (!message || message.deletedAt || !message.dmThreadId) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Only the author can delete this message");
    await ctx.db.patch(messageId, { deletedAt: Date.now(), content: "" });
  },
});

export const listDmMessages = query({
  args: { dmThreadId: v.id("directMessageThreads"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { dmThreadId, paginationOpts }) => {
    await requireThreadParticipant(ctx, dmThreadId);
    const page = await ctx.db
      .query("messages")
      .withIndex("by_dmThreadId_createdAt", (q) => q.eq("dmThreadId", dmThreadId))
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

const TYPING_STALE_MS = 3_000;

export const setDmTyping = mutation({
  args: { dmThreadId: v.id("directMessageThreads") },
  handler: async (ctx, { dmThreadId }) => {
    const userId = await requireThreadParticipant(ctx, dmThreadId);
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_dmThreadId", (q) => q.eq("dmThreadId", dmThreadId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: Date.now() });
    } else {
      await ctx.db.insert("typingIndicators", { dmThreadId, userId, updatedAt: Date.now() });
    }
  },
});

export const listDmTyping = query({
  args: { dmThreadId: v.id("directMessageThreads") },
  handler: async (ctx, { dmThreadId }) => {
    const userId = await requireThreadParticipant(ctx, dmThreadId);
    const now = Date.now();
    const rows = await ctx.db
      .query("typingIndicators")
      .withIndex("by_dmThreadId", (q) => q.eq("dmThreadId", dmThreadId))
      .collect();
    const active = rows.filter((r) => now - r.updatedAt < TYPING_STALE_MS && r.userId !== userId);
    const users = await Promise.all(active.map((r) => ctx.db.get(r.userId)));
    return users.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => u.displayName);
  },
});

export const listMyDmThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const asA = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_userA_userB", (q) => q.eq("userAId", userId))
      .collect();
    const all = await ctx.db.query("directMessageThreads").collect();
    const asB = all.filter((t) => t.userBId === userId);
    const threads = [...asA, ...asB];

    return await Promise.all(
      threads.map(async (t) => {
        const otherId = t.userAId === userId ? t.userBId : t.userAId;
        const other = await ctx.db.get(otherId);
        return { threadId: t._id, otherUser: other };
      }),
    );
  },
});
