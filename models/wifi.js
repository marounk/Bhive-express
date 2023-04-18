const mongoose = require("mongoose");

const wifiTable = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  code: {
    type: String,
    required: true,
  },
  available: {
    type: String,
    default: "yes",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: false,
  },
  date_sold: {
    type: Date,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("wifi", wifiTable);
