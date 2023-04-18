const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Countries = require("../models/countries");
const Branches = require("../models/branches");

//Get all countries and their branches
router.get("/", async (req, res) => {
  let locations = [];
  try {
    const all_countries = await Countries.find();
    if (all_countries == null) {
      return res.status(400).json({ message: "No Country found" });
    } else {
      locations.push(all_countries);
      const all_branches = await Branches.find();
      if (all_branches != null) {
        locations.push(all_branches);
      }
      res.json(locations);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Create a country
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const country = new Countries({
      country: req.body.country,
    });
    try {
      const newCountry = await country.save();
      res.status(201).json(newCountry);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//update country name
router.patch("/:id", getCountries, async (req, res) => {
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
        if (req.body.country != null) {
          res.country.country = req.body.country;
        }
        try {
          const updatedCountry = await res.country.save();
          res.json(updatedCountry);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete country
// router.delete("/:id", getCountries, async (req, res) => {
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
//           await Branches.find({ country: req.params.id }).remove();
//           await res.country.remove();
//           res.json({ message: "Country Deleted" });
//         } catch (err) {
//           res.status(500).json({ message: err.message });
//         }
//       }
//     }
//   });
// });

async function getCountries(req, res, next) {
  let country;
  try {
    country = await Countries.findById(req.params.id);
    if (country == null) {
      return res.status(400).json({ message: "Country not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.country = country;
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
