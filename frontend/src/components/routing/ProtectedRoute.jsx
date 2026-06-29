import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  clearStoredAuth,
  getLoginPathForRole,
  getStoredToken,
  getStoredUser,
} from "../../utils/auth";

function ProtectedRoute({ children, role }) {
  const [, setAuthCheckVersion] = useState(0);

  useEffect(() => {
    const refreshAuthState = () => {
      setAuthCheckVersion((version) => version + 1);
    };

    window.addEventListener("pageshow", refreshAuthState);
    window.addEventListener("focus", refreshAuthState);
    window.addEventListener("storage", refreshAuthState);

    return () => {
      window.removeEventListener("pageshow", refreshAuthState);
      window.removeEventListener("focus", refreshAuthState);
      window.removeEventListener("storage", refreshAuthState);
    };
  }, []);

  const token = getStoredToken();
  const user = getStoredUser();

  if (!token) {
    return <Navigate to={getLoginPathForRole(role || user?.role)} replace />;
  }

  if (!user) {
    clearStoredAuth();
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    clearStoredAuth();
    return <Navigate to={getLoginPathForRole(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
