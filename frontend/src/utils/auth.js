const getStoredToken = () => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return typeof token === "string" ? token.trim() : "";
};

const getStoredUser = () => {
  const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    return null;
  }
};

const clearStoredAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};

const setStoredAuth = ({ token, user }) => {
  if (token) {
    sessionStorage.setItem("token", token);
  }

  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const getLoginPathForRole = (role) => {
  if (role === "admin") {
    return "/admin/login";
  }

  if (role === "worker") {
    return "/worker/login";
  }

  return "/student/login";
};

export {
  clearStoredAuth,
  getLoginPathForRole,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
};
