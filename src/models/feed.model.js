const mongoose = require("mongoose");

const feedInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "Report", "share", "save"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feed1", feedInteractionSchema);
