const mongoose = require("mongoose");

const ordersTable = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  customized_userId: {
    type: String,
    required: false,
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "countries",
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  total_price: {
    type: Number,
    required: true,
  },
  pay_with: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "pending",
  },
  step: {
    type: String,
    default: "pending",
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("orders", ordersTable);
