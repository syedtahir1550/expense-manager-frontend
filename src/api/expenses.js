import axios from "./axios";

export const getExpenses = (params = {}) => axios.get("/api/expenses", { params });

export const createExpense = (payload) => axios.post("/api/expenses", payload);

export const updateExpense = (id, payload) => axios.put(`/api/expenses/${id}`, payload);

export const deleteExpense = (id) => axios.delete(`/api/expenses/${id}`);
