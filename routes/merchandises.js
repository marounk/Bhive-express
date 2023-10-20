const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const Merchandises = require("../models/merchandises");
const Variations = require("../models/variations");

//Get all merchs
router.get("/", async (req, res) => {
  let items = [];
  let details = [];

  try {
    const all_merchs = await Merchandises.find();
    for (const one of all_merchs) {
      let one_item = [];
      const vars = await Variations.find({ merchandises: one._id });
      one_item.push(one);
      one_item.push(vars);
      items.push(one_item);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all merchs by country in and out of stock
router.get("/country/:country", getMerchsByCountry, async (req, res) => {
  let items = [];
  try {
    for (const one of res.merch) {
      let one_item = [];
      const vars = await Variations.find({ merchandises: one._id });
      one_item.push(one);
      one_item.push(vars);
      items.push(one_item);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all vars
router.get("/variations", async (req, res) => {
  try {
    const all_merchs = await Variations.find();
    res.json(all_merchs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new merch prod
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const merch = new Merchandises({
      country: req.body.country,
      category: req.body.category,
      image: req.body.image,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      recommended: req.body.recommended,
      order: req.body.order,
      in_stock: req.body.in_stock,
    });
    try {
      const newMerch = await merch.save();
      const update_file = fetch(
        "https://backend.thebhive.io/menu/lebanon/products.php"
      );
      const update_file2 = fetch(
        "https://backend.thebhive.io/menu/canada/products.php"
      );
      res.status(201).json(newMerch);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Create product variation
router.post("/variations", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    for (const one of req.body.variations) {
      const variation = new Variations({
        merchandises: one.merchandises,
        image: one.image,
        size: one.size,
        color: one.color,
        price: one.price,
        stock: one.stock,
      });
      try {
        const newVar = await variation.save();
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
    const update_file = fetch(
      "https://backend.thebhive.io/menu/lebanon/products.php"
    );
    const update_file2 = fetch(
      "https://backend.thebhive.io/menu/canada/products.php"
    );
    const allVars = await Variations.find({
      merchandises: req.body.variations[0].merchandises,
    });
    res.status(201).json(allVars);
  }
});

//Get one merchandise details + variation
router.get("/:id", getMerchsVars, (req, res) => {
  res.send(res.details);
});

//Update merch test add in_stock
// router.patch("/testing", async (req, res) => {
   
//   const all_items = await Merchandises.find();
//   for(const one of all_items){
//     one.in_stock = "true";
//     await one.save();
//   }
//   const new_all_items = await Merchandises.find();
//     res.json(new_all_items);

// });

//Update merch
router.patch("/:id", getMerchs, async (req, res) => {
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
        if (req.body.category != null) {
          res.merch.category = req.body.category;
        }
        if (req.body.image != null) {
          res.merch.image = req.body.image;
        }
        if (req.body.title != null) {
          res.merch.title = req.body.title;
        }
        if (req.body.description != null) {
          res.merch.description = req.body.description;
        }
        if (req.body.price != null) {
          res.merch.price = req.body.price;
        }
        if (req.body.recommended != null) {
          res.merch.recommended = req.body.recommended;
        }
        if (req.body.order != null) {
          res.merch.order = req.body.order;
        }
        if (req.body.in_stock != null) {
          res.merch.in_stock = req.body.in_stock;
        }
        try {
          const updatedMerch = await res.merch.save();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json(updatedMerch);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//Update var
router.patch("/variation/:id", getVars, async (req, res) => {
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
        if (req.body.image != null) {
          res.vars.image = req.body.image;
        }
        if (req.body.size != null) {
          res.vars.size = req.body.size;
        }
        if (req.body.color != null) {
          res.vars.color = req.body.color;
        }
        if (req.body.price != null) {
          res.vars.price = req.body.price;
        }
        if (req.body.stock != null) {
          res.vars.stock = req.body.stock;
        }
        try {
          const updatedVars = await res.vars.save();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json(updatedVars);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete variation
router.delete("/variation/:id", getVars, async (req, res) => {
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
          await res.vars.remove();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json({ message: "Variation Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//delete all variations
// router.delete("/all-variations", async (req, res) => {
//   try {
//     await Variations.find().remove();
//     res.json({ message: "Variations Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//delete merchandise
router.delete("/:id", getMerchs, async (req, res) => {
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
          await Variations.find({ merchandises: req.params.id }).remove();
          await res.merch.remove();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json({ message: "Merchandise Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

async function getMerchs(req, res, next) {
  let merch;
  try {
    merch = await Merchandises.findById(req.params.id);
    if (merch == null) {
      return res.status(400).json({ message: "Merchandise not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.merch = merch;
  next();
}

async function getMerchsByCountry(req, res, next) {
  let merch;
  try {
    merch = await Merchandises.find({ country: req.params.country}).sort({
      order: "ascending",
    });
    if (merch == null) {
      return res
        .status(400)
        .json({ message: "No merchandises available in this country" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.merch = merch;
  next();
}

async function getVars(req, res, next) {
  let vars;
  try {
    vars = await Variations.findById(req.params.id);
    if (vars == null) {
      return res.status(400).json({ message: "Variation not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.vars = vars;
  next();
}

async function getMerchsVars(req, res, next) {
  let details = [];
  try {
    const merch = await Merchandises.findById(req.params.id);
    const vars = await Variations.find({ merchandises: req.params.id });
    if (merch == null) {
      return res.status(400).json({ message: "Merchandise not found" });
    } else {
      details.push(merch);
    }
    if (vars != null) {
      details.push(vars);
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.details = details;
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
