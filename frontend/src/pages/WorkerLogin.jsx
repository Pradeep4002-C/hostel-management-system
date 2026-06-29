import { Wrench } from "lucide-react";
import RoleLoginPage from "../components/auth/RoleLoginPage";

export default function WorkerLogin() {
  return <RoleLoginPage role="worker" icon={Wrench} title="Worker sign in" subtitle="View assignments and update completed work." />;
}
