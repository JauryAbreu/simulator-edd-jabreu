import { redirect } from "next/navigation";

// Redirige la raíz a la landing
export default function RootPage() {
  redirect("/home");
}
