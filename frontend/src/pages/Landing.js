import { Link } from "react-router-dom";
import { Box, Button, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import ChatIcon from "@mui/icons-material/Chat";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import ShieldIcon from "@mui/icons-material/Shield";

const FEATURES = [
  {
    icon: <VideocamIcon fontSize="large" color="primary" />,
    title: "Crystal-clear video calls",
    description: "Peer-to-peer WebRTC calling with echo cancellation and noise suppression built in.",
  },
  {
    icon: <ChatIcon fontSize="large" color="primary" />,
    title: "In-call chat",
    description: "Send messages during a call without interrupting the conversation.",
  },
  {
    icon: <ScreenShareIcon fontSize="large" color="primary" />,
    title: "Screen sharing",
    description: "Share your screen with one click, switch back to your camera anytime.",
  },
  {
    icon: <ShieldIcon fontSize="large" color="primary" />,
    title: "Host-controlled access",
    description: "New participants wait for host approval before joining, so your room stays yours.",
  },
];

function Landing() {
  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(135deg, #4f6bed 0%, #1a1a2e 100%)",
          color: "#fff",
          py: { xs: 10, md: 14 },
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h3" gutterBottom>
            MeetSync
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4, fontWeight: 400 }}>
            Video calls with chat, screen sharing, and host-controlled room access &mdash; all in one place.
          </Typography>
          <Button component={Link} to="/auth" variant="contained" size="large" color="secondary">
            Get started
          </Button>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Grid container spacing={3}>
          {FEATURES.map((feature) => (
            <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
              <Paper sx={{ p: 3, height: "100%" }} elevation={1}>
                <Stack spacing={1.5}>
                  {feature.icon}
                  <Typography variant="h6">{feature.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default Landing;
