import express from "express";
import {
  register,
  verifyRegister,

  login,
  logout,
 
  requestPasswordUpdate,
  updatePasswordFinal,
  verifyPasswordCode
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/confirm_register", verifyRegister);

router.post("/login", login);
router.post("/logout", logout);

router.post("/forget_password", requestPasswordUpdate);
router.post("/confirm_forget_password", verifyPasswordCode);
router.post("/reset_password", updatePasswordFinal);

export default router;
