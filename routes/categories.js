const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Categories = require("../models/categories");
const Menu = require("../models/menu");
const Merchandises = require("../models/merchandises");
const MenuVars = require("../models/menuVars");
const Variations = require("../models/variations");

//Get all
router.get("/", async (req, res) => {
  try {
    const all_cat = await Categories.find();
    res.json(all_cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new category
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const cat = new Categories({
      country: req.body.country,
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      type: req.body.type,
    });
    try {
      const newCat = await cat.save();
      res.status(201).json(newCat);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Update
router.patch("/:id", getCategory, async (req, res) => {
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
          res.cat.name = req.body.name;
        }
        if (req.body.icon != null) {
          res.cat.icon = req.body.icon;
        }
        if (req.body.color != null) {
          res.cat.color = req.body.color;
        }
        if (req.body.type != null) {
          res.cat.type = req.body.type;
        }
        try {
          const updatedCat = await res.cat.save();
          res.json(updatedCat);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//test
// router.delete("/my-:id", async (req, res) => {
//   try {
//     const menu_items = await Menu.find({ category: req.params.id });
//     for (const one of menu_items) {
//       await MenuVars.find({ itemId: one._id }).remove();
//     }
//     await Menu.find({ category: req.params.id }).remove();

//     res.json({ message: "products Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//delete
router.delete("/:id", getCategory, async (req, res) => {
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
          const menu_items = await Menu.find({ category: req.params.id });
          for (const one of menu_items) {
            await MenuVars.find({ itemId: one._id }).remove();
          }
          await Menu.find({ category: req.params.id }).remove();

          const merch_items = await Merchandises.find({
            category: req.params.id,
          });
          for (const one of merch_items) {
            await Variations.find({ merchandises: one._id }).remove();
          }
          await Merchandises.find({ category: req.params.id }).remove();

          await res.cat.remove();
          res.json({ message: "Category and its products Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

async function getCategory(req, res, next) {
  let cat;
  try {
    cat = await Categories.findById(req.params.id);
    if (cat == null) {
      return res.status(400).json({ message: "Category not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.cat = cat;
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
