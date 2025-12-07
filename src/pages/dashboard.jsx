import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>✅ Dashboard</h1>
      <p>You are successfully logged in.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default Dashboard;
