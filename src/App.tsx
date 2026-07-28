import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Canvas from "./pages/Canvas";
import Home from "./pages/Home";
import ApiTestPage from "./pages/dev/ApiTestPage";
import FloorPlanEditorTestPage from "./pages/dev/FloorPlanEditorTestPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="canvas" element={<Canvas />} />
          <Route path="api-test" element={<ApiTestPage />} />
          <Route path="editor-test" element={<FloorPlanEditorTestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
