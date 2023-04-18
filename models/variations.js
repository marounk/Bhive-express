const mongoose = require("mongoose");

const variationsTable = new mongoose.Schema({
  image: {
    type: String,
    required: false,
  },
  size: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  merchandises: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "merchandises",
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("variations", variationsTable);
