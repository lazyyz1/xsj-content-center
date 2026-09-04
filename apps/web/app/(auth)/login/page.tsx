import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <AuthForm mode="login" allowRegistration={process.env.INTERNAL_SIGNUP_ENABLED === "true"} />;
}
