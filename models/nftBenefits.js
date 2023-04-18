const mongoose = require("mongoose");

const nftBenefitsTable = new mongoose.Schema({
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "countries",
  },
  description: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("nftBenefits", nftBenefitsTable);
