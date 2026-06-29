import { GraduationCap } from "lucide-react";
import RoleLoginPage from "../components/auth/RoleLoginPage";

export default function StudentLogin() {
  return <RoleLoginPage role="student" icon={GraduationCap} title="Student sign in" subtitle="Report an issue or check its progress." allowRegister />;
}
