const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const Menu = require("../models/menu");
const AddOns = require("../models/addOns");
const MenuVars = require("../models/menuVars");

//Get all items in and out of stock
router.get("/all/:id", async (req, res) => {
  let items = [];
  let details = [];

  try {
    const all_items = await Menu.find({ country: req.params.id }).sort({
      order: "ascending",
    });
    for (const one of all_items) {
      let one_item = [];
      vars = await MenuVars.find({ itemId: one._id });
      one_item.push(one);
      one_item.push(vars);
      items.push(one_item);
    }
    details.push(items);
    const addons = await AddOns.find({ country: req.params.id });
    if (addons != null) {
      details.push(addons);
    }
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all by country in and out of stock
router.get("/country/:id", getMenuByCountry, async (req, res) => {
  try {
    res.send(res.menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all by category in and out of stock
router.get("/category/:id", getMenuByCategory, async (req, res) => {
  try {
    res.send(res.menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new item
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const menu = new Menu({
      country: req.body.country,
      category: req.body.category,
      image: req.body.image,
      name: req.body.name,
      price: req.body.price,
      recommended: req.body.recommended,
      contain_milk: req.body.contain_milk,
      order: req.body.order,
      in_stock: req.body.in_stock,
    });
    try {
      const newItem = await menu.save();
      const update_file = fetch(
        "https://backend.thebhive.io/menu/lebanon/products.php"
      );
      const update_file2 = fetch(
        "https://backend.thebhive.io/menu/canada/products.php"
      );
      res.status(201).json(newItem);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Add new item variation
router.post("/variation", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const menuVars = new MenuVars({
      itemId: req.body.itemId,
      title: req.body.title,
      price: req.body.price,
    });
    try {
      const newMenuVars = await menuVars.save();
      const update_file = fetch(
        "https://backend.thebhive.io/menu/lebanon/products.php"
      );
      const update_file2 = fetch(
        "https://backend.thebhive.io/menu/canada/products.php"
      );
      res.status(201).json(newMenuVars);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Get all in stock recommended in a country
router.get("/recommended", async (req, res) => {
  try {
    const recommended = await Menu.find({ recommended: "true", in_stock: "true" });
    res.json(recommended);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Update item test add in_stock
router.patch("/testing", async (req, res) => {
   
  const all_items = await Menu.find();
  for(const one of all_items){
    one.in_stock = "true";
    await one.save();
  }
  const new_all_items = await Menu.find();
    res.json(new_all_items);

});

//Update item
router.patch("/:id", getMenuItem, async (req, res) => {
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
          res.item.category = req.body.category;
        }
        if (req.body.image != null) {
          res.item.image = req.body.image;
        }
        if (req.body.name != null) {
          res.item.name = req.body.name;
        }
        if (req.body.price != null) {
          res.item.price = req.body.price;
        }
        if (req.body.recommended != null) {
          res.item.recommended = req.body.recommended;
        }
        if (req.body.contain_milk != null) {
          res.item.contain_milk = req.body.contain_milk;
        }
        if (req.body.order != null) {
          res.item.order = req.body.order;
        }
        if (req.body.in_stock != null) {
          res.item.in_stock = req.body.in_stock;
        }
        try {
          const updatedItem = await res.item.save();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json(updatedItem);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//Update var
router.patch("/variation/:id", getMenuVarsItem, async (req, res) => {
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
          res.vars.title = req.body.title;
        }
        if (req.body.price != null) {
          res.vars.price = req.body.price;
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

//Get product details by id + his addons
router.get("/:id", getItemAdds, async (req, res) => {
  try {
    res.send(res.item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//delete item
router.delete("/:id", getMenuItem, async (req, res) => {
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
          await MenuVars.find({ itemId: req.params.id }).remove();
          await res.item.remove();
          const update_file = fetch(
            "https://backend.thebhive.io/menu/lebanon/products.php"
          );
          const update_file2 = fetch(
            "https://backend.thebhive.io/menu/canada/products.php"
          );
          res.json({ message: "Item Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//delete item variation
router.delete("/variation/:id", getMenuVarsItem, async (req, res) => {
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

async function getItemAdds(req, res, next) {
  let item = [];
  let vars = [];
  try {
    const menu = await Menu.findById(req.params.id);
    const addons = await AddOns.find();
    vars = await MenuVars.find({ itemId: req.params.id });
    if (menu == null) {
      return res.status(400).json({ message: "Item not found" });
    } else {
      item.push(menu);
      item.push(vars);
    }
    if (addons != null) {
      item.push(addons);
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.item = item;
  next();
}

async function getMenuByCountry(req, res, next) {
  let menu;
  try {
    menu = await Menu.find({ country: req.params.id});
    if (menu == null) {
      return res
        .status(400)
        .json({ message: "No menu available in this country" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.menu = menu;
  next();
}

async function getMenuByCategory(req, res, next) {
  let menu;
  try {
    menu = await Menu.find({ category: req.params.id});
    if (menu == null) {
      return res
        .status(400)
        .json({ message: "No menu available in this category" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.menu = menu;
  next();
}

async function getMenuItem(req, res, next) {
  let item;
  try {
    item = await Menu.findById(req.params.id);
    if (item == null) {
      return res.status(400).json({ message: "Item not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.item = item;
  next();
}

async function getMenuVarsItem(req, res, next) {
  let vars;
  try {
    vars = await MenuVars.findById(req.params.id);
    if (vars == null) {
      return res.status(400).json({ message: "Variation not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.vars = vars;
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
