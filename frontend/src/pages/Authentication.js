import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, TextField, Typography, Alert } from "@mui/material";
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
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          {mode === "login" ? "Login" : "Register"}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          <Button type="submit" variant="contained">
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
  );
}

export default Authentication;
