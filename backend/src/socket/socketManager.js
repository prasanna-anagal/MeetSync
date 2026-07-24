import { Server } from "socket.io";

const rooms = {};

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
      socket.join(roomId);

      io.to(roomId).emit("user-joined", socket.id, rooms[roomId]);
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("disconnect", () => {
      for (const roomId of Object.keys(rooms)) {
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
