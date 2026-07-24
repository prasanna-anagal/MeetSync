import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, Stack, TextField, Typography, Alert } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useAuth } from "../contexts/AuthContext";

function Authentication() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (mode === "register") {
        await register(name, username, password);
        setMessage("Registered successfully, you can log in now");
        setMode("login");
      } else {
        await login(username, password);
        localStorage.setItem("username", username);
        navigate("/home");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #4f6bed 0%, #1a1a2e 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="xs">
        <Stack alignItems="center" spacing={1} sx={{ mb: 3, color: "#fff" }}>
          <VideocamIcon sx={{ fontSize: 40 }} />
          <Typography
            component={Link}
            to="/"
            variant="h5"
            sx={{ color: "#fff", textDecoration: "none", fontWeight: 700 }}
          >
            MeetSync
          </Typography>
        </Stack>

        <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" gutterBottom>
            {mode === "login" ? "Welcome back" : "Create an account"}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {mode === "register" && (
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            )}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large">
              {mode === "login" ? "Login" : "Register"}
            </Button>
          </Box>
          {message && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
          <Button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            sx={{ mt: 2 }}
            fullWidth
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

export default Authentication;
