import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export function hasBlockRelationship(blockedByFirst: boolean, blockedBySecond: boolean): boolean {
  return blockedByFirst || blockedBySecond;
}

export function blocksConversation(
  type: "direct" | "group",
  blockedByFirst: boolean,
  blockedBySecond: boolean,
): boolean {
  return type === "direct" && hasBlockRelationship(blockedByFirst, blockedBySecond);
}

export async function conversationHasBlockRelationship(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);
  // Blocking applies to direct conversations. Shared group conversations stay
  // available so a block between two members doesn't silence unrelated people.
  if (!conversation || conversation.type !== "direct") return false;
  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  if (members.length !== 2) return false;
  const first = members[0]!.userId;
  const second = members[1]!.userId;
  const [firstBlockedSecond, secondBlockedFirst] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("blockerId", first).eq("blockedId", second))
      .first(),
    ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("blockerId", second).eq("blockedId", first))
      .first(),
  ]);
  return blocksConversation("direct", Boolean(firstBlockedSecond), Boolean(secondBlockedFirst));
}
