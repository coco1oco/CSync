// src/pages/Unauthorized.tsx
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <main style={{ padding: "1rem" }}>
      <h1>Unauthorized</h1>
      <p>You don’t have permission to view this page.</p>
      <p>
        <Link to="/">Go back to dashboard</Link>
      </p>
    </main>
  );
}
