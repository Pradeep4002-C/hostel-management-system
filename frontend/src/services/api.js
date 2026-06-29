import axios from "axios";
import { clearStoredAuth, getStoredToken } from "../utils/auth";

const getDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5001/api/v1";
  }

  return `${window.location.protocol}//${window.location.hostname}:5001/api/v1`;
};

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl(),
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      !/\/(student|admin|worker)\/login$/i.test(error.config?.url || "")
    ) {
      clearStoredAuth();
    }

    return Promise.reject(error);
  },
);

export default API;
