import { Router } from "express";
import { register, login, getUserHistory, addToHistory } from "../controllers/user.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/get_all_activity", getUserHistory);
router.post("/add_to_activity", addToHistory);

export default router;
