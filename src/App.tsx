import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
const FloorPlanWorkspacePage = lazy(() => import("./pages/FloorPlanWorkspacePage"));

const WorkspaceFallback = () => (
  <div className="flex flex-1 items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">
    Loading design workspace…
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="workspace" element={<Suspense fallback={<WorkspaceFallback />}><FloorPlanWorkspacePage /></Suspense>} />
          <Route path="canvas" element={<Navigate to="/workspace" replace />} />
          <Route path="workspace-v2" element={<Navigate to="/workspace" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
