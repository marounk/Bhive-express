const mongoose = require("mongoose");

const spacesTable = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  upto: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  features: {
    type: String,
    required: false,
  },
  ideal_for: {
    type: String,
    required: false,
  },
  capacity: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("spaces", spacesTable);
