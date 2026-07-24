import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Authentication from "./pages/Authentication";
import Home from "./pages/Home";
import History from "./pages/History";
import VideoMeet from "./pages/VideoMeet";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path="/home" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/:url" element={<VideoMeet />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
