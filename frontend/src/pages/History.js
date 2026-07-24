import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Container, List, ListItem, ListItemText, Paper, Typography } from "@mui/material";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1/users",
});

function History() {
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

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
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>
        Meeting history
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <Paper elevation={2}>
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
    </Container>
  );
}

export default History;
