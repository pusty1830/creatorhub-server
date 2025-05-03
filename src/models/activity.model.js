const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: {
    type: String,
    enum: [
      "login",
      "profile_update",
      "saved_feed",
      "shared_feed",
      "reported_feed",
    ],
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActivityLog", activitySchema);
