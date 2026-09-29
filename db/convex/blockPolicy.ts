import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export function hasBlockRelationship(blockedByFirst: boolean, blockedBySecond: boolean): boolean {
  return blockedByFirst || blockedBySecond;
}

export async function conversationHasBlockRelationship(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<boolean> {
  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const first = members[i]!.userId;
      const second = members[j]!.userId;
      const [firstBlockedSecond, secondBlockedFirst] = await Promise.all([
        ctx.db
          .query("blocks")
          .withIndex("by_pair", (q) =>
            q.eq("blockerId", first).eq("blockedId", second),
          )
          .first(),
        ctx.db
          .query("blocks")
          .withIndex("by_pair", (q) =>
            q.eq("blockerId", second).eq("blockedId", first),
          )
          .first(),
      ]);
      if (hasBlockRelationship(Boolean(firstBlockedSecond), Boolean(secondBlockedFirst))) {
        return true;
      }
    }
  }
  return false;
}
