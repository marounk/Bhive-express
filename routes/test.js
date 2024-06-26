const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Test = require("../models/test");

//Get table test
router.get("/", async (req, res) => {
  try {
    const all_records = await Test.find();
    res.json(all_records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//add new record to table test
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.body.user_id) {
    res.status(400).json({ message: "token error" });
  } else {
    const test = new Test({
        user_id: req.body.user_id,
    });
    try {
        const newrecord = await test.save();
        res.status(201).json(newrecord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }

  }
});

//clear all records in table test
router.delete("/clear-records", async (req, res) => {
  try {
    await Test.find().remove();
    res.json({ message: "Records Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, authData) => {
        if (err) return res.sendStatus(403);
        res.authData = authData;
        next();
    });
}

module.exports = router;
