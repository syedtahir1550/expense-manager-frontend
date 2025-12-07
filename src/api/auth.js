import axios from "./axios";

export const login = (email, password) => {
  return axios.post("/api/auth/login", {
    email,
    password,
  });
};

export const register = (email, password) => {
  return axios.post("/api/users", {
    email,
    password,
  });
};
