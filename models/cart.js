const mongoose = require("mongoose");

const merchCartTable = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  merchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "merchandises",
  },
  merchVarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "variations",
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
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "countries",
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("merchCart", merchCartTable);
