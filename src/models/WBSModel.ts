import { Schema, model } from "mongoose";

const WBSSchema = new Schema(
  {
    title: { type: Schema.Types.String, requried: true },
    description: { type: Schema.Types.String, requried: true },
    media: { type: Schema.Types.String, requried: true },
    user: { type: Schema.Types.ObjectId, ref: "User", requried: true },
  },
  {
    timestamps: true,
  }
);

const WBSModel = model("WBS", WBSSchema);

export default WBSModel;
