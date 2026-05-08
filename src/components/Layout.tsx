import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl shadow-sm border-b border-slate-200/60">
        <nav className="mx-auto px-6 py-4 flex items-center justify-between max-w-7xl">
          <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              Floor Plan<span className="text-indigo-600">Gen</span>
            </Link>
          </div>
          <ul className="flex items-center space-x-8 text-sm font-medium">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `transition-all duration-200 hover:text-indigo-600 ${
                    isActive ? "text-indigo-600 font-semibold" : "text-slate-600"
                  }`
                }
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/canvas"
                className={({ isActive }) =>
                  `transition-all duration-200 px-4 py-2 rounded-full ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                  }`
                }
              >
                Workspace
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main className="grow flex flex-col min-h-0">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Floor Plan Generator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
