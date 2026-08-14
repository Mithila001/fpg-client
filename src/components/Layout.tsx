import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const workspace = useLocation().pathname === "/workspace";
  return (
    <div className={`flex min-h-screen flex-col bg-slate-50 text-slate-900 ${workspace ? "lg:h-dvh lg:min-h-0 lg:overflow-hidden" : ""}`}>
      <header className="relative z-50 shrink-0 border-b border-white/10 bg-slate-950 text-white">
        <nav className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-950/30">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain brightness-0 invert" />
            </span>
            <span>
              <span className="block text-sm font-black tracking-tight">Floor Plan Gen</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Spatial design studio</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 text-sm font-semibold">
            <NavLink to="/" end className={({ isActive }) => `rounded-lg px-3 py-2 transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>Overview</NavLink>
            <NavLink to="/workspace" className={({ isActive }) => `rounded-lg px-3 py-2 transition ${isActive ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}>Workspace</NavLink>
          </div>
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col"><Outlet /></main>
      {!workspace && <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">Floor Plan Gen · Project coordinates are rendered at 10 units per meter.</footer>}
    </div>
  );
};
export default Layout;
