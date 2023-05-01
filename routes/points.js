const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");

const Points = require("../models/points");
const GeneratedPoints = require("../models/generatedPoints");
const BuyPoints = require("../models/buyPoints");
const Users = require("../models/users.js");
const Levels = require("../models/levels");

const crypto = require("crypto");
const axios = require("axios");

const apiKey =
  "rwzzqd5vfu0dhnutywrj0oocubbasdsxdqxnvxossjesw1b0nj1gswrk4oxbwyzc"; // set your API key here
const apiSecret =
  "ubc7ztfkcc9nushbra4oaopgr7tecocmr3wp8fik7q9kgclk7wmja18qpmhowtrp"; // set your secret key here
const baseURL = "https://bpay.binanceapi.com";

//Get generated points table
router.post("/generated", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      const all_points = await GeneratedPoints.find()
        .populate("userId", [
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
        ])
        .populate("managerId", [
          "username",
          "branch",
          "active",
          "created_date",
          "notification_managerId",
        ]);
      res.json(all_points);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//Get all users' points
// router.get("/", async (req, res) => {
//   try {
//     const all_points = await Points.find();
//     res.json(all_points);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Get all users' bought points
router.get("/bought", async (req, res) => {
  try {
    const all_points = await BuyPoints.find();
    res.json(all_points);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get one user points
router.get("/user-:id", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.params.id) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      let result = [];

      const all_levels = await Levels.find();
      const user = await Users.findById(req.params.id);
      let loyalty_points = user.loyalty_points;
      let level = user.level;
      let upgrade_level = false;

      if (
        parseInt(loyalty_points) >= parseInt(all_levels[4].start_at) &&
        (user.level.toString() == all_levels[0]._id.toString() ||
          user.level.toString() == all_levels[1]._id.toString() ||
          user.level.toString() == all_levels[2]._id.toString() ||
          user.level.toString() == all_levels[3]._id.toString())
      ) {
        level = all_levels[4]._id;
        upgrade_level = true;
      } else if (
        parseInt(loyalty_points) >= parseInt(all_levels[3].start_at) &&
        (user.level.toString() == all_levels[0]._id.toString() ||
          user.level.toString() == all_levels[1]._id.toString() ||
          user.level.toString() == all_levels[2]._id.toString())
      ) {
        level = all_levels[3]._id;
        upgrade_level = true;
      } else if (
        parseInt(loyalty_points) >= parseInt(all_levels[2].start_at) &&
        (user.level.toString() == all_levels[0]._id.toString() ||
          user.level.toString() == all_levels[1]._id.toString())
      ) {
        level = all_levels[2]._id;
        upgrade_level = true;
      } else if (
        parseInt(loyalty_points) >= parseInt(all_levels[1].start_at) &&
        user.level.toString() == all_levels[0]._id.toString()
      ) {
        level = all_levels[1]._id;
        upgrade_level = true;
      }

      user.level = level;
      user.save();
      const user_level = await Levels.findById(level);

      const points = await Points.find({ userId: req.params.id });
      let total_points = 0;
      for (const one of points) {
        total_points = total_points + one.points;
      }

      result.push({redeemable: total_points});
      result.push({loyalty: loyalty_points});
      result.push(user_level);

      if(upgrade_level){result.push({message: "new level"}); console.log("here 1")}
      else{
        const user_level_updated = await Users.findById(req.params.id)
        if(user_level_updated.level_updated == "yes"){
          result.push({message: "new level"});
          user_level_updated.level_updated = "no";
          await user_level_updated.save();
        }
      }
      
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//Buy points
router.post("/buy", async (req, res) => {
  const newPoints = new BuyPoints({
    userId: req.body.userId,
    points: parseInt(req.body.price * process.env.USD_BUY_POINTS),
    price: req.body.price,
  });
  try {
    const generatedpoints = await newPoints.save();
    const latest = await BuyPoints.findById(generatedpoints._id).populate(
      "userId",
      [
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
      ]
    );
    let binance_response = "binance api failed";

    await dispatch_request("POST", "/binancepay/openapi/order", {
      merchantId: latest.userId.customized_userId,
      merchantTradeNo: latest._id,
      tradeType: "APP",
      totalFee: req.body.price,
      currency: "USDT",
      productType: "Points",
      productName: "Points",
      productDetail: "New Points",
    })
      .then((response) => {
        binance_response = response.data;
      })
      .catch((error) => console.log(error));

    res.status(201).send(binance_response);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// get buy points table
router.get("/buy/all", async (req, res) => {
  try {
    const all_points = await BuyPoints.find();
    res.json(all_points);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add the generated points to the user
router.post("/verifyCode/:id/:code", getGeneratedPoints, async (req, res) => {
  try {
    res.points[0].status = "0";
    res.points[0].userId = req.params.id;
    const updatedUser = await res.points[0].save();

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
      userId: req.params.id,
      points: parseInt(res.points[0].points),
      exp_day: exp_day,
      exp_month: exp_month,
      exp_year: exp_year,
    });
    try {
      const saveAddedPoints = await addPoints.save();

      const all_levels = await Levels.find();
      const user = await Users.findById(req.params.id);
      
      const new_loyalty_points = user.loyalty_points + parseInt(res.points[0].price * process.env.USD_POINTS)
      user.loyalty_points = new_loyalty_points;
      await user.save();
      let loyalty_points = new_loyalty_points;

      let level = user.level;
      let upgrade_level = false;

      try {
        // change level
        if (
          parseInt(loyalty_points) >= parseInt(all_levels[4].start_at) &&
          (user.level.toString() == all_levels[0]._id.toString() ||
            user.level.toString() == all_levels[1]._id.toString() ||
            user.level.toString() == all_levels[2]._id.toString() ||
            user.level.toString() == all_levels[3]._id.toString())
        ) {
          level = all_levels[4]._id;
          upgrade_level = true;
        } else if (
          parseInt(loyalty_points) >= parseInt(all_levels[3].start_at) &&
          (user.level.toString() == all_levels[0]._id.toString() ||
            user.level.toString() == all_levels[1]._id.toString() ||
            user.level.toString() == all_levels[2]._id.toString())
        ) {
          level = all_levels[3]._id;
          upgrade_level = true;
        } else if (
          parseInt(loyalty_points) >= parseInt(all_levels[2].start_at) &&
          (user.level.toString() == all_levels[0]._id.toString() ||
            user.level.toString() == all_levels[1]._id.toString())
        ) {
          level = all_levels[2]._id;
          upgrade_level = true;
        } else if (
          parseInt(loyalty_points) >= parseInt(all_levels[1].start_at) &&
          user.level.toString() == all_levels[0]._id.toString()
        ) {
          level = all_levels[1]._id;
          upgrade_level = true;
        }

        user.level = level;
        user.save();
      } catch (err) {
        res.status(500).json({ message: err.message });
      }

      let result = [];
      result.push(saveAddedPoints);
      const points = await Points.find({ userId: req.params.id }).select(
        "points"
      );
      let total_points = 0;
      for (const one of points) {
        total_points = total_points + one.points;
      }
      result.push({redeemable: total_points});
      result.push({loyalty: loyalty_points});

      if(upgrade_level){
        const user_level_updated = await Users.findById(req.params.id).select("level_updated");
        user_level_updated.level_updated = "yes";
        await user_level_updated.save();
      }
      
      res.status(201).send(result);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//Your point will be expired on
router.get("/check_expiry/:id", async (req, res) => {
  try {
    const points = await Points.find({ userId: req.params.id })
      .sort({
        created_date: 1,
      })
      .limit(1);

    if (points[0] == null) {
      return res.status(400).json({ message: "You dont have points yet!" });
    } else {
      const msg =
        "You have " +
        points[0].points +
        " points that will be disabled on " +
        points[0].exp_day +
        "/" +
        points[0].exp_month +
        "/" +
        points[0].exp_year;

      res.json(msg);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//test
// router.patch("/:id", async (req, res) => {
//   const points = await Points.findById(req.params.id);
//   if (req.body.created_date != null) {
//     points.created_date = req.body.created_date;
//   }
//   try {
//     const updated = await points.save();
//     res.json(updated);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

//delete user points
router.delete("/user-:id", async (req, res) => {
  try {
    await Points.find({userId : req.params.id}).remove();
    const user = await Users.findById(req.params.id)
    user.loyalty_points = 0;
    user.level = '63a54ed8ce7bbdb055268731';
    await user.save()
    res.json({ message: "Points Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//delete generated points
router.delete("/:id", getPoints, async (req, res) => {
  try {
    await res.points.remove();
    res.json({ message: "Points Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Clear all points
// router.delete("/", async (req, res) => {
//   try {
//     let points = await Points.find();
//     for (const one of points) {
//       await one.remove();
//     }
//     let buyPoints = await BuyPoints.find();
//     for (const buy of buyPoints) {
//       await buy.remove();
//     }
//     res.json({ message: "Points Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

async function getGeneratedPoints(req, res, next) {
  let points;
  try {
    points = await GeneratedPoints.find({
      code: req.params.code,
      status: "1",
    });
    if (points == null) {
      return res.status(400).json({ message: "Unavailbale Code" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.points = points;
  next();
}

async function getPoints(req, res, next) {
  let points;
  try {
    points = await GeneratedPoints.findById(req.params.id);
    if (points == null) {
      return res
        .status(400)
        .json({ message: "This points codes is not available" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.points = points;
  next();
}

function hash_signature(query_string) {
  return crypto
    .createHmac("sha512", apiSecret)
    .update(query_string)
    .digest("hex");
}

function random_string() {
  return crypto.randomBytes(32).toString("hex").substring(0, 32);
}

function dispatch_request(http_method, path, payload = {}) {
  const timestamp = Date.now();
  const nonce = random_string();
  const payload_to_sign =
    timestamp + "\n" + nonce + "\n" + JSON.stringify(payload) + "\n";
  const url = baseURL + path;
  const signature = hash_signature(payload_to_sign);
  return axios
    .create({
      baseURL,
      headers: {
        "content-type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature.toUpperCase(),
      },
    })
    .request({
      method: http_method,
      url,
      data: payload,
    });
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
