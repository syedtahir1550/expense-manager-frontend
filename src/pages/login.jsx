import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
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
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Expense Manager Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>Login</button>

      {error ? (
        <>
          <br />
          <br />
          <p style={{ color: "crimson", margin: 0 }}>{error}</p>
        </>
      ) : null}
    </div>
  );
}

export default Login;
