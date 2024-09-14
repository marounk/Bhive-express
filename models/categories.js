const mongoose = require("mongoose");

const categoriesTable = new mongoose.Schema({
  country: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: false,
    default: "0",
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("categories", categoriesTable);
