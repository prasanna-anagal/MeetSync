import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, TextField, Typography } from "@mui/material";

function Home() {
  const [meetingCode, setMeetingCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;
    navigate(`/${meetingCode.trim()}`);
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          MeetSync
        </Typography>
        <Box component="form" onSubmit={handleJoin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Meeting code"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained">
            Join / Start meeting
          </Button>
        </Box>
        <Button onClick={() => navigate("/history")} sx={{ mt: 2 }} fullWidth>
          View history
        </Button>
      </Paper>
    </Container>
  );
}

export default Home;
