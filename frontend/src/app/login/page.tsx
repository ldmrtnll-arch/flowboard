import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";


type LoginPageProps = {
  searchParams: Promise<{ registered?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to your FlowBoard workspace."
      footerText="New to FlowBoard?"
      footerLinkLabel="Create an account"
      footerHref="/register"
    >
      <LoginForm accountCreated={params.registered === "1"} />
    </AuthShell>
  );
}
