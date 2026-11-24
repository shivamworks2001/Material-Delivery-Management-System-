import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { ProjectManager } from "@/components/project-manager";
export default async function Projects() {
  const actor = await requireUser();
  if (actor.role === "DELIVERY") redirect("/");
  return (
    <Shell name={actor.name} role={actor.role}>
      <p className="eyebrow">PROJECT MASTER</p>
      <h1>Projects</h1>
      <ProjectManager />
    </Shell>
  );
}
