import { useEffect, useState } from "react";
import axios from "axios";

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
    <div>
      <h2>Meeting history</h2>
      {error && <p>{error}</p>}
      <ul>
        {meetings.map((meeting) => (
          <li key={meeting._id}>
            {meeting.meetingCode} — {new Date(meeting.date).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default History;
