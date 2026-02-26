import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export type DashboardView = "home" | "my-documents" | "shared" | "starred" | "trash";

const navItems: { view: DashboardView; label: string; icon: string; filled?: boolean }[] = [
  { view: "home", label: "Home", icon: "home", filled: true },
  { view: "my-documents", label: "My Documents", icon: "description" },
  { view: "shared", label: "Shared With Me", icon: "group" },
  { view: "starred", label: "Starred", icon: "star" },
  { view: "trash", label: "Trash", icon: "delete" },
];

export const DashboardSidebar = ({
  onNewDocumentClick,
  onMobileMenuClose,
}: {
  onNewDocumentClick?: () => void;
  onMobileMenuClose?: () => void;
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const viewParam = new URLSearchParams(location.search).get("view") as DashboardView | null;
  const currentView = viewParam && ["home", "my-documents", "shared", "starred", "trash"].includes(viewParam) ? viewParam : "home";

  const handleNavClick = () => {
    onMobileMenuClose?.();
  };

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-surface-highlight dark:bg-background-dark h-full shrink-0">
      <div className="flex flex-col gap-6">
        <div className="flex gap-3 items-center px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white">edit_document</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">
              CollaboWrite
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Premium Workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewDocumentClick}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Document
        </button>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const to = item.view === "home" ? "/" : `/?view=${item.view}`;
            const isActive = currentView === item.view;
            return (
              <Link
                key={item.label}
                to={to}
                onClick={handleNavClick}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors group ${
                  isActive
                    ? "bg-primary/10 text-primary dark:text-white dark:bg-surface-highlight"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-surface-highlight/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${item.filled ? "filled" : ""} ${isActive ? "text-primary dark:text-white" : ""} group-hover:text-primary transition-colors`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto">
        <Link
          to="/profile"
          onClick={handleNavClick}
          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-surface-highlight dark:bg-surface-dark border-t border-slate-200 dark:border-surface-highlight pt-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-highlight/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary overflow-hidden shrink-0">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-text-secondary">{user?.email || ""}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};
