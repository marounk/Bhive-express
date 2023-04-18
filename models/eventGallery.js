const mongoose = require("mongoose");

const eventGalleryTable = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "events",
  },
  image: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("eventGallery", eventGalleryTable);
