import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import FloorPlanWorkspacePage from "./pages/FloorPlanWorkspacePage";
import ApiTestPage from "./pages/dev/ApiTestPage";
import FloorPlanEditorTestPage from "./pages/dev/FloorPlanEditorTestPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="workspace" element={<FloorPlanWorkspacePage />} />
          <Route path="canvas" element={<Navigate to="/workspace" replace />} />
          <Route path="workspace-v2" element={<Navigate to="/workspace" replace />} />
          <Route path="api-test" element={<ApiTestPage />} />
          <Route path="editor-test" element={<FloorPlanEditorTestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
