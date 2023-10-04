const mongoose = require("mongoose");

const menuTable = new mongoose.Schema({
  country: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  recommended: {
    type: String,
    required: false,
  },
  contain_milk: {
    type: String,
    required: false,
  },
  order: {
    type: Number,
    required: true,
  },
  in_stock: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("menu", menuTable);
