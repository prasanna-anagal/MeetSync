import express from "express";

const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("MeetSync backend is running");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
