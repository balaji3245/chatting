import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center min-h-screen p-4 sm:p-6 bg-[#f0f2f5]">
      <div className="w-full max-w-md space-y-6">


        <LoginForm />


      </div>
    </main>
  );
}
