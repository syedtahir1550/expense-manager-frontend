import axios from "./axios";

export const getExpenses = () => axios.get("/api/expenses");

export const createExpense = (payload) => axios.post("/api/expenses", payload);
