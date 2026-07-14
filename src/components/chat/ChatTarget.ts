import { Id } from "../../../convex/_generated/dataModel";

export type ChatTarget =
  | { kind: "channel"; channelId: Id<"channels"> }
  | { kind: "dm"; dmThreadId: Id<"directMessageThreads"> };
