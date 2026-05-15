import { Outlet } from "react-router-dom";
import Header from "../components/Header";

export default function InternalLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#040826" }}>
      <Header />
      <Outlet />
    </div>
  );
}