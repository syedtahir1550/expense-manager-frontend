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

export default instance;
