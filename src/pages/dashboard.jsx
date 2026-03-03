import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrUpdateBudget, getCurrentBudget } from "../api/budget";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "../api/expenses";
import "./dashboard.css";

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

const sumExpenseAmounts = (items) =>
  items.reduce((sum, item) => {
    const amount = Number(item.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

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
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  const total = useMemo(() => sumExpenseAmounts(expenses), [expenses]);

  const monthlyBudgetValue = Number(budget?.monthlyBudget);
  const dailyBudgetValue = Number(budget?.dailyBudget);
  const hasValidBudget = Number.isFinite(monthlyBudgetValue) && monthlyBudgetValue > 0;
  const hasValidDailyBudget = Number.isFinite(dailyBudgetValue) && dailyBudgetValue >= 0;
  const remainingBudget = hasValidBudget ? monthlyBudgetValue - monthlySpent : null;
  const utilization = hasValidBudget ? (monthlySpent / monthlyBudgetValue) * 100 : null;
  const utilizationTone =
    utilization >= 100 ? "tone-danger" : utilization >= 80 ? "tone-warning" : "tone-good";

  const todayDayOfMonth = today.getDate();
  const expectedTillToday =
    hasValidDailyBudget && budget?.month === currentMonth && budget?.year === currentYear
      ? dailyBudgetValue * todayDayOfMonth
      : null;
  const actualTillToday =
    budget?.month === currentMonth && budget?.year === currentYear ? monthlySpent : null;
  const deltaTillToday =
    expectedTillToday !== null && actualTillToday !== null
      ? expectedTillToday - actualTillToday
      : null;
  const deltaTone =
    deltaTillToday === null
      ? ""
      : deltaTillToday > 0
        ? "tone-good"
        : deltaTillToday < 0
          ? "tone-danger"
          : "tone-warning";
  const formattedDelta =
    deltaTillToday === null
      ? "-"
      : `${deltaTillToday > 0 ? "+" : ""}${deltaTillToday.toFixed(2)}`;

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

  const loadMonthlySpent = async (month, year) => {
    if (!month || !year) {
      setMonthlySpent(0);
      setInsightsError("");
      return;
    }

    try {
      setInsightsLoading(true);
      setInsightsError("");

      let page = 0;
      let totalPagesFromApi = 1;
      let aggregated = 0;

      while (page < totalPagesFromApi) {
        const res = await getExpenses({
          month,
          year,
          page,
          size: 100,
        });
        const data = res.data;

        if (Array.isArray(data)) {
          aggregated = sumExpenseAmounts(data);
          break;
        }

        const pageItems = data?.content ?? [];
        aggregated += sumExpenseAmounts(pageItems);
        totalPagesFromApi = data?.totalPages ?? 1;
        page += 1;
      }

      setMonthlySpent(aggregated);
    } catch (err) {
      setInsightsError(getErrorText("Unable to calculate spending insights", err));
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadCurrentBudget = async () => {
    try {
      setBudgetLoading(true);
      setBudgetError("");
      const res = await getCurrentBudget();
      setBudget(res.data ?? null);
      if (res.data) {
        setInsightsError("");
        setBudgetForm({
          monthlyIncome: res.data.monthlyIncome ?? "",
          totalEmi: res.data.totalEmi ?? "",
          monthlySavings: res.data.monthlySavings ?? "",
          month: res.data.month ?? currentMonth,
          year: res.data.year ?? currentYear,
        });
        await loadMonthlySpent(res.data.month, res.data.year);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setBudget(null);
        setMonthlySpent(0);
        setInsightsError("");
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
      if (budget) {
        await loadMonthlySpent(budget.month, budget.year);
      }
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
      if (budget) {
        await loadMonthlySpent(budget.month, budget.year);
      }
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

      const nextPage =
        expenses.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      await loadExpenses(nextPage, expenseFilters);
      if (budget) {
        await loadMonthlySpent(budget.month, budget.year);
      }
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
      if (res.data) {
        await loadMonthlySpent(res.data.month, res.data.year);
      }
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
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dash-head">
          <div className="dash-brand">
            <div className="dash-logo">E</div>
            <div>
              <p className="dash-brand-name">Expensave</p>
              <p className="dash-brand-tag">Track smarter. Save better.</p>
            </div>
          </div>
          <button className="dash-btn dash-btn-ghost" onClick={logout}>
            Logout
          </button>
        </header>

        <div className="dash-grid">
          <section className="dash-card">
            <div className="dash-card-head">
              <h2 className="dash-card-title">Monthly Budget</h2>
              <p className="dash-card-subtitle">Set your month target in one place.</p>
            </div>

            <form className="dash-form-grid" onSubmit={onSaveBudget}>
              <input
                className="dash-input"
                name="monthlyIncome"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monthly Income"
                value={budgetForm.monthlyIncome}
                onChange={onBudgetChange}
                required
              />
              <input
                className="dash-input"
                name="totalEmi"
                type="number"
                step="0.01"
                min="0"
                placeholder="Total EMI"
                value={budgetForm.totalEmi}
                onChange={onBudgetChange}
                required
              />
              <input
                className="dash-input"
                name="monthlySavings"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monthly Savings"
                value={budgetForm.monthlySavings}
                onChange={onBudgetChange}
                required
              />
              <input
                className="dash-input"
                name="month"
                type="number"
                min="1"
                max="12"
                placeholder="Month"
                value={budgetForm.month}
                onChange={onBudgetChange}
                required
              />
              <input
                className="dash-input"
                name="year"
                type="number"
                min="2000"
                placeholder="Year"
                value={budgetForm.year}
                onChange={onBudgetChange}
                required
              />
              <button className="dash-btn dash-btn-primary" type="submit" disabled={budgetSubmitting}>
                {budgetSubmitting ? "Saving..." : "Save Budget"}
              </button>
            </form>

            {budgetError ? <p className="dash-msg dash-msg-error">{budgetError}</p> : null}
            {budgetLoading ? <p className="dash-msg">Loading current budget...</p> : null}

            {!budgetLoading && budget ? (
              <div className="dash-stats-grid">
                <article className="dash-stat">
                  <p className="dash-stat-label">Monthly Budget</p>
                  <p className="dash-stat-value">{budget.monthlyBudget}</p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Daily Budget</p>
                  <p className="dash-stat-value">{budget.dailyBudget}</p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Period</p>
                  <p className="dash-stat-value">
                    {budget.month}/{budget.year}
                  </p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Spent This Month</p>
                  <p className="dash-stat-value">{monthlySpent.toFixed(2)}</p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Remaining Budget</p>
                  <p className="dash-stat-value">
                    {remainingBudget !== null ? remainingBudget.toFixed(2) : "-"}
                  </p>
                </article>
                <article className={`dash-stat ${utilizationTone}`}>
                  <p className="dash-stat-label">Utilization</p>
                  <p className="dash-stat-value">
                    {utilization !== null ? `${utilization.toFixed(2)}%` : "-"}
                  </p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Expected Till Day {todayDayOfMonth}</p>
                  <p className="dash-stat-value">
                    {expectedTillToday !== null ? expectedTillToday.toFixed(2) : "-"}
                  </p>
                </article>
                <article className="dash-stat">
                  <p className="dash-stat-label">Actual Till Today</p>
                  <p className="dash-stat-value">
                    {actualTillToday !== null ? actualTillToday.toFixed(2) : "-"}
                  </p>
                </article>
                <article className={`dash-stat ${deltaTone}`}>
                  <p className="dash-stat-label">Today&apos;s Delta</p>
                  <p className="dash-stat-value">{formattedDelta}</p>
                </article>
              </div>
            ) : null}

            {insightsLoading ? <p className="dash-msg">Updating spending insights...</p> : null}
            {insightsError ? <p className="dash-msg dash-msg-error">{insightsError}</p> : null}
            {!budgetLoading && !budget ? <p className="dash-msg">No budget set for current month.</p> : null}
          </section>

          <section className="dash-card">
            <div className="dash-card-head">
              <h2 className="dash-card-title">Add Expense</h2>
              <p className="dash-card-subtitle">Capture every spend instantly.</p>
            </div>
            <form className="dash-form-grid" onSubmit={onCreateExpense}>
              <input
                className="dash-input"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={expenseForm.amount}
                onChange={onExpenseChange}
                required
              />
              <input
                className="dash-input"
                name="category"
                placeholder="Category (e.g. Food)"
                value={expenseForm.category}
                onChange={onExpenseChange}
              />
              <input
                className="dash-input"
                name="description"
                placeholder="Description"
                value={expenseForm.description}
                onChange={onExpenseChange}
              />
              <input
                className="dash-input"
                name="expenseDate"
                type="date"
                value={expenseForm.expenseDate}
                onChange={onExpenseChange}
                required
              />
              <button className="dash-btn dash-btn-primary" type="submit" disabled={expenseSubmitting}>
                {expenseSubmitting ? "Saving..." : "Save Expense"}
              </button>
            </form>
            {expenseError ? <p className="dash-msg dash-msg-error">{expenseError}</p> : null}
          </section>
        </div>

        <section className="dash-card dash-card-wide">
          <div className="dash-card-head">
            <h2 className="dash-card-title">Your Expenses</h2>
            <p className="dash-card-subtitle">Filter, update, and review transaction history.</p>
          </div>

          <form className="dash-filter-grid" onSubmit={onApplyExpenseFilters}>
            <input
              className="dash-input"
              name="category"
              placeholder="Filter by category"
              value={expenseFilters.category}
              onChange={onExpenseFilterChange}
            />
            <input
              className="dash-input"
              name="month"
              type="number"
              min="1"
              max="12"
              placeholder="Month (1-12)"
              value={expenseFilters.month}
              onChange={onExpenseFilterChange}
            />
            <input
              className="dash-input"
              name="year"
              type="number"
              min="2000"
              placeholder="Year"
              value={expenseFilters.year}
              onChange={onExpenseFilterChange}
            />
            <button className="dash-btn dash-btn-primary" type="submit">
              Apply Filters
            </button>
            <button className="dash-btn dash-btn-ghost" type="button" onClick={onClearExpenseFilters}>
              Clear Filters
            </button>
          </form>

          {expenseLoading ? <p className="dash-msg">Loading expenses...</p> : null}
          {!expenseLoading && expenses.length === 0 ? (
            <p className="dash-msg">No expenses found for current criteria.</p>
          ) : null}

          {!expenseLoading && expenses.length > 0 ? (
            <>
              <div className="dash-kpi-row">
                <p>
                  Page Total: <strong>{total.toFixed(2)}</strong>
                </p>
                <p>
                  Records: <strong>{totalElements}</strong>
                </p>
              </div>

              <div className="dash-table-wrap">
                <table className="dash-table">
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
                                className="dash-input"
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
                                className="dash-input"
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
                                className="dash-input"
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
                                className="dash-input"
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
                            <div className="dash-row-actions">
                              {isEditing ? (
                                <>
                                  <button
                                    className="dash-btn dash-btn-primary"
                                    type="button"
                                    disabled={isUpdatingExpense}
                                    onClick={() => onSaveExpenseEdit(expense.id)}
                                  >
                                    {isUpdatingExpense ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    className="dash-btn dash-btn-ghost"
                                    type="button"
                                    onClick={onCancelExpenseEdit}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="dash-btn dash-btn-ghost"
                                    type="button"
                                    onClick={() => onStartExpenseEdit(expense)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="dash-btn dash-btn-danger"
                                    type="button"
                                    disabled={deletingExpenseId === expense.id}
                                    onClick={() => onDeleteExpense(expense.id)}
                                  >
                                    {deletingExpenseId === expense.id ? "Deleting..." : "Delete"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="dash-pagination">
                <button
                  className="dash-btn dash-btn-ghost"
                  type="button"
                  disabled={expenseLoading || currentPage <= 0}
                  onClick={() => onChangePage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  className="dash-btn dash-btn-ghost"
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
    </div>
  );
}

export default Dashboard;
