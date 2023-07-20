const mongoose = require("mongoose");

const orderItemsTable = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders",
  },
  merchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "merchandises",
  },
  merchVarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "variations",
    required: false,
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "menu",
  },
  menuVarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "menuVars",
  },
  wifi: {
    type: String,
    required: false,
  },
  total_price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  milk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "addOns",
  },
  ice: {
    type: String,
    required: false,
  },
  addOns: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "addOns",
    },
  ],
  request: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("orderItems", orderItemsTable);
