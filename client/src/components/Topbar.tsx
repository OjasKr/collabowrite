import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Img1 from "../assets/logo.svg";
import Img2 from "../assets/SearchIcon.jpeg";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

const DARK_KEY = "collabowrite-dark";

export const Topbar = () => {
  const { user, logout, authenticated } = useAuth();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DARK_KEY) === "true";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem(DARK_KEY, "true");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(DARK_KEY, "false");
    }
  }, [dark]);

  return (
    <nav className="Topbar">
      <div className="logodiv">
        <Link to="/" className="flex items-center gap-2">
          <img src={Img1} alt="Logo" />
          <span>Collabowrite</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="Searchbar">
          <img src={Img2} alt="" />
          <input type="text" placeholder="Search" className="bg-transparent" />
        </div>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "☀️" : "🌙"}
        </button>
        {authenticated && user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent text-sm"
            >
              <span className="truncate max-w-[120px]">{user.name || user.email}</span>
              <span className="text-muted-foreground">▼</span>
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 py-1 bg-card border border-border rounded-md shadow-lg z-20 min-w-[160px]">
                  <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border">
                    {user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
