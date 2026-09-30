import { redirect } from "next/navigation";
import { api } from "../../../../db/convex/_generated/api";
import { ConversationHome } from "../../features/conversation/components/conversation-home";
import { getConvexAuth } from "../../lib/convex-auth";

export default async function ConversationPage() {
  const auth = getConvexAuth();
  if (!(await auth.isAuthenticated())) redirect("/?session=expired");

  const user = await auth.fetchAuthQuery(api.user.getCurrentUser, {});
  if (!user.onboardingCompletedAt) redirect(user.termsAcceptedAt ? "/onboarding/avatar" : "/onboarding/terms");
  return <ConversationHome name={user.name} phoneNumber={user.phoneNumber} userId={user._id} />;

  // return <ConversationHome name="Rohit" phoneNumber="+919999999999" userId="user_1" />;
}
