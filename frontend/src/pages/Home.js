import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import NavBar from "../components/NavBar";

function Home() {
  const [meetingCode, setMeetingCode] = useState("");
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "there";

  const handleJoin = (e) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;
    navigate(`/${meetingCode.trim()}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <NavBar />
      <Container maxWidth="sm" sx={{ mt: { xs: 4, sm: 8 } }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {username}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Start a new meeting or join one with a code.
        </Typography>

        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <VideoCallIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h6">Start or join a meeting</Typography>
          </Stack>
          <Box component="form" onSubmit={handleJoin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Meeting code"
              placeholder="e.g. team-standup"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large">
              Join / Start meeting
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Home;
