import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/guards";
import LoginPage from "@/components/LoginPage";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "STUDENT" && !session.user.profileDone) redirect("/profile");
    redirect(homeFor(session.user.role));
  }
  return <LoginPage />;
}
