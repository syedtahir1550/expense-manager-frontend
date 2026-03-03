import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrUpdateBudget, getCurrentBudget } from "../api/budget";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "../api/expenses";

const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();
const pageSize = 5;

const initialExpenseForm = {
  amount: "",
  category: "",
  description: "",
  expenseDate: new Date().toISOString().slice(0, 10),
};

const initialExpenseFilters = {
  category: "",
  month: "",
  year: "",
};

const initialBudgetForm = {
  monthlyIncome: "",
  totalEmi: "",
  monthlySavings: "",
  month: currentMonth,
  year: currentYear,
};

const getErrorText = (prefix, err) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const detail =
    typeof data === "string"
      ? data
      : data?.message || data?.error || "Unknown error";
  return `${prefix}${status ? ` (${status})` : ""}: ${detail}`;
};

const buildExpenseQueryParams = (filters, page) => {
  const params = {
    page,
    size: pageSize,
  };
  if (filters.category.trim()) {
    params.category = filters.category.trim();
  }
  if (filters.month) {
    params.month = Number(filters.month);
  }
  if (filters.year) {
    params.year = Number(filters.year);
  }
  return params;
};

function Dashboard() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [expenseFilters, setExpenseFilters] = useState(initialExpenseFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [editExpenseForm, setEditExpenseForm] = useState(initialExpenseForm);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState("");

  const [budget, setBudget] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);

  const total = useMemo(
    () =>
      expenses.reduce((sum, expense) => {
        const amount = Number(expense.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [expenses]
  );

  const loadExpenses = async (page = 0, filters = expenseFilters) => {
    try {
      setExpenseLoading(true);
      setExpenseError("");
      const params = buildExpenseQueryParams(filters, page);
      const res = await getExpenses(params);
      const data = res.data;

      if (Array.isArray(data)) {
        setExpenses(data);
        setCurrentPage(0);
        setTotalPages(1);
        setTotalElements(data.length);
        return;
      }

      setExpenses(data?.content ?? []);
      setCurrentPage(data?.number ?? page);
      setTotalPages(Math.max(data?.totalPages ?? 1, 1));
      setTotalElements(data?.totalElements ?? 0);
    } catch (err) {
      setExpenseError(getErrorText("Unable to load expenses", err));
      console.error(err);
    } finally {
      setExpenseLoading(false);
    }
  };

  const loadCurrentBudget = async () => {
    try {
      setBudgetLoading(true);
      setBudgetError("");
      const res = await getCurrentBudget();
      setBudget(res.data ?? null);
      if (res.data) {
        setBudgetForm({
          monthlyIncome: res.data.monthlyIncome ?? "",
          totalEmi: res.data.totalEmi ?? "",
          monthlySavings: res.data.monthlySavings ?? "",
          month: res.data.month ?? currentMonth,
          year: res.data.year ?? currentYear,
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setBudget(null);
      } else {
        setBudgetError(getErrorText("Unable to load current budget", err));
      }
      console.error(err);
    } finally {
      setBudgetLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses(0, initialExpenseFilters);
    loadCurrentBudget();
  }, []);

  const onExpenseChange = (event) => {
    const { name, value } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: value }));
  };

  const onEditExpenseChange = (event) => {
    const { name, value } = event.target;
    setEditExpenseForm((prev) => ({ ...prev, [name]: value }));
  };

  const onExpenseFilterChange = (event) => {
    const { name, value } = event.target;
    setExpenseFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onBudgetChange = (event) => {
    const { name, value } = event.target;
    setBudgetForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateExpense = async (event) => {
    event.preventDefault();

    if (!expenseForm.amount || !expenseForm.expenseDate) {
      setExpenseError("Amount and date are required.");
      return;
    }

    try {
      setExpenseSubmitting(true);
      setExpenseError("");
      await createExpense({
        amount: Number(expenseForm.amount),
        category: expenseForm.category || "General",
        description: expenseForm.description || "",
        expenseDate: expenseForm.expenseDate,
      });

      setExpenseForm({
        ...initialExpenseForm,
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      await loadExpenses(0, expenseFilters);
    } catch (err) {
      setExpenseError(getErrorText("Unable to create expense", err));
      console.error(err);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const onStartExpenseEdit = (expense) => {
    setEditingExpenseId(expense.id);
    setEditExpenseForm({
      amount: String(expense.amount ?? ""),
      category: expense.category ?? "",
      description: expense.description ?? "",
      expenseDate: expense.expenseDate ?? new Date().toISOString().slice(0, 10),
    });
  };

  const onCancelExpenseEdit = () => {
    setEditingExpenseId("");
    setEditExpenseForm(initialExpenseForm);
  };

  const onSaveExpenseEdit = async (expenseId) => {
    if (!editExpenseForm.amount || !editExpenseForm.expenseDate) {
      setExpenseError("Amount and date are required.");
      return;
    }

    try {
      setIsUpdatingExpense(true);
      setExpenseError("");
      await updateExpense(expenseId, {
        amount: Number(editExpenseForm.amount),
        category: editExpenseForm.category || "General",
        description: editExpenseForm.description || "",
        expenseDate: editExpenseForm.expenseDate,
      });
      onCancelExpenseEdit();
      await loadExpenses(currentPage, expenseFilters);
    } catch (err) {
      setExpenseError(getErrorText("Unable to update expense", err));
      console.error(err);
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const onDeleteExpense = async (expenseId) => {
    const shouldDelete = window.confirm(
      "Delete this expense? This action cannot be undone."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingExpenseId(expenseId);
      setExpenseError("");
      await deleteExpense(expenseId);

      const nextPage = expenses.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      await loadExpenses(nextPage, expenseFilters);
    } catch (err) {
      setExpenseError(getErrorText("Unable to delete expense", err));
      console.error(err);
    } finally {
      setDeletingExpenseId("");
    }
  };

  const onApplyExpenseFilters = async (event) => {
    event.preventDefault();
    await loadExpenses(0, expenseFilters);
  };

  const onClearExpenseFilters = async () => {
    setExpenseFilters(initialExpenseFilters);
    await loadExpenses(0, initialExpenseFilters);
  };

  const onChangePage = async (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === currentPage) {
      return;
    }
    await loadExpenses(nextPage, expenseFilters);
  };

  const onSaveBudget = async (event) => {
    event.preventDefault();

    if (!budgetForm.monthlyIncome || !budgetForm.totalEmi || !budgetForm.monthlySavings) {
      setBudgetError("Monthly income, total EMI, and monthly savings are required.");
      return;
    }

    try {
      setBudgetSubmitting(true);
      setBudgetError("");
      const payload = {
        monthlyIncome: Number(budgetForm.monthlyIncome),
        totalEmi: Number(budgetForm.totalEmi),
        monthlySavings: Number(budgetForm.monthlySavings),
        month: Number(budgetForm.month),
        year: Number(budgetForm.year),
      };
      const res = await createOrUpdateBudget(payload);
      setBudget(res.data ?? null);
    } catch (err) {
      setBudgetError(getErrorText("Unable to save budget", err));
      console.error(err);
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1>Expense Dashboard</h1>

      <div style={{ marginBottom: 24 }}>
        <button onClick={logout}>Logout</button>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2>Monthly Budget</h2>

        <form onSubmit={onSaveBudget} style={{ marginBottom: 16 }}>
          <input
            name="monthlyIncome"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monthly Income"
            value={budgetForm.monthlyIncome}
            onChange={onBudgetChange}
            required
          />
          <br />
          <br />
          <input
            name="totalEmi"
            type="number"
            step="0.01"
            min="0"
            placeholder="Total EMI"
            value={budgetForm.totalEmi}
            onChange={onBudgetChange}
            required
          />
          <br />
          <br />
          <input
            name="monthlySavings"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monthly Savings"
            value={budgetForm.monthlySavings}
            onChange={onBudgetChange}
            required
          />
          <br />
          <br />
          <input
            name="month"
            type="number"
            min="1"
            max="12"
            placeholder="Month"
            value={budgetForm.month}
            onChange={onBudgetChange}
            required
          />
          <br />
          <br />
          <input
            name="year"
            type="number"
            min="2000"
            placeholder="Year"
            value={budgetForm.year}
            onChange={onBudgetChange}
            required
          />
          <br />
          <br />
          <button type="submit" disabled={budgetSubmitting}>
            {budgetSubmitting ? "Saving..." : "Save Budget"}
          </button>
        </form>

        {budgetError ? <p style={{ color: "crimson" }}>{budgetError}</p> : null}

        {budgetLoading ? <p>Loading current budget...</p> : null}
        {!budgetLoading && budget ? (
          <div>
            <p>
              Current Month Budget: <strong>{budget.monthlyBudget}</strong>
            </p>
            <p>
              Daily Budget: <strong>{budget.dailyBudget}</strong>
            </p>
            <p>
              Period:{" "}
              <strong>
                {budget.month}/{budget.year}
              </strong>
            </p>
          </div>
        ) : null}
        {!budgetLoading && !budget ? <p>No budget set for current month.</p> : null}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Add Expense</h2>
        <form onSubmit={onCreateExpense}>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={onExpenseChange}
            required
          />
          <br />
          <br />
          <input
            name="category"
            placeholder="Category (e.g. Food)"
            value={expenseForm.category}
            onChange={onExpenseChange}
          />
          <br />
          <br />
          <input
            name="description"
            placeholder="Description"
            value={expenseForm.description}
            onChange={onExpenseChange}
          />
          <br />
          <br />
          <input
            name="expenseDate"
            type="date"
            value={expenseForm.expenseDate}
            onChange={onExpenseChange}
            required
          />
          <br />
          <br />
          <button type="submit" disabled={expenseSubmitting}>
            {expenseSubmitting ? "Saving..." : "Save Expense"}
          </button>
        </form>
        {expenseError ? <p style={{ color: "crimson" }}>{expenseError}</p> : null}
      </section>

      <section>
        <h2>Your Expenses</h2>

        <form onSubmit={onApplyExpenseFilters} style={{ marginBottom: 16 }}>
          <input
            name="category"
            placeholder="Filter by category"
            value={expenseFilters.category}
            onChange={onExpenseFilterChange}
          />
          <br />
          <br />
          <input
            name="month"
            type="number"
            min="1"
            max="12"
            placeholder="Month (1-12)"
            value={expenseFilters.month}
            onChange={onExpenseFilterChange}
          />
          <br />
          <br />
          <input
            name="year"
            type="number"
            min="2000"
            placeholder="Year"
            value={expenseFilters.year}
            onChange={onExpenseFilterChange}
          />
          <br />
          <br />
          <button type="submit">Apply Filters</button>{" "}
          <button type="button" onClick={onClearExpenseFilters}>
            Clear Filters
          </button>
        </form>

        {expenseLoading ? <p>Loading expenses...</p> : null}
        {!expenseLoading && expenses.length === 0 ? <p>No expenses found for current criteria.</p> : null}
        {!expenseLoading && expenses.length > 0 ? (
          <>
            <p>
              Page Total: <strong>{total.toFixed(2)}</strong>
            </p>
            <p>
              Records: <strong>{totalElements}</strong>
            </p>
            <table border="1" cellPadding="8" cellSpacing="0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const isEditing = editingExpenseId === expense.id;
                  return (
                    <tr key={expense.id}>
                      <td>
                        {isEditing ? (
                          <input
                            name="expenseDate"
                            type="date"
                            value={editExpenseForm.expenseDate}
                            onChange={onEditExpenseChange}
                          />
                        ) : (
                          expense.expenseDate
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            name="category"
                            value={editExpenseForm.category}
                            onChange={onEditExpenseChange}
                          />
                        ) : (
                          expense.category || "-"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            name="description"
                            value={editExpenseForm.description}
                            onChange={onEditExpenseChange}
                          />
                        ) : (
                          expense.description || "-"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editExpenseForm.amount}
                            onChange={onEditExpenseChange}
                          />
                        ) : (
                          expense.amount
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isUpdatingExpense}
                              onClick={() => onSaveExpenseEdit(expense.id)}
                            >
                              {isUpdatingExpense ? "Saving..." : "Save"}
                            </button>{" "}
                            <button type="button" onClick={onCancelExpenseEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => onStartExpenseEdit(expense)}>
                              Edit
                            </button>{" "}
                            <button
                              type="button"
                              disabled={deletingExpenseId === expense.id}
                              onClick={() => onDeleteExpense(expense.id)}
                            >
                              {deletingExpenseId === expense.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                disabled={expenseLoading || currentPage <= 0}
                onClick={() => onChangePage(currentPage - 1)}
              >
                Previous
              </button>{" "}
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>{" "}
              <button
                type="button"
                disabled={expenseLoading || currentPage >= totalPages - 1}
                onClick={() => onChangePage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default Dashboard;
