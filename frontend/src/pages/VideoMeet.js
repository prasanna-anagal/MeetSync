import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PeopleIcon from "@mui/icons-material/People";
import ChatIcon from "@mui/icons-material/Chat";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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

const formatElapsed = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const CONTROL_BUTTON_SX = {
  bgcolor: "#3c3c3c",
  color: "#fff",
  "&:hover": { bgcolor: "#4c4c4c" },
};

function VideoMeet() {
  const { url: roomId } = useParams();
  const navigate = useNavigate();
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
  const [participantNames, setParticipantNames] = useState({});
  const [hostId, setHostId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [screenShareError, setScreenShareError] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const isScreenShareSupported = typeof navigator.mediaDevices?.getDisplayMedia === "function";

  const ensureAnalyser = (id, stream) => {
    if (!stream.getAudioTracks().length || analysersRef.current[id]) return;
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analysersRef.current[id] = { analyser, dataArray: new Uint8Array(analyser.frequencyBinCount) };
  };

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
        ensureAnalyser(remoteId, event.streams[0]);
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
      delete analysersRef.current[remoteId];
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
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
      ensureAnalyser("local", stream);

      socket = io(SERVER_URL);
      socketRef.current = socket;

      const username = localStorage.getItem("username") || "Guest";

      socket.on("connect", () => {
        socket.emit("join-call", roomId, username);
      });

      socket.on("chat-message", (data, sender) => {
        setMessages((prev) => [...prev, { sender, data }]);
      });

      socket.on("waiting-for-approval", () => setCallStatus("waiting"));

      socket.on("join-approved", ({ isHost: hostFlag, hostId: currentHostId }) => {
        setCallStatus("active");
        setIsHost(hostFlag);
        setHostId(currentHostId);
        setCallStartTime(Date.now());
        recordMeetingInHistory(roomId);
      });

      socket.on("join-denied", () => setCallStatus("denied"));

      socket.on("join-request", (requesterId, requesterName) => {
        setJoinRequests((prev) => [...prev, { id: requesterId, name: requesterName }]);
      });

      socket.on("kicked", () => setCallStatus("kicked"));

      socket.on("promoted-to-host", () => setIsHost(true));
      socket.on("host-changed", (newHostId) => setHostId(newHostId));

      socket.on("request-mute", () => {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsMuted(true);
        }
      });

      socket.on("user-joined", (newId, clients, usernames) => {
        setParticipantNames(usernames || {});
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

      socket.on("user-left", (id) => {
        removePeer(id);
        setParticipantNames((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      });
    };

    init();

    return () => {
      mounted = false;
      if (socket) socket.disconnect();
      Object.keys(peerConnections).forEach(removePeer);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      analysersRef.current = {};
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (!callStartTime) return undefined;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStartTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      let loudestId = null;
      let loudestLevel = 0;

      Object.entries(analysersRef.current).forEach(([id, { analyser, dataArray }]) => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        if (average > loudestLevel) {
          loudestLevel = average;
          loudestId = id;
        }
      });

      setActiveSpeakerId(loudestLevel > 15 ? loudestId : null);
    }, 300);

    return () => clearInterval(interval);
  }, []);

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
    setJoinRequests((prev) => prev.filter((req) => req.id !== requesterId));
  };

  const handleLeaveCall = () => {
    socketRef.current?.disconnect();
    navigate("/home");
  };

  const handleKick = (participantId) => {
    socketRef.current?.emit("kick-participant", participantId);
  };

  const handleRequestMute = (participantId) => {
    socketRef.current?.emit("request-mute", participantId);
  };

  const handleToggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = isCameraOff;
    setIsCameraOff(!isCameraOff);
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

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure origin) - fail silently, not critical.
    }
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
      <Box sx={{ bgcolor: "#1a1a1a", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h6">Connecting to meeting...</Typography>
      </Box>
    );
  }
  if (callStatus === "waiting") {
    return (
      <Box sx={{ bgcolor: "#1a1a1a", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h6">Waiting for the host to let you in...</Typography>
      </Box>
    );
  }
  if (callStatus === "denied") {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">The host denied your request to join.</Alert>
      </Container>
    );
  }
  if (callStatus === "kicked") {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="warning">You were removed from the meeting.</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: "#1a1a1a",
        color: "#fff",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ p: { xs: 1, sm: 2 } }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h6">{roomId}</Typography>
          <Chip label={formatElapsed(elapsedSeconds)} size="small" sx={{ bgcolor: "#333", color: "#fff" }} />
          <IconButton size="small" onClick={handleCopyInvite} sx={{ color: "#fff" }} title="Copy meeting code">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          {copySuccess && (
            <Typography variant="caption" sx={{ color: "success.light" }}>
              Copied!
            </Typography>
          )}
        </Stack>
      </Stack>

      {isHost && joinRequests.length > 0 && (
        <Paper sx={{ p: 2, mx: 2, mb: 2 }}>
          <Typography variant="subtitle1">Join requests</Typography>
          <Stack spacing={1}>
            {joinRequests.map((req) => (
              <Stack key={req.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={req.name} size="small" />
                <Button size="small" variant="contained" onClick={() => handleRespondJoinRequest(req.id, true)}>
                  Approve
                </Button>
                <Button size="small" onClick={() => handleRespondJoinRequest(req.id, false)}>
                  Deny
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{ flex: 1, px: { xs: 1, sm: 2 }, gap: 2, overflow: { xs: "auto", md: "hidden" } }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
            alignContent: "start",
            overflowY: "auto",
            pb: 2,
          }}
        >
          <Paper
            sx={{
              p: 1,
              bgcolor: "#242424",
              boxSizing: "border-box",
              overflow: "hidden",
              border: activeSpeakerId === "local" ? "2px solid #4caf50" : "2px solid transparent",
            }}
          >
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
              }}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", display: "block", borderRadius: 4 }}
            />
            <Typography variant="caption" display="block" textAlign="center" sx={{ color: "#ccc" }}>
              You{isHost ? " (host)" : ""}
            </Typography>
          </Paper>

          {Object.entries(remoteStreams).map(([id, stream]) => (
            <Paper
              key={id}
              sx={{
                p: 1,
                bgcolor: "#242424",
                boxSizing: "border-box",
                overflow: "hidden",
                border: activeSpeakerId === id ? "2px solid #4caf50" : "2px solid transparent",
              }}
            >
              <video
                autoPlay
                playsInline
                style={{ width: "100%", display: "block", borderRadius: 4 }}
                ref={(el) => {
                  if (el) el.srcObject = stream;
                }}
              />
              <Typography variant="caption" display="block" textAlign="center" sx={{ color: "#ccc" }}>
                {participantNames[id] || "Guest"}
                {hostId === id ? " (host)" : ""}
              </Typography>
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
        </Box>

        {showParticipants && (
          <Paper
            sx={{
              width: { xs: "100%", md: 260 },
              maxHeight: { xs: 200, md: "none" },
              overflowY: "auto",
              flexShrink: 0,
              p: 2,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#242424",
              color: "#fff",
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Participants
            </Typography>
            <List>
              <ListItem disablePadding>
                <ListItemText
                  primary={`You${isHost ? " (host)" : ""}${isMuted ? " - muted" : ""}`}
                />
              </ListItem>
              {Object.entries(remoteStreams).map(([id]) => (
                <ListItem key={id} disablePadding>
                  <ListItemText primary={`${participantNames[id] || "Guest"}${hostId === id ? " (host)" : ""}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {showChat && (
          <Paper
            sx={{
              width: { xs: "100%", md: 300 },
              height: { xs: 320, md: "auto" },
              flexShrink: 0,
              p: 2,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#242424",
              color: "#fff",
            }}
          >
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
                sx={{ bgcolor: "#fff", borderRadius: 1 }}
              />
              <Button type="submit" variant="contained">
                Send
              </Button>
            </Box>
          </Paper>
        )}
      </Stack>

      {screenShareError && (
        <Alert severity="warning" sx={{ mx: 2, mb: 1 }} onClose={() => setScreenShareError("")}>
          {screenShareError}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        justifyContent="center"
        alignItems="center"
        sx={{ p: { xs: 1, sm: 2 }, bgcolor: "#111", overflowX: "auto" }}
      >
        <IconButton onClick={handleToggleMute} sx={isMuted ? { bgcolor: "error.main", color: "#fff" } : CONTROL_BUTTON_SX}>
          {isMuted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        <IconButton onClick={handleToggleCamera} sx={isCameraOff ? { bgcolor: "error.main", color: "#fff" } : CONTROL_BUTTON_SX}>
          {isCameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
        </IconButton>
        {isScreenShareSupported && (
          <IconButton onClick={handleToggleScreenShare} sx={isScreenSharing ? { bgcolor: "primary.main", color: "#fff" } : CONTROL_BUTTON_SX}>
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        )}
        <IconButton onClick={() => setShowParticipants(!showParticipants)} sx={showParticipants ? { bgcolor: "primary.main", color: "#fff" } : CONTROL_BUTTON_SX}>
          <PeopleIcon />
        </IconButton>
        <IconButton onClick={() => setShowChat(!showChat)} sx={showChat ? { bgcolor: "primary.main", color: "#fff" } : CONTROL_BUTTON_SX}>
          <ChatIcon />
        </IconButton>
        <IconButton onClick={handleLeaveCall} sx={{ bgcolor: "error.main", color: "#fff", "&:hover": { bgcolor: "error.dark" } }}>
          <CallEndIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}

export default VideoMeet;
