const mongoose = require("mongoose");
  
const addOnsTable = new mongoose.Schema({
  country: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("addOns", addOnsTable);
