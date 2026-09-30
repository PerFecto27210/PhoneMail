import { redirect } from "next/navigation";
import { api } from "../../../../../db/convex/_generated/api";
import { AvatarStep } from "../../../features/onboarding/components/avatar-step";
import { getConvexAuth } from "../../../lib/convex-auth";

export default async function AvatarPage() {
  const auth = getConvexAuth();
  if (!(await auth.isAuthenticated())) redirect("/?session=expired");
  const state = await auth.fetchAuthQuery(api.user.getOnboardingState, {});
  if (state.onboardingComplete) redirect("/conversation");
  if (!state.termsAccepted) redirect("/onboarding/terms");
  return <AvatarStep />;
}
