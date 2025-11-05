import { redirect } from "next/navigation";

export default function LearnIndexPage() {
  // Redirect /learn to a default dynamic route
  redirect("/learn/welcome");
}
