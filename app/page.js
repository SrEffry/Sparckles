import { redirect } from "next/navigation";

// Entrada: el panel valida la sesión y, si no hay, redirige a /login.
export default function Home() {
  redirect("/dashboard");
}
