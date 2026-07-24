import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("MeetSync backend is running");
});

const start = async () => {
  const connection = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${connection.connection.host}`);

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start();
