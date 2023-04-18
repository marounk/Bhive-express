const mongoose = require("mongoose");

const pointsTable = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders",
    required: false,
  },
  points: {
    type: Number,
    required: true,
  },
  exp_day: {
    type: Number,
    required: true,
  },
  exp_month: {
    type: Number,
    required: true,
  },
  exp_year: {
    type: Number,
    required: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("points", pointsTable);
