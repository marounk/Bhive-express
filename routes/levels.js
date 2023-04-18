const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Levels = require("../models/levels");

//Get all levels
router.get("/", async (req, res) => {
  const levels = await Levels.find();
  res.status(201).json(levels);
});

//Add new Level
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const level = new Levels({
      level: req.body.level,
      start_at: req.body.start_at,
      end_at: req.body.end_at,
      booking_disc: req.body.booking_disc,
      merch_disc: req.body.merch_disc,
    });
    try {
      const newlevel = await level.save();
      res.status(201).json(newlevel);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
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
