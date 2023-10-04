const mongoose = require("mongoose");

const merchandisesTable = new mongoose.Schema({
  country: {
    type: String,
    required: false,
  },
  category: {
    type: String,
    required: true,
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
    required: true,
  },
  price: {
    type: Number,
    required: false,
  },
  recommended: {
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

module.exports = mongoose.model("merchandises", merchandisesTable);
