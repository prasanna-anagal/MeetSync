import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Alert, Box, Button, Container, List, ListItem, ListItemText, Paper, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import NavBar from "../components/NavBar";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1/users",
});

function History() {
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view your meeting history");
      return;
    }

    client
      .get("/get_all_activity", { params: { token } })
      .then((response) => setMeetings(response.data))
      .catch(() => setError("Could not load meeting history"));
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <NavBar />
      <Container maxWidth="sm" sx={{ mt: { xs: 3, sm: 6 } }}>
        <Typography variant="h4" gutterBottom>
          Meeting history
        </Typography>
        {error && <Alert severity="warning">{error}</Alert>}

        {!error && meetings.length === 0 && (
          <Paper sx={{ p: 4, textAlign: "center", mt: 2 }}>
            <HistoryIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No meetings yet. Join or start one to see it here.
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/home")}>
              Go to Home
            </Button>
          </Paper>
        )}

        {meetings.length > 0 && (
          <Paper elevation={2} sx={{ mt: 2 }}>
            <List>
              {meetings.map((meeting) => (
                <ListItem key={meeting._id} divider>
                  <ListItemText
                    primary={meeting.meetingCode}
                    secondary={new Date(meeting.date).toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </Box>
  );
}

export default History;
