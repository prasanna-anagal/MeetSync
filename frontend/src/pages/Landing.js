import { Link } from "react-router-dom";

function Landing() {
  return (
    <div>
      <h1>MeetSync</h1>
      <p>Video calls with chat, screen sharing, and host-controlled access.</p>
      <Link to="/auth">Get started</Link>
    </div>
  );
}

export default Landing;
