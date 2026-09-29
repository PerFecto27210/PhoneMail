import { AuthForm } from "../../features/auth/components/auth-form";

type AuthPageProps = {
  searchParams: Promise<{ session?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { session } = await searchParams;
  return <AuthForm sessionExpired={session === "expired"} />;
}
