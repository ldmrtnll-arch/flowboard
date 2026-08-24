import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";


export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start with the details you will use to access FlowBoard."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerHref="/login"
    >
      <RegisterForm />
    </AuthShell>
  );
}
