import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function requireActiveParticipant(
  ctx: QueryCtx | MutationCtx,
  callId: Id<"calls">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const participant = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId_userId", (q) => q.eq("callId", callId).eq("userId", userId))
    .unique();
  if (!participant || participant.leftAt) throw new Error("Not an active participant in this call");
  return userId;
}

export const sendSignal = mutation({
  args: {
    callId: v.id("calls"),
    toUserId: v.id("users"),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    payload: v.string(),
  },
  handler: async (ctx, { callId, toUserId, type, payload }) => {
    const fromUserId = await requireActiveParticipant(ctx, callId);
    const toParticipant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_userId", (q) => q.eq("callId", callId).eq("userId", toUserId))
      .unique();
    if (!toParticipant || toParticipant.leftAt) {
      throw new Error("Recipient is not an active participant in this call");
    }
    await ctx.db.insert("signals", {
      callId,
      fromUserId,
      toUserId,
      type,
      payload,
      createdAt: Date.now(),
    });
  },
});

export const listSignalsForMe = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_callId_toUserId", (q) => q.eq("callId", callId).eq("toUserId", userId))
      .collect();
    return rows.filter((r) => !r.consumedAt).sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const ackSignal = mutation({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const signal = await ctx.db.get(signalId);
    if (!signal || signal.toUserId !== userId) throw new Error("Signal not found");
    await ctx.db.patch(signalId, { consumedAt: Date.now() });
  },
});
