import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrUpdateBudget, getCurrentBudget } from "../api/budget";
import { createExpense, getExpenses } from "../api/expenses";

const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();

const initialExpenseForm = {
  amount: "",
  category: "",
  description: "",
  expenseDate: new Date().toISOString().slice(0, 10),
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
    typeof data === "string" ? data : data?.message || data?.error || "Unknown error";
  return `${prefix}${status ? ` (${status})` : ""}: ${detail}`;
};

function Dashboard() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);

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

  const loadExpenses = async () => {
    try {
      setExpenseLoading(true);
      setExpenseError("");
      const res = await getExpenses();
      setExpenses(res.data ?? []);
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
    loadExpenses();
    loadCurrentBudget();
  }, []);

  const onExpenseChange = (event) => {
    const { name, value } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: value }));
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
      await loadExpenses();
    } catch (err) {
      setExpenseError(getErrorText("Unable to create expense", err));
      console.error(err);
    } finally {
      setExpenseSubmitting(false);
    }
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
        {expenseLoading ? <p>Loading expenses...</p> : null}
        {!expenseLoading && expenses.length === 0 ? <p>No expenses yet.</p> : null}
        {!expenseLoading && expenses.length > 0 ? (
          <>
            <p>
              Total: <strong>{total.toFixed(2)}</strong>
            </p>
            <table border="1" cellPadding="8" cellSpacing="0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expenseDate}</td>
                    <td>{expense.category || "-"}</td>
                    <td>{expense.description || "-"}</td>
                    <td>{expense.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default Dashboard;
