import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenStreamRef.current = screenStream;
    const screenTrack = screenStream.getVideoTracks()[0];

    replaceOutgoingVideoTrack(screenTrack);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = screenStream;
    }
    setIsScreenSharing(true);

    screenTrack.onended = () => stopScreenShare();
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

  if (callStatus === "connecting") {
    return <h2>Connecting to meeting...</h2>;
  }
  if (callStatus === "waiting") {
    return <h2>Waiting for the host to let you in...</h2>;
  }
  if (callStatus === "denied") {
    return <h2>The host denied your request to join.</h2>;
  }
  if (callStatus === "kicked") {
    return <h2>You were removed from the meeting.</h2>;
  }

  return (
    <div>
      <h2>Meeting: {roomId}</h2>
      <video ref={localVideoRef} autoPlay muted playsInline width={240} />
      <button onClick={handleToggleScreenShare}>
        {isScreenSharing ? "Stop sharing" : "Share screen"}
      </button>
      <button onClick={handleToggleMute}>{isMuted ? "Unmute" : "Mute"}</button>

      {isHost && joinRequests.length > 0 && (
        <div>
          <h3>Join requests</h3>
          <ul>
            {joinRequests.map((requesterId) => (
              <li key={requesterId}>
                {requesterId}
                <button onClick={() => handleRespondJoinRequest(requesterId, true)}>Approve</button>
                <button onClick={() => handleRespondJoinRequest(requesterId, false)}>Deny</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.entries(remoteStreams).map(([id, stream]) => (
        <div key={id}>
          <video
            autoPlay
            playsInline
            width={240}
            ref={(el) => {
              if (el) el.srcObject = stream;
            }}
          />
          {isHost && (
            <div>
              <button onClick={() => handleRequestMute(id)}>Request mute</button>
              <button onClick={() => handleKick(id)}>Kick</button>
            </div>
          )}
        </div>
      ))}

      <div>
        <h3>Chat</h3>
        <ul>
          {messages.map((m, i) => (
            <li key={i}>
              <b>{m.sender}:</b> {m.data}
            </li>
          ))}
        </ul>
        <form onSubmit={handleSendChat}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default VideoMeet;
