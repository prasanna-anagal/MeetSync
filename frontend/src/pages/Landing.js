import { Link } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";

function Landing() {
  return (
    <Container maxWidth="sm" sx={{ mt: 12, textAlign: "center" }}>
      <Typography variant="h3" gutterBottom>
        MeetSync
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Video calls with chat, screen sharing, and host-controlled access.
      </Typography>
      <Box>
        <Button component={Link} to="/auth" variant="contained" size="large">
          Get started
        </Button>
      </Box>
    </Container>
  );
}

export default Landing;
