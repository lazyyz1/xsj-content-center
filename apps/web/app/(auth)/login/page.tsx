import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({searchParams}:{searchParams:Promise<{manual?:string}>}) {
  if(process.env.DEMO_AUTO_LOGIN === "true" && (await searchParams).manual !== "1") redirect("/experience");
  return <AuthForm mode="login" allowRegistration={process.env.INTERNAL_SIGNUP_ENABLED === "true"} />;
}
