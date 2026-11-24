import { redirect } from "next/navigation";
import "./customer.css";
import { requireUser } from "@/lib/auth";
import { customerPermissions } from "@/lib/customer-validation";
import { Shell } from "@/components/shell";
import { CustomerManager } from "@/components/customer-manager";
export default async function Customers() {
  const user = await requireUser();
  const permissions = customerPermissions(user.role);
  if (!permissions.view) redirect("/");
  return (
    <Shell name={user.name} role={user.role}>
      <CustomerManager permissions={permissions} />
    </Shell>
  );
}
