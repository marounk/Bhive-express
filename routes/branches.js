const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Branches = require("../models/branches");
const Wifi = require("../models/wifi");

//Create a branch
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const branch = new Branches({
      name: req.body.name,
      country: req.body.country,
    });
    try {
      const newBranch = await branch.save();
      res.status(201).json(newBranch);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Get all branches by country
router.get("/:country", getBranchesByCountry, async (req, res) => {
  try {
    res.send(res.branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//update branch
router.patch("/:id", getBranches, async (req, res) => {
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
        if (req.body.name != null) {
          res.branch.name = req.body.name;
        }
        try {
          const updatedBranch = await res.branch.save();
          res.json(updatedBranch);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete branch
// router.delete("/:id", getBranches, async (req, res) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];
//   if (token == null) return res.sendStatus(401);

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
//     if (err) {
//       return res.sendStatus(403);
//     } else {
//       if (authData.adminId !== req.body.adminId) {
//         res.status(400).json({ message: "token error" });
//       } else {
//         try {
//           await Wifi.find({ branch: req.params.id }).remove();
//           await res.branch.remove();
//           res.json({ message: "Branch Deleted" });
//         } catch (err) {
//           res.status(500).json({ message: err.message });
//         }
//       }
//     }
//   });
// });

async function getBranches(req, res, next) {
  let branch;
  try {
    branch = await Branches.findById(req.params.id);
    if (branch == null) {
      return res.status(400).json({ message: "Branch not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.branch = branch;
  next();
}

async function getBranchesByCountry(req, res, next) {
  let branches;
  try {
    branches = await Branches.find({ country: req.params.country });
    if (branches == null) {
      return res
        .status(400)
        .json({ message: "No branches available in this country" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.branches = branches;
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
