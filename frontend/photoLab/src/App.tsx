import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Contact from "./pages/Contact";
import Studio from "./pages/Studio";
import Ads from "./components/Ads";
import Footer from "./components/Footer.tsx";
// import PrivacyPolicy from "./pages/PrivacyPolicy";
// import Terms from "./pages/Terms";
import { AuthProvider } from "./context/AuthContext.tsx";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="app-layout">
          <Ads side="left" adClient="ca-pub-1234567890" adSlot="9876543210" />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Studio />} />
              <Route path="/contact" element={<Contact />} />
              {/* <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions" element={<Terms />} /> */}
            </Routes>
          </div>
          <Ads side="right" adClient="ca-pub-1234567890" adSlot="9876543210" />
        </div>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
