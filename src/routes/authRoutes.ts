import { Router } from "express";
import {
  login,
  signup,
  verifyOtp,
  sendOtp,
  getProfile,
  changePassword,
  resetPassword,
  logout,
  deleteAccount,
  createProfile,
  updateProfile,
} from "../controllers/authController";
import { checkAuth } from "../middleware/checkAuth";
import role from "../middleware/checkRole";
import { handleMediaFilesS3 } from "../middleware/handleMediaFilesS3";

const router = Router();

// POST /auth/login
router.post("/signup", signup);
router.post(
  "/create-profile",
  checkAuth,
  handleMediaFilesS3([{ name: "profilePicture", maxCount: 1 }], {
    optional: true,
  }),
  createProfile
);
router.put(
  "/update-profile",
  checkAuth,
  handleMediaFilesS3([{ name: "profilePicture", maxCount: 1 }], {
    optional: true,
  }),
  updateProfile
);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/send-otp", sendOtp);
router.get("/profile", checkAuth, getProfile);
router.post("/change-password", checkAuth, changePassword);
router.post("/reset-password", checkAuth, resetPassword);
router.post("/logout", checkAuth, logout);
router.delete("/delete-account", checkAuth, deleteAccount);

export default router;
