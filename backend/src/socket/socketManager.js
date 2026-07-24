import { Server } from "socket.io";

const rooms = {};
const socketRooms = {};
const roomHosts = {};
const pendingRequests = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const addToRoom = (socket, roomId) => {
    rooms[roomId].push(socket.id);
    socketRooms[socket.id] = roomId;
    socket.join(roomId);
    io.to(roomId).emit("user-joined", socket.id, rooms[roomId]);
  };

  io.on("connection", (socket) => {
    socket.on("join-call", (roomId) => {
      if (!rooms[roomId]) {
        rooms[roomId] = [];
        roomHosts[roomId] = socket.id;
        addToRoom(socket, roomId);
        socket.emit("join-approved", { isHost: true });
        return;
      }

      if (!pendingRequests[roomId]) {
        pendingRequests[roomId] = [];
      }
      pendingRequests[roomId].push(socket.id);
      socket.emit("waiting-for-approval");
      io.to(roomHosts[roomId]).emit("join-request", socket.id);
    });

    socket.on("respond-join-request", (requesterId, approved) => {
      const roomId = socketRooms[socket.id];
      if (!roomId || roomHosts[roomId] !== socket.id) return;

      const pending = pendingRequests[roomId] || [];
      const index = pending.indexOf(requesterId);
      if (index === -1) return;
      pending.splice(index, 1);

      const requesterSocket = io.sockets.sockets.get(requesterId);
      if (!requesterSocket) return;

      if (approved) {
        addToRoom(requesterSocket, roomId);
        requesterSocket.emit("join-approved", { isHost: false });
      } else {
        requesterSocket.emit("join-denied");
      }
    });

    socket.on("kick-participant", (targetId) => {
      const roomId = socketRooms[socket.id];
      if (!roomId || roomHosts[roomId] !== socket.id) return;

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit("kicked");
        targetSocket.leave(roomId);
      }

      delete socketRooms[targetId];
      const index = rooms[roomId]?.indexOf(targetId);
      if (index !== undefined && index !== -1) {
        rooms[roomId].splice(index, 1);
        io.to(roomId).emit("user-left", targetId);
      }
    });

    socket.on("request-mute", (targetId) => {
      const roomId = socketRooms[socket.id];
      if (!roomId || roomHosts[roomId] !== socket.id) return;
      io.to(targetId).emit("request-mute");
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const roomId = socketRooms[socket.id];
      if (!roomId) return;
      io.to(roomId).emit("chat-message", data, sender, socket.id);
    });

    socket.on("disconnect", () => {
      const roomId = socketRooms[socket.id];
      delete socketRooms[socket.id];

      if (roomId && rooms[roomId]) {
        const index = rooms[roomId].indexOf(socket.id);
        if (index !== -1) {
          rooms[roomId].splice(index, 1);
          io.to(roomId).emit("user-left", socket.id);
        }

        if (pendingRequests[roomId]) {
          pendingRequests[roomId] = pendingRequests[roomId].filter((id) => id !== socket.id);
        }

        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
          delete roomHosts[roomId];
          delete pendingRequests[roomId];
        }
      }
    });
  });

  return io;
};
