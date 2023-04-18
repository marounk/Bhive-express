const mongoose = require("mongoose");

const adminUsersTable = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  login_token: {
    type: String,
    required: false,
  },
  active: {
    type: Number,
    default: 1,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("adminUsers", adminUsersTable);
