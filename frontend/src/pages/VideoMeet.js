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
  const [remoteStreams, setRemoteStreams] = useState({});

  useEffect(() => {
    let mounted = true;
    let localStream = null;
    let socket = null;
    const peerConnections = {};

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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket = io(SERVER_URL);

      socket.on("connect", () => {
        socket.emit("join-call", roomId);
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

  return (
    <div>
      <h2>Meeting: {roomId}</h2>
      <video ref={localVideoRef} autoPlay muted playsInline width={240} />
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <video
          key={id}
          autoPlay
          playsInline
          width={240}
          ref={(el) => {
            if (el) el.srcObject = stream;
          }}
        />
      ))}
    </div>
  );
}

export default VideoMeet;
