const express = require("express");
const router = express.Router();

const md5 = require("md5");
const jwt = require("jsonwebtoken");

const Admins = require("../models/adminUsers");
const Points = require("../models/points");
const Users = require("../models/users");

const Menu = require("../models/menu");
const AddOns = require("../models/addOns");
const MenuVars = require("../models/menuVars");

const Merchandises = require("../models/merchandises");
const Variations = require("../models/variations");

//Get all (keep it commented)
// router.get("/", async (req, res) => {
//   try {
//     const all_admins = await Admins.find();
//     res.json(all_admins);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Register new admin (keep it commented)
// router.post("/", async (req, res) => {
//   let find;
//   try {
//     find = await Admins.findOne({ username: req.body.username });
//     if (find != null) {
//       return res.status(400).json({ message: "Username already exist" });
//     } else {
//       const pass = md5(req.body.password);
//       const admin = new Admins({
//         username: req.body.username,
//         password: pass,
//       });
//       try {
//         const newAdmin = await admin.save();
//         res.json(newAdmin);
//       } catch (err) {
//         res.status(400).json({ message: err.message });
//       }
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// });

// login
router.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = md5(req.body.password);

  let find;
  try {
    find = await Admins.findOne({ username: username, password: password });
    if (find == null) {
      return res.status(400).json({ message: "Wrong Credentials" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  const admin = { adminId: find._id };
  const accessToken = jwt.sign(admin, process.env.ACCESS_TOKEN_SECRET);
  find.login_token = accessToken;
  res.status(201).send(find);
});

//Send points to a user
router.post("/refund", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      const current_date = new Date();
      const current_day = current_date.getDate();
      const current_month = current_date.getMonth() + parseInt(1);
      const current_year = current_date.getFullYear();

      let exp_day;
      let exp_month;
      let exp_year;
      if (current_day == 29) {
        exp_day = 1;
        exp_month = current_month + parseInt(7);
      } else if (current_day == 30) {
        exp_day = 1;
        exp_month = current_month + parseInt(7);
      } else if (current_day == 31) {
        exp_day = 1;
        exp_month = current_month + parseInt(7);
      } else {
        exp_day = current_day;
        exp_month = current_month + parseInt(6);
      }
      if (exp_month > 12) {
        exp_month = exp_month - parseInt(12);
        exp_year = current_year + parseInt(1);
      } else {
        exp_year = current_year;
      }

      const addPoints = new Points({
        userId: req.body.userId,
        points: parseInt(req.body.points),
        exp_day: exp_day,
        exp_month: exp_month,
        exp_year: exp_year,
      });
      try {
        const saveAddedPoints = await addPoints.save();
        res.status(201).send(saveAddedPoints);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//delete admin
// router.delete("/:id", getAdmin, async (req, res) => {
//   try {
//     await res.admin.remove();
//     res.json({ message: "Admin account Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.patch("/change-status", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const user = await Users.findById(req.body.userId);
    if (req.body.type != null) {
      user.type = req.body.type;
    }
    try {
      const updatedUser = await user.save();
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

// get all menu
router.get("/menu/all/:id", async (req, res) => {
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

//Get all menu in a country include out of stock
router.get("/menu/country/:id", getMenuByCountry, async (req, res) => {
  try {
    res.send(res.menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all merchs in a country include out of stock
router.get("/merchandises/country/:country", getMerchsByCountry, async (req, res) => {
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

async function getMenuByCountry(req, res, next) {
  let menu;
  try {
    menu = await Menu.find({ country: req.params.id });
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

async function getMerchsByCountry(req, res, next) {
  let merch;
  try {
    merch = await Merchandises.find({ country: req.params.country }).sort({
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

async function getAdmin(req, res, next) {
  let admin;
  try {
    admin = await Admins.findById(req.params.id);
    if (admin == null) {
      return res
        .status(400)
        .json({ message: "This admin id is not available" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.admin = admin;
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
