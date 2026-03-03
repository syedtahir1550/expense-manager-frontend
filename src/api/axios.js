import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ AUTO attach token to every request
instance.interceptors.request.use((config) => {
  const token = (localStorage.getItem("token") || "")
    .replace(/^"+|"+$/g, "")
    .trim();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let redirectingToLogin = false;

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthRequest = url.includes("/api/auth/login");

    if ((status === 401 || status === 403) && !isAuthRequest) {
      localStorage.removeItem("token");

      if (!redirectingToLogin) {
        redirectingToLogin = true;
        window.location.href = "/login?reason=session_expired";
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
