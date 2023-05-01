const mongoose = require("mongoose");

const managerTable = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
    required: true,
  },
  login_token: {
    type: String,
    required: false,
  },
  notification_managerId: {
    type: String,
    required: false,
  },
  active: {
    type: Number,
    default: 1,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("manager", managerTable);
