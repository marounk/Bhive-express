const mongoose = require("mongoose");

const pointsRequestTable = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  amount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders",
  },
  points: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("pointsRequest", pointsRequestTable);
