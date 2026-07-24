import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

export const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ message: "User registered" });
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserHistory = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "Invalid token" });
    }

    const meetings = await Meeting.find({ user_id: user.username });
    return res.status(200).json(meetings);
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "Invalid token" });
    }

    const newMeeting = new Meeting({ user_id: user.username, meetingCode: meeting_code });
    await newMeeting.save();

    return res.status(201).json({ message: "Added to history" });
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
