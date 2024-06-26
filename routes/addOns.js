const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const AddOns = require("../models/addOns");


//Get all addOns 
// router.get("/", async (req, res) => {
//   try {
//     const all_adds = await AddOns.find();
//     res.json(all_adds);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });


//Get addOns by country
router.get("/country-:id", getCountryAddOns, async (req, res) => {
  try {
    res.send(res.addOns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new addOns
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const addOn = new AddOns({
      country: req.body.country,
      title: req.body.title,
      price: req.body.price,
      type: req.body.type,
    });
    try {
      const newAdds = await addOn.save();
      const update_file = fetch(
        "https://backend.thebhive.io/menu/lebanon/products.php"
      );
      const update_file2 = fetch(
        "https://backend.thebhive.io/menu/canada/products.php"
      );
      res.status(201).json(newAdds);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Update
router.patch("/:id", getAddOn, async (req, res) => {
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
        if (req.body.title != null) {
          res.add.title = req.body.title;
        }
        if (req.body.price != null) {
          res.add.price = req.body.price;
        }
        if (req.body.type != null) {
          res.add.type = req.body.type;
        }
        try {
          const updatedAdd = await res.add.save();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json(updatedAdd);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete addOns
router.delete("/:id", getAddOn, async (req, res) => {
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
          await res.add.remove();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json({ message: "addOn Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

async function getAddOn(req, res, next) {
  let add;
  try {
    add = await AddOns.findById(req.params.id);
    if (add == null) {
      return res.status(400).json({ message: "AddOns not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.add = add;
  next();
}

async function getCountryAddOns(req, res, next) {
  let addOns;
  try {
    addOns = await AddOns.find({ country: req.params.id });
    if (addOns == null) {
      return res
        .status(400)
        .json({ message: "No AddOns available in this country" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.addOns = addOns;
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
