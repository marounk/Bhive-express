const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Wifi = require("../models/wifi");
const Branches = require("../models/branches");

//Add a wifi code
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const wifi = new Wifi({
      branch: req.body.branch,
      code: req.body.code,
    });
    try {
      const newWifi = await wifi.save();
      res.status(201).json(newWifi);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Get all wifi codes
// router.get("/", async (req, res) => {
//   try {
//     const all_codes = await Wifi.find();
//     res.json(all_codes);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Get wifi codes history for a user + count available
router.get("/user/:id/:branch", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.params.id) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      let codes = [];
      const user_codes = await Wifi.find({ userId: req.params.id });
      codes.push(user_codes);

      const available = await Wifi.find({
        branch: req.params.branch,
        available: "yes",
      }).count();
      codes.push(available);

      codes.push(parseInt(process.env.WIFI_PRICE));

      res.send(codes);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//Get all wifi codes by branch
router.post("/:branch", getWifiByBranch, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.adminId !== req.body.adminId) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          res.send(res.details);
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//update code user (temp)
// router.patch("/:id", getWifi, async (req, res) => {
//   if (req.body.available != null) {
//     res.wifi.available = req.body.available;
//   }
//   if (req.body.userId != null) {
//     res.wifi.userId = req.body.userId;
//   }
//   if (req.body.sold != null) {
//     res.wifi.sold = req.body.sold;
//   }
//   try {
//     const updatedCode = await res.wifi.save();
//     res.json(updatedCode);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

//delete wifi code
router.delete("/:id", getWifi, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.adminId !== req.body.adminId) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          await res.wifi.remove();
          res.json({ message: "Wifi code Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

async function getWifiByBranch(req, res, next) {
  let details = [];
  try {
    const branch = await Branches.findById(req.params.branch);
    if (branch == null) {
      return res.status(400).json({ message: "Branch not fount" });
    } else {
      details.push(branch);
    }
    const wifi = await Wifi.find({
      branch: req.params.branch,
    });
    if (wifi != null) {
      details.push(wifi);
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.details = details;
  next();
}

async function getWifi(req, res, next) {
  let wifi;
  try {
    wifi = await Wifi.findById(req.params.id);
    if (wifi == null) {
      return res
        .status(400)
        .json({ message: "This wifi codes is not available" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.wifi = wifi;
  next();
}

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
