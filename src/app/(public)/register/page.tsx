import { redirect } from "next/navigation";

// Register is now part of the login page (tab-based).
export default function RegisterPage() {
  redirect("/login?tab=register");
}
