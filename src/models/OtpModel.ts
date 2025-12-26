import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  otp: {
    type: mongoose.Schema.Types.String,
  },
  expiry: {
    type: mongoose.Schema.Types.Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
  },
});
export const OtpModel = mongoose.model("otp", otpSchema);
