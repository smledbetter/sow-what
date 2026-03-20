import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "Today" },
  { path: "/seeds", label: "Seeds" },
  { path: "/planted", label: "Planted" },
] as const;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        borderTop: "1px solid var(--color-border, #d0d0d0)",
        backgroundColor: "var(--color-bg, #fff)",
        padding: "8px 0",
      }}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-current={isActive ? "page" : undefined}
            style={{
              minHeight: "44px",
              minWidth: "44px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "var(--color-primary-dark, #1b5e20)" : "var(--color-text-secondary, #525252)",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
