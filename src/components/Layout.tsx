import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const isWorkspace = pathname === "/workspace";

  return (
    <div
      className={`flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 ${
        isWorkspace
          ? "min-h-screen lg:h-dvh lg:min-h-0 lg:overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo.png"
              alt="Floor Plan Gen Logo"
              className="h-8 w-8 object-contain"
            />
            <span>
              Floor Plan<span className="text-indigo-600">Gen</span>
            </span>
          </Link>

          <ul className="flex items-center gap-2 text-sm font-medium sm:gap-4">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 transition-colors sm:px-4 ${
                    isActive
                      ? "font-semibold text-indigo-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                  }`
                }
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/workspace"
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 transition-colors sm:px-4 ${
                    isActive
                      ? "bg-indigo-600 font-semibold text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                  }`
                }
              >
                Workspace
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main className="flex min-h-0 grow flex-col">
        <Outlet />
      </main>

      {!isWorkspace && (
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
          <div className="mx-auto max-w-7xl px-6">
            <p>
              © {new Date().getFullYear()} Floor Plan Generator. All rights
              reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
