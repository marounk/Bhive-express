const mongoose = require("mongoose");
const Str = require("@supercharge/strings");

function randomString(length) {
  var result = "";
  var characters = "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const usersTable = new mongoose.Schema({
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "countries",
  },
  customized_userId: {
    type: String,
    unique: true,
    default: randomString(18),
  },
  profile: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  notification_userId: {
    type: String,
    required: false,
  },
  work: {
    type: String,
    required: false,
  },
  text: {
    type: String,
    required: false,
  },
  wallet_address: {
    type: String,
    required: false,
  },
  login_token: {
    type: String,
    required: false,
  },
  loyalty_points: {
    type: Number,
    default: 0,
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "levels",
    default: "63a54ed8ce7bbdb055268731",
  },
  level_updated: {
    type: String,
    default: "no",
  },
  active: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    default: "user",
  },
  cloverId: {
    type: String,
    required: false,
  },
  cardDigits: {
    type: String,
    required: false,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("users", usersTable);
