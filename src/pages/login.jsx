import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import "./auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const sessionMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("reason") === "session_expired") {
      return "Your session expired or is invalid. Please login again.";
    }
    return "";
  }, [location.search]);

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      const res = await login(email, password);
      const rawToken =
        typeof res.data === "string" ? res.data : res.data?.token ?? "";
      const token = rawToken.replace(/^"+|"+$/g, "").trim();

      if (!token) {
        setError("Login succeeded but token was not returned by backend.");
        return;
      }

      localStorage.setItem("token", token);

      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail =
        typeof data === "string"
          ? data
          : data?.message || data?.error || "Unknown error";
      setError(
        `Login failed${status ? ` (${status})` : ""}: ${detail}`
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-top" />
      <div className="auth-glow auth-glow-bottom" />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">E</div>
          <div>
            <p className="auth-brand-name">Expensave</p>
            <p className="auth-brand-tag">Spend smart. Save more.</p>
          </div>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to continue tracking your money.</p>

        {sessionMessage ? (
          <p className="auth-message auth-warning">{sessionMessage}</p>
        ) : null}

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="auth-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="auth-btn auth-btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="auth-footnote">
          New here?{" "}
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => navigate("/signup")}
          >
            Create an account
          </button>
        </p>

        {error ? <p className="auth-message auth-error">{error}</p> : null}
      </div>
    </div>
  );
}

export default Login;
