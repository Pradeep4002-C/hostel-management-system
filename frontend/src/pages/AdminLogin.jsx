import { ShieldCheck } from "lucide-react";
import RoleLoginPage from "../components/auth/RoleLoginPage";

export default function AdminLogin() {
  return <RoleLoginPage role="admin" icon={ShieldCheck} title="Admin sign in" subtitle="Manage complaints, workers, and assignments." />;
}
