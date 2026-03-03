import axios from "./axios";

export const getCurrentBudget = () => axios.get("/api/budget/current");

export const createOrUpdateBudget = (payload) =>
  axios.post("/api/budget", payload);
