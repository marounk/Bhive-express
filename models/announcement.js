const mongoose = require("mongoose");

const announcementTable = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  image: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: false,
  },
  link_type: {
    type: String,
    required: false,
  },
  internal_link: {
    type: String,
    required: false,
  },
  internal_type: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("announcement", announcementTable);
