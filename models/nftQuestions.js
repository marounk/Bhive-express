const mongoose = require("mongoose");

const nftQuestionsTable = new mongoose.Schema({
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "countries",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  question: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("nftQuestions", nftQuestionsTable);
