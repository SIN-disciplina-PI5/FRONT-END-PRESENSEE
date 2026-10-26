
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../styles/admin.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar tipo="admin" />

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
