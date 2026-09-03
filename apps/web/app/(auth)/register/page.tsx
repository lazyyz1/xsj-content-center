import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") redirect("/login");
  return <AuthForm mode="register" />;
}
