const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const request = require("request");
const OneSignal = require("onesignal-node");

const Spaces = require("../models/spaces");
const Book = require("../models/book");
const Points = require("../models/points");
const Users = require("../models/users");
const Manager = require("../models/manager");

const crypto = require("crypto");
const axios = require("axios");
const users = require("../models/users");

const apiKey =
  "rwzzqd5vfu0dhnutywrj0oocubbasdsxdqxnvxossjesw1b0nj1gswrk4oxbwyzc"; // set your API key here
const apiSecret =
  "ubc7ztfkcc9nushbra4oaopgr7tecocmr3wp8fik7q9kgclk7wmja18qpmhowtrp"; // set your secret key here
const baseURL = "https://bpay.binanceapi.com";

//token
const app_key_provider = {
  getToken() {
    return "YzBjMTY0YzAtZWUzYy00MTQ4LThjMDYtNTA5YzQxODcyNGRi";
  },
};

//Get all
router.get("/", async (req, res) => {
  try {
    const all_spaces = await Spaces.find();
    res.json(all_spaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all in a branch
router.get("/branch/:id", getSpacesByBranch, async (req, res) => {
  try {
    res.send(res.space);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const space = new Spaces({
      branch: req.body.branch,
      title: req.body.title,
      image: req.body.image,
      upto: req.body.upto,
      price: req.body.price,
      features: req.body.features,
      ideal_for: req.body.ideal_for,
      capacity: req.body.capacity,
    });
    try {
      const newSpace = await space.save();
      res.status(201).json(newSpace);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Book
router.post("/book", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.body.user_id) {
    res.status(400).json({ message: "token error" });
  } else {
    let date1 = new Date(req.body.from_date);
    var date2 = new Date(req.body.till_date);

    let date_booked = false;
    const past_booking = await Book.find().or([
      { status: "pending" },
      { status: "SUCCESS" },
    ]);

    for (const book of past_booking) {
      if (date1 >= book.from_date && date1 <= book.till_date) {
        date_booked = true;
      }
    }

    if (date_booked) {
      res.status(400).json({ message: "Date already booked" });
    } else {
      let counter = 0;
      let total_hours = Math.abs(date2 - date1) / (1000 * 60 * 60);
      total_hours = total_hours.toString();

      let hour_price = await Spaces.findById(req.body.space_id);
      hour_price = hour_price.price;

      let total_price = parseInt(total_hours * hour_price);

      let discount = await Users.findById(req.body.user_id).populate("level");
      discount = discount.level.booking_disc;
      if (discount !== null) {
        total_price = parseInt(total_price - (total_price * discount) / 100);
      }

      const nft_user = await Users.findById(req.body.user_id);
      if (nft_user.type == "nft") {
        total_price = parseInt(total_price * 0.8);
      }

      if (req.body.pay_with == "points") {
        const points = await Points.find({ userId: req.body.user_id }).select(
          "points"
        );
        if (points == null) {
          counter = 1;
        } else {
          let total_points = 0;
          for (const one of points) {
            total_points = total_points + one.points;
          }
          if (total_points < total_price * process.env.POINTS_USD) {
            counter = 2;
          }
        }
      }

      if (counter == 2) {
        res.status(400).json({ message: "More points needed" });
      } else if (counter == 1) {
        res.status(400).json({ message: "No points found" });
      } else if (counter == 0) {
        const book = new Book({
          user_id: req.body.user_id,
          space_id: req.body.space_id,
          from_date: req.body.from_date,
          till_date: req.body.till_date,
          total_price: total_price,
          pay_with: req.body.pay_with,
        });
        try {
          const newbook = await book.save();
          const latest = await Book.findById(newbook._id).populate("user_id", [
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
          ]).populate("space_id");
          let result = [];
          let binance_response = "";

          if (req.body.pay_with == "binance") {
            await dispatch_request("POST", "/binancepay/openapi/order", {
              merchantId: latest.user_id.customized_userId,
              merchantTradeNo: latest._id,
              tradeType: "APP",
              totalFee: total_price,
              currency: "USDT",
              productType: "Book",
              productName: "Space",
              productDetail: "New Booking",
            })
              .then((response) => {
                binance_response = response.data;
              })
              .catch((error) => console.log(error));
          } else if (req.body.pay_with == "points") {
            try {
              let pointsToRemove = parseInt(total_price * process.env.POINTS_USD);

              do {
                const orderPoints = await Points.find({
                  userId: req.body.user_id,
                }).limit(1);

                if (orderPoints[0].points - pointsToRemove > 0) {
                  orderPoints[0].points =
                    orderPoints[0].points - pointsToRemove;
                  await orderPoints[0].save();
                  pointsToRemove = 0;
                } else {
                  pointsToRemove = pointsToRemove - orderPoints[0].points;
                  await orderPoints[0].remove();
                }
              } while (pointsToRemove > 0);

              latest.status = "SUCCESS";
              latest.save();
            } catch (err) {
              res.status(400).json({ message: err.message });
            }

            try{
              //send notification
              var data_succ = JSON.stringify({
                users_id: [latest.user_id.notification_userId],
                title: "B.Hive Spaces",
                content: "Your space is booked successfully. See you soon!",
                subTitle: "",
              });

              var config_succ = {
                method: "post",
                url: "https://thebhive.io/api/notifications",
                headers: {
                  "Content-Type": "application/json",
                },
                data: data_succ,
              };

              axios(config_succ)
                .then(function (response) {
                  console.log(JSON.stringify(response.data));
                })
                .catch(function (error) {
                  console.log(error);
                });
            }
            catch(err){}

            try {
              //notification to manager
              const manager = await Manager.find({ branch: latest.space_id.branch });
              var data_manager = JSON.stringify({
                  users_id: [manager[0].notification_managerId],
                  title: "New Booking",
                  content: "New space has been booked.",
                  subTitle: "",
              });

              var config_manager = {
                  method: "post",
                  url: "https://thebhive.io/api/notifications",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  data: data_manager,
              };

              axios(config_manager)
                  .then(function (response) {
                      console.log(JSON.stringify(response.data));
                  })
                  .catch(function (error) {
                      console.log(error);
                  });
            } catch (err) {}

            //book space send email success
            // try {
            //   // send email
            //   const temp = `<b>Congratulations!</b><br/><br/>Your space has been booked from ${req.body.from_date} till ${req.body.till_date}`;
            //   var send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Book%20Space&to=${latest.user_id.email}&template=${temp}`,
            //     method: "POST",
            //     headers: {
            //       "Content-Type": "application/json",
            //     },
            //   };
            //   request(send_email, function (error, response, body) {
            //     if (!error && response.statusCode == 200) {
            //       console.log("Message sent");
            //     } else {
            //       console.log(error);
            //       console.log("Message NOT sent!");
            //     }
            //   });
            // } catch (err) {
            //   res.status(400).json({ message: err.message });
            // }
          }

          result.push(latest);
          const points = await Points.find({ userId: req.body.user_id }).select(
            "points"
          );
          let total_points = 0;
          for (const one of points) {
            total_points = total_points + one.points;
          }
          result.push(total_points);
          result.push(binance_response);
          res.status(201).send(result);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  }
});

//Get all booked
router.get("/book", async (req, res) => {
  try {
    await Book.find()
      .populate("space_id")
      .populate("user_id", [
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
      .sort({
        from_date: -1,
      })
      .then((user) => {
        res.json(user);
      });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all booking for a space
router.get("/book/space/:id", async (req, res) => {
  try {
    const booked = await Book.find({
      space_id: req.params.id,
      status: "SUCCESS",
    }).sort({
      from_date: -1,
    });
    res.status(201).json(booked);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all booked for user
router.get("/book/user-:id", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.params.id) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      await Book.find({ user_id: req.params.id })
        .populate("space_id")
        .sort({
          from_date: -1,
        })
        .then((user) => {
          res.json(user);
        });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//clear all booking
// router.delete("/clear-book", async (req, res) => {
//   try {
//     await Book.find().remove();
//     res.json({ message: "Booking Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Get one space details
router.get("/:id", getSpaces, (req, res) => {
  res.send(res.space);
});

//Cancel a booking
router.patch("/cancel-book/:id", getBooking, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.userId != res.book.user_id) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          const booking = await Book.findById(req.params.id);
          booking.status = "canceled";
          booking.save();
          res.json({ message: "Booking Canceled!" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

// Update space
router.patch("/:id", getSpaces, async (req, res) => {
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
          res.space.title = req.body.title;
        }
        if (req.body.image != null) {
          res.space.image = req.body.image;
        }
        if (req.body.upto != null) {
          res.space.upto = req.body.upto;
        }
        if (req.body.price != null) {
          res.space.price = req.body.price;
        }
        if (req.body.features != null) {
          res.space.features = req.body.features;
        }
        if (req.body.ideal_for != null) {
          res.space.ideal_for = req.body.ideal_for;
        }
        if (req.body.capacity != null) {
          res.space.capacity = req.body.capacity;
        }
        try {
          const updatedSpace = await res.space.save();
          res.json(updatedSpace);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete a space
router.delete("/:id", getSpaces, async (req, res) => {
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
          await res.space.remove();
          res.json({ message: "Space Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

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

async function getSpaces(req, res, next) {
  let space;
  try {
    space = await Spaces.findById(req.params.id);
    if (space == null) {
      return res.status(400).json({ message: "Space not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.space = space;
  next();
}

async function getSpacesByBranch(req, res, next) {
  let space;
  try {
    space = await Spaces.find({ branch: req.params.id });
    if (space == null) {
      return res
        .status(400)
        .json({ message: "No space available in this branch" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.space = space;
  next();
}

async function getBooking(req, res, next) {
  let book;
  try {
    book = await Book.findById(req.params.id);
    if (book == null) {
      return res.status(400).json({ message: "Booking not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.book = book;
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

async function client_configuration() {
  const configuration = OneSignal.createConfiguration({
    authMethods: {
      app_key: {
        tokenProvider: app_key_provider,
      },
    },
  });
  const client = new OneSignal.DefaultApi(configuration);
  return client;
}

module.exports = router;
