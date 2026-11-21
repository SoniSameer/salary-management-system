import { redirect } from "next/navigation";

// The directory is the home screen for the HR Manager.
export default function Home() {
  redirect("/employees");
}
