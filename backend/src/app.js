import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";

const app = express();
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

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start();
