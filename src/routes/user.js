import express from "express";
import { addFavourite, getFavourites, getParkingHistory } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/favourite", authenticateToken, addFavourite);
router.get("/favourites", authenticateToken, getFavourites);
router.get("/history", authenticateToken, getParkingHistory);

export default router;
