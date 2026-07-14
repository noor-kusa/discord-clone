import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extend Convex Auth's own `users` table (email, etc.) with our profile fields,
  // instead of layering a second colliding `users` table on top of it.
  users: defineTable({
    ...authTables.users.validator.fields,
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  }).index("email", ["email"]),

  presence: defineTable({
    userId: v.id("users"),
    lastSeen: v.number(),
  }).index("by_userId", ["userId"]),

  servers: defineTable({
    name: v.string(),
    imageUrl: v.optional(v.string()),
    ownerId: v.id("users"),
    inviteToken: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_inviteToken", ["inviteToken"]),

  serverMembers: defineTable({
    serverId: v.id("servers"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_serverId", ["serverId"])
    .index("by_userId", ["userId"])
    .index("by_serverId_and_userId", ["serverId", "userId"]),

  channels: defineTable({
    serverId: v.id("servers"),
    name: v.string(),
    type: v.union(v.literal("text"), v.literal("voice")),
    createdAt: v.number(),
  }).index("by_serverId", ["serverId"]),

  messages: defineTable({
    channelId: v.optional(v.id("channels")),
    dmThreadId: v.optional(v.id("directMessageThreads")),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_channelId_createdAt", ["channelId", "createdAt"])
    .index("by_dmThreadId_createdAt", ["dmThreadId", "createdAt"]),

  typingIndicators: defineTable({
    channelId: v.optional(v.id("channels")),
    dmThreadId: v.optional(v.id("directMessageThreads")),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_dmThreadId", ["dmThreadId"]),

  directMessageThreads: defineTable({
    userAId: v.id("users"),
    userBId: v.id("users"),
    createdAt: v.number(),
  }).index("by_userA_userB", ["userAId", "userBId"]),

  calls: defineTable({
    channelId: v.optional(v.id("channels")),
    dmThreadId: v.optional(v.id("directMessageThreads")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_channelId", ["channelId"])
    .index("by_dmThreadId", ["dmThreadId"]),

  callParticipants: defineTable({
    callId: v.id("calls"),
    userId: v.id("users"),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    micOn: v.boolean(),
    cameraOn: v.boolean(),
    lastHeartbeat: v.number(),
  })
    .index("by_callId", ["callId"])
    .index("by_callId_userId", ["callId", "userId"]),

  signals: defineTable({
    callId: v.id("calls"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    payload: v.string(),
    createdAt: v.number(),
    consumedAt: v.optional(v.number()),
  }).index("by_callId_toUserId", ["callId", "toUserId"]),
});
