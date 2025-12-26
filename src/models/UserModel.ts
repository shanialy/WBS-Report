import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: Schema.Types.String, requried: true, unique: true },
    password: { type: Schema.Types.String, default: "" },
    name: { type: Schema.Types.String, default: "" },
    profilePicture: { type: Schema.Types.String, default: "" },
    businessName: { type: Schema.Types.String, default: "" },
    companySize: { type: Schema.Types.String, default: "" },
    about: {
      type: Schema.Types.String,
      default: "",
    },
    isVerified: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Schema.Types.Boolean,
      default: false,
    },
    isNotificationEnabled: {
      type: Schema.Types.Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = model("User", UserSchema);

export default UserModel;
