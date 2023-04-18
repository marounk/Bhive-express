const mongoose = require("mongoose");

const eventTable = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  image: {
    type: String,
    required: false,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  exp_date: {
    type: Date,
    required: true,
  },
  total_seats: {
    type: Number,
    required: true,
  },
  booked_seats: {
    type: Number,
    required: false,
    default: 0,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("events", eventTable);
