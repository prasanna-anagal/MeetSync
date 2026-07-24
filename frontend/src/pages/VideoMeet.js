import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1/users";

const recordMeetingInHistory = (meetingCode) => {
  const token = localStorage.getItem("token");
  if (!token) return;
  axios.post(`${API_BASE_URL}/add_to_activity`, { token, meeting_code: meetingCode }).catch(() => {});
};

function VideoMeet() {
  const { url: roomId } = useParams();
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState("connecting");
  const [isHost, setIsHost] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [screenShareError, setScreenShareError] = useState("");
  const isScreenShareSupported = typeof navigator.mediaDevices?.getDisplayMedia === "function";

  useEffect(() => {
    let mounted = true;
    let localStream = null;
    let socket = null;
    const peerConnections = {};
    peerConnectionsRef.current = peerConnections;

    const createPeerConnection = (remoteId, isInitiator) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections[remoteId] = pc;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("signal", remoteId, { candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [remoteId]: event.streams[0] }));
      };

      if (isInitiator) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal", remoteId, { sdp: pc.localDescription });
        };
      }

      return pc;
    };

    const removePeer = (remoteId) => {
      const pc = peerConnections[remoteId];
      if (pc) {
        pc.close();
        delete peerConnections[remoteId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[remoteId];
        return next;
      });
    };

    const init = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaError(
          "Camera and microphone access requires a secure connection (HTTPS) or localhost. " +
            "This page was loaded over an insecure connection, so the browser won't allow it."
        );
        return;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        setMediaError(
          err.name === "NotAllowedError"
            ? "Camera/microphone permission was denied. Please allow access and reload."
            : `Could not access camera or microphone: ${err.message}`
        );
        return;
      }
      if (!mounted) return;

      localStream = stream;
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket = io(SERVER_URL);
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-call", roomId);
      });

      socket.on("chat-message", (data, sender) => {
        setMessages((prev) => [...prev, { sender, data }]);
      });

      socket.on("waiting-for-approval", () => setCallStatus("waiting"));

      socket.on("join-approved", ({ isHost: hostFlag }) => {
        setCallStatus("active");
        setIsHost(hostFlag);
        recordMeetingInHistory(roomId);
      });

      socket.on("join-denied", () => setCallStatus("denied"));

      socket.on("join-request", (requesterId) => {
        setJoinRequests((prev) => [...prev, requesterId]);
      });

      socket.on("kicked", () => setCallStatus("kicked"));

      socket.on("request-mute", () => {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsMuted(true);
        }
      });

      socket.on("user-joined", (newId) => {
        if (newId !== socket.id && !peerConnections[newId]) {
          createPeerConnection(newId, true);
        }
      });

      socket.on("signal", async (fromId, message) => {
        let pc = peerConnections[fromId];
        if (!pc) {
          pc = createPeerConnection(fromId, false);
        }

        if (message.sdp) {
          await pc.setRemoteDescription(message.sdp);
          if (message.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("signal", fromId, { sdp: pc.localDescription });
          }
        } else if (message.candidate) {
          await pc.addIceCandidate(message.candidate);
        }
      });

      socket.on("user-left", (id) => removePeer(id));
    };

    init();

    return () => {
      mounted = false;
      if (socket) socket.disconnect();
      Object.keys(peerConnections).forEach(removePeer);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId]);

  const replaceOutgoingVideoTrack = (track) => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(track);
    });
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      replaceOutgoingVideoTrack(cameraTrack);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const startScreenShare = async () => {
    if (!isScreenShareSupported) {
      setScreenShareError("Screen sharing isn't supported in this browser (most mobile browsers don't support it).");
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      replaceOutgoingVideoTrack(screenTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      setIsScreenSharing(true);

      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      setScreenShareError(`Could not start screen sharing: ${err.message}`);
    }
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleRespondJoinRequest = (requesterId, approved) => {
    socketRef.current?.emit("respond-join-request", requesterId, approved);
    setJoinRequests((prev) => prev.filter((id) => id !== requesterId));
  };

  const handleKick = (participantId) => {
    socketRef.current?.emit("kick-participant", participantId);
  };

  const handleRequestMute = (participantId) => {
    socketRef.current?.emit("request-mute", participantId);
  };

  const handleToggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    const sender = localStorage.getItem("username") || "Guest";
    socketRef.current.emit("chat-message", chatInput.trim(), sender);
    setChatInput("");
  };

  if (mediaError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">{mediaError}</Alert>
      </Container>
    );
  }

  if (callStatus === "connecting") {
    return (
      <Container sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h6">Connecting to meeting...</Typography>
      </Container>
    );
  }
  if (callStatus === "waiting") {
    return (
      <Container sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h6">Waiting for the host to let you in...</Typography>
      </Container>
    );
  }
  if (callStatus === "denied") {
    return (
      <Container sx={{ mt: 8, textAlign: "center" }}>
        <Alert severity="error">The host denied your request to join.</Alert>
      </Container>
    );
  }
  if (callStatus === "kicked") {
    return (
      <Container sx={{ mt: 8, textAlign: "center" }}>
        <Alert severity="warning">You were removed from the meeting.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Meeting: {roomId}
      </Typography>

      {isHost && joinRequests.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Join requests</Typography>
          <Stack spacing={1}>
            {joinRequests.map((requesterId) => (
              <Stack key={requesterId} direction="row" spacing={1} alignItems="center">
                <Chip label={requesterId} size="small" />
                <Button size="small" variant="contained" onClick={() => handleRespondJoinRequest(requesterId, true)}>
                  Approve
                </Button>
                <Button size="small" onClick={() => handleRespondJoinRequest(requesterId, false)}>
                  Deny
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box sx={{ flex: 3 }}>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <Paper sx={{ p: 1 }}>
              <video ref={localVideoRef} autoPlay muted playsInline width={280} />
              <Typography variant="caption" display="block" textAlign="center">
                You
              </Typography>
            </Paper>

            {Object.entries(remoteStreams).map(([id, stream]) => (
              <Paper key={id} sx={{ p: 1 }}>
                <video
                  autoPlay
                  playsInline
                  width={280}
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                />
                {isHost && (
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => handleRequestMute(id)}>
                      Request mute
                    </Button>
                    <IconButton size="small" color="error" onClick={() => handleKick(id)}>
                      <PersonRemoveIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {isScreenShareSupported && (
              <Button
                variant="outlined"
                startIcon={isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                onClick={handleToggleScreenShare}
              >
                {isScreenSharing ? "Stop sharing" : "Share screen"}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={isMuted ? <MicOffIcon /> : <MicIcon />}
              onClick={handleToggleMute}
            >
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </Stack>
          {screenShareError && (
            <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setScreenShareError("")}>
              {screenShareError}
            </Alert>
          )}
        </Box>

        <Paper sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", minHeight: 300 }}>
          <Typography variant="subtitle1" gutterBottom>
            Chat
          </Typography>
          <List sx={{ flexGrow: 1, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <ListItem key={i} disablePadding>
                <ListItemText primary={`${m.sender}: ${m.data}`} />
              </ListItem>
            ))}
          </List>
          <Box component="form" onSubmit={handleSendChat} sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" variant="contained">
              Send
            </Button>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}

export default VideoMeet;
