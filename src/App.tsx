import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Caves from "./pages/Caves";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="caves" element={<Caves />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
