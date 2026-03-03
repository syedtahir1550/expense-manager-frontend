import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import "./auth.css";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await register(email, password);
      navigate("/login");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail =
        typeof data === "string"
          ? data
          : data?.message || data?.error || "Unknown error";
      setError(`Signup failed${status ? ` (${status})` : ""}: ${detail}`);
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

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start tracking your expenses in minutes.</p>

        <form className="auth-form" onSubmit={handleSignup}>
          <label className="auth-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="auth-input"
            type="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="auth-btn auth-btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-footnote">
          Already have an account?{" "}
          <button type="button" className="auth-link-btn" onClick={() => navigate("/login")}>
            Login
          </button>
        </p>

        {error ? <p className="auth-message auth-error">{error}</p> : null}
      </div>
    </div>
  );
}

export default Signup;
