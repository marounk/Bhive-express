const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Cart = require("../models/cart");
const Points = require("../models/points");
const Users = require("../models/users")

//Get cart by user id
router.get("/:id", getUserCart, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.userId !== req.params.id) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          let details = [];
          details.push(res.cart);
          const points = await Points.find({ userId: req.params.id }).select(
            "points"
          );
          let total_points = 0;
          for (const one of points) {
            total_points = total_points + one.points;
          }
          details.push(total_points);
          details.push(process.env.USD_POINTS);
          details.push(process.env.POINTS_USD);
          res.send(details);
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//Add item to the cart
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.body.userId) {
    res.status(400).json({ message: "token error" });
  } else {
    let wifi_exist = [];
    let merch_exist = [];
    let menu_exist = [];
    const user = await Users.findById(req.body.userId);

    if (req.body.wifi) {
      wifi_exist = await Cart.find({
        userId: req.body.userId,
        wifi: req.body.wifi,
        country: user.country
      });
    }
    if (req.body.merchId) {
      merch_exist = await Cart.find({
        userId: req.body.userId,
        merchId: req.body.merchId,
        merchVarId: req.body.merchVarId,
        country: user.country
      });
    }
    if (req.body.menuId) {
      menu_exist = await Cart.find({
        userId: req.body.userId,
        menuId: req.body.menuId,
        menuVarId: req.body.menuVarId,
        milk: req.body.milk,
        ice: req.body.ice,
        addOns: req.body.addOns,
        request: req.body.request,
        country: user.country
      });
    }

    if (wifi_exist.length !== 0) {
      wifi_exist[0].quantity =
        parseInt(wifi_exist[0].quantity) + parseInt(req.body.quantity);
      try {
        const updatedItem = await wifi_exist[0].save();
        res.json(updatedItem);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    } else if (merch_exist.length !== 0) {
      merch_exist[0].quantity =
        parseInt(merch_exist[0].quantity) + parseInt(req.body.quantity);
      merch_exist[0].total_price =
        parseFloat(merch_exist[0].total_price) +
        parseFloat(req.body.total_price);
      try {
        const updatedItem = await merch_exist[0].save();
        res.json(updatedItem);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    } else if (menu_exist.length !== 0) {
      menu_exist[0].quantity =
        parseInt(menu_exist[0].quantity) + parseInt(req.body.quantity);
      menu_exist[0].total_price =
        parseInt(menu_exist[0].total_price) + parseInt(req.body.total_price);
      try {
        const updatedItem = await menu_exist[0].save();
        res.json(updatedItem);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    } else {
      const cart = new Cart({
        userId: req.body.userId,
        merchId: req.body.merchId,
        merchVarId: req.body.merchVarId,
        menuId: req.body.menuId,
        menuVarId: req.body.menuVarId,
        wifi: req.body.wifi,
        total_price: req.body.total_price,
        quantity: req.body.quantity,
        milk: req.body.milk,
        ice: req.body.ice,
        addOns: req.body.addOns,
        request: req.body.request,
        country: user.country
      });
      try {
        const newItem = await cart.save();
        res.status(201).json(newItem);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
  }
});

// Update item in the cart
router.patch("/:id", getItem, async (req, res) => {
  const thisItem = res.item;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.userId != thisItem.userId._id) {
        res.status(400).json({ message: "token error" });
      } else {
        if (req.body.quantity != null) {
          res.item.quantity = req.body.quantity;
        }
        try {
          const updatedItem = await res.item.save();
          res.json(updatedItem);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//remove item from the cart
router.delete("/:id", getItem, async (req, res) => {
  const thisItem = res.item;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.userId != thisItem.userId._id) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          await res.item.remove();
          res.json({ message: "Item Removed" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//clear cart
router.delete("/clear/:id", getUserCart, async (req, res) => {
  try {
    res.cart.forEach(function (item) {
      item.remove();
    });
    res.json({ message: "Cart is empty now" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getItem(req, res, next) {
  let item;
  try {
    item = await Cart.findById(req.params.id).populate("userId", [
      "customized_userId",
      "profile",
      "name",
      "email",
      "level",
      "active",
      "type",
      "created_date",
      "notification_userId",
      "text",
      "work",
    ]);
    if (item == null) {
      return res.status(400).json({ message: "Item not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.item = item;
  next();
}

async function getUserCart(req, res, next) {
  let cart;
  try {
    const user = await Users.findById(req.params.id)
    cart = await Cart.find({ userId: req.params.id, country: user.country }).populate(
      "merchId merchVarId menuId menuVarId milk addOns"
    );
    if (cart == null) {
      return res.status(400).json({ message: "Your cart is empty" });
    }
    cart.map((item) => {
      let item_price = 0;
      if (item["menuId"]) {
        item_price = item["menuId"]?.price;
        if (item["menuVarId"]) {
          item_price = item_price + item["menuVarId"]?.price;
        }
        if (item["milk"]) {
          item_price = item_price + item["milk"]?.price;
        }
        if (item["addOns"]) {
          for (const oneAddOn of item["addOns"]) {
            item_price = item_price + oneAddOn.price;
          }
        }
      }
      if (item["merchId"]) {
        item_price = item["merchId"].price;
        if (item["merchVarId"]) {
          item_price = item_price + item["merchVarId"]?.price;
        }
      }
      if (item["wifi"] == "yes") {
        item_price = process.env.WIFI_PRICE;
      }

      item.total_price = item_price;
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.cart = cart;
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
