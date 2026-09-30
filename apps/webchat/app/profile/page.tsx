import { redirect } from "next/navigation";
import { api } from "../../../../db/convex/_generated/api";
import { ProfilePage } from "../../features/profile/components/profile-page";
import { getConvexAuth } from "../../lib/convex-auth";

export default async function Page() {
  const auth = getConvexAuth();
  if (!(await auth.isAuthenticated())) redirect("/?session=expired");
  const user = await auth.fetchAuthQuery(api.user.getCurrentUser, {});
  if (!user.onboardingCompletedAt) redirect(user.termsAcceptedAt ? "/onboarding/avatar" : "/onboarding/terms");
  return <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6"><ProfilePage /></main>;
}
