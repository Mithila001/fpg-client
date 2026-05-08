import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Canvas from "./pages/Canvas";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="canvas" element={<Canvas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
