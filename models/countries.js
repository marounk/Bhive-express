const mongoose = require("mongoose");

const countriesTable = new mongoose.Schema({
  country: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("countries", countriesTable);
