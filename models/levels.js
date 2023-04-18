const mongoose = require("mongoose");

const levelsTable = new mongoose.Schema({
  level: {
    type: String,
    required: true,
  },
  start_at: {
    type: Number,
    required: true,
  },
  end_at: {
    type: Number,
    required: true,
  },
  booking_disc: {
    type: Number,
    required: false,
  },
  merch_disc: {
    type: Number,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("levels", levelsTable);
