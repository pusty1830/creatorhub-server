const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    credits: { type: Number, default: 0 },
    profileCompleted: { type: Boolean, default: false },
    profileBonusGiven: { type: Boolean, default: false },
    lastLoginDate: Date,
    savedFeeds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feed" }],
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: "ActivityLog" }],

    // New fields for education and additional profile info
    education: {
      degree: String,
      university: String,
      graduationYear: Number,
    },
    phone: String,
    address: String,
    bio: String,
    linkedin: String,
    github: String,
    website: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
