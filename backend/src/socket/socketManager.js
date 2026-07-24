import { Server } from "socket.io";

const rooms = {};
const socketRooms = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-call", (roomId) => {
      if (!rooms[roomId]) {
        rooms[roomId] = [];
      }
      rooms[roomId].push(socket.id);
      socketRooms[socket.id] = roomId;
      socket.join(roomId);

      io.to(roomId).emit("user-joined", socket.id, rooms[roomId]);
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

          if (rooms[roomId].length === 0) {
            delete rooms[roomId];
          }
        }
      }
    });
  });

  return io;
};
