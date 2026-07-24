import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [meetingCode, setMeetingCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;
    navigate(`/${meetingCode.trim()}`);
  };

  return (
    <div>
      <h2>MeetSync</h2>
      <form onSubmit={handleJoin}>
        <input
          placeholder="Enter meeting code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
        />
        <button type="submit">Join / Start Meeting</button>
      </form>
      <button onClick={() => navigate("/history")}>View history</button>
    </div>
  );
}

export default Home;
