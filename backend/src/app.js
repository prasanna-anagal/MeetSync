import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import { connectToSocket } from "./socket/socketManager.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MeetSync backend is running");
});

app.use("/api/v1/users", userRoutes);

const start = async () => {
  const connection = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${connection.connection.host}`);

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start();
