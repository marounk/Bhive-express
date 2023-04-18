const mongoose = require("mongoose");

const book = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  space_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "spaces",
    required: true,
  },
  from_date: {
    type: String,
    required: true,
  },
  till_date: {
    type: String,
    required: true,
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
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("book", book);
