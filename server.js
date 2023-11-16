require("dotenv").config();
  
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const md5 = require("md5");
const request = require("request");
 
const Users = require("./models/users");
const Points = require("./models/points");
const Announcement = require("./models/announcement");
const Orders = require("./models/orders");
const BookedSpaces = require("./models/book");
const BoughtPoints = require("./models/buyPoints");
const Cart = require("./models/cart");
const Levels = require("./models/levels.js");
const Manager = require("./models/manager");
 
const axios = require("axios");
const crypto = require("crypto");

const app = express();

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("Connected to Database!"));

app.use(express.json());
app.use(cors());

const apiKey =
  "rwzzqd5vfu0dhnutywrj0oocubbasdsxdqxnvxossjesw1b0nj1gswrk4oxbwyzc"; // set your API key here
const apiSecret =
  "ubc7ztfkcc9nushbra4oaopgr7tecocmr3wp8fik7q9kgclk7wmja18qpmhowtrp"; // set your secret key here
const baseURL = "https://bpay.binanceapi.com";

const usersRouter = require("./routes/users");
app.use("/users", usersRouter);

const spacesRouter = require("./routes/spaces");
app.use("/spaces", spacesRouter);

const merchandisesRouter = require("./routes/merchandises");
app.use("/merchandises", merchandisesRouter);

const countriesRouter = require("./routes/countries");
app.use("/countries", countriesRouter);

const branchesRouter = require("./routes/branches");
app.use("/branches", branchesRouter);

const wifiRouter = require("./routes/wifi");
app.use("/wifi", wifiRouter);
 
const menuRouter = require("./routes/menu");
app.use("/menu", menuRouter);

const categoriesRouter = require("./routes/categories");
app.use("/categories", categoriesRouter);

const addOnsRouter = require("./routes/addOns");
app.use("/addOns", addOnsRouter);

const cartRouter = require("./routes/cart");
app.use("/cart", cartRouter);

const orderRouter = require("./routes/orders");
app.use("/orders", orderRouter);

const pointsRouter = require("./routes/points");
app.use("/points", pointsRouter);

const announcementRouter = require("./routes/announcement");
app.use("/announcement", announcementRouter);

const eventsRouter = require("./routes/events");
app.use("/events", eventsRouter);

const nft = require("./routes/nft");
app.use("/nft", nft);

const levels = require("./routes/levels");
app.use("/levels", levels);

const admin = require("./routes/admin");
app.use("/admin", admin);

const manager = require("./routes/manager");
app.use("/manager", manager);

const notification = require("./routes/notification");
app.use("/notification", notification);

const terms = require("./routes/terms");
app.use("/terms", terms);

const test = require("./routes/test");
app.use("/test", test);

//App version
app.post("/version", async (req, res) => {
  let result = [];
  result.push({ version: "0.1.0" });
  const announcement = await Announcement.find({ branch: req.body.branchId });
  result.push(announcement);
  res.status(201).send(result);
});

// login
app.post("/login", async (req, res) => {
  const email = req.body.email.toLowerCase();
  const password = md5(req.body.password);

  let find;
  try {
    find = await Users.findOne({ email: email, password: password });
    if (find == null) {
      wrong_pass = await Users.findOne({ email: email });
      if (wrong_pass !== null) {
        return res.status(400).json({ message: "Wrong Password" });
      } else {
        return res.status(400).json({ message: "User not found" });
      }
    } else if (find.active == 0) {
      return res.status(400).json({ message: "User not active" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  find.notification_userId = req.body.notification_userId;
  find.save();

  const user = { userId: find._id };
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
  find.login_token = accessToken;

  let result = [];
  result.push(find);
  const points = await Points.find({ userId: find._id }).select("points");
  let total_points = 0;
  for (const one of points) {
    total_points = total_points + one.points;
  }
  result.push(total_points);
  res.status(201).send(result);
  // res.json({ userDetails: find });
});

//Home api : announcement + points + expired
app.post("/home", async (req, res) => {
  let result = [];

  const current_date = new Date();
  const current_day = current_date.getDate();
  const current_month = current_date.getMonth() + parseInt(1);
  const current_year = current_date.getFullYear();

  const all_points = await Points.find();
  for (const one of all_points) {
    if (current_day == one.exp_day) {
      if (current_month == one.exp_month) {
        if (current_year == one.exp_year) {
          await one.remove();
        }
      }
    }
  }

  const announcement = await Announcement.find({ branch: req.body.branchId });
  result.push(announcement);

  if (req.body.userId !== 0) {
    const points = await Points.find({ userId: req.body.userId }).select(
      "points"
    );
    let total_points = 0;
    for (const one of points) {
      total_points = total_points + one.points;
    }
    result.push({redeemable: total_points});

    const user = await Users.findById(req.body.userId);
    result.push({loyalty: user.loyalty_points});
  }
  res.status(201).send(result);
});

//Api to check binance orders status
app.post("/check_pending", async (req, res) => {
  const orders = await Orders.find({
    userid: req.body.userId,
    pay_with: "binance",
    status: "pending",
  }).populate("userId", [
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
  const booked_spaces = await BookedSpaces.find({
    user_id: req.body.userId,
    pay_with: "binance",
    status: "pending",
  }).populate("user_id", [
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
  const bought_points = await BoughtPoints.find({
    userId: req.body.userId,
    status: "pending",
  }).populate("userId", [
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

  let order_counter = 0;
  let booking_counter = 0;
  let points_counter = 0;

  if (orders[0] == null) {
    order_counter = 1;
  } else {
    for (const one of orders) {
      dispatch_request("POST", "/binancepay/openapi/order/query", {
        merchantId: one.customized_userId,
        merchantTradeNo: one._id,
      })
        .then(async (response) => {
          const pending_order = await Orders.findById(
            response.data.data.merchantTradeNo
          ).populate("userId", [
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

          if (response.data.data.status == "PAID") {
            pending_order.status = "SUCCESS";
            pending_order.save();

            const userCountry = await Users.findById(req.body.userId)
            await Cart.find({ userId: req.body.userId, country: userCountry.country }).remove();

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

            const points = new Points({
              userId: req.body.userId,
              orderId: response.data.data.merchantTradeNo,
              points: parseInt(
                pending_order.total_price * process.env.USD_POINTS
              ),
              exp_day: exp_day,
              exp_month: exp_month,
              exp_year: exp_year,
            });
            try {
              await points.save();

              // change level
              try {
                let result = [];
                
                const all_levels = await Levels.find();
                const user = await Users.findById(req.body.userId);
                const new_loyalty_points = user.loyalty_points + parseInt(pending_order.total_price * process.env.USD_POINTS)
                user.loyalty_points = new_loyalty_points;
                await user.save();
                let loyalty_points = new_loyalty_points;
                let level = user.level;

                if (
                  parseInt(loyalty_points) >= parseInt(all_levels[4].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString() ||
                    user.level.toString() == all_levels[3]._id.toString())
                ) {
                  level = all_levels[4]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[3].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString())
                ) {
                  level = all_levels[3]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[2].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString())
                ) {
                  level = all_levels[2]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[1].start_at) &&
                  user.level.toString() == all_levels[0]._id.toString()
                ) {
                  level = all_levels[1]._id;
                }
                user.level = level;
                user.save();
              } catch (err) {
                res.status(500).json({ message: err.message });
              }
            } catch (err) {
              res.status(400).json({ message: err.message });
            }

            try{
              //send notification
              var data_succ = JSON.stringify({
                users_id: [pending_order.userId.notification_userId],
                title: "B.Hive Orders",
                content: "Your order is placed successfully. Thank you!",
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

            //place order send email on success
            // const order_temp = `<b>Congratulations!</b><br/><br/>Your order ${one._id} has been placed successfully for ${one.total_price}$`;
            // try {
            //   // send email
            //   var order_send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Place%20Order&to=${oneBooking.user_id.email}&template=${order_temp}`,
            //     method: "POST",
            //     headers: {
            //       "Content-Type": "application/json",
            //     },
            //   };
            //   request(order_send_email, function (error, response, body) {
            //     if (!error && response.statusCode == 200) {
            //       console.log("Message sent");
            //     } else {
            //       console.log(error);
            //     }
            //   });
            // } catch (err) {
            //   res.status(400).json({ message: err.message });
            // }
          } else {
            pending_order.status = "FAIL";
            pending_order.save();

            try{
              var data = JSON.stringify({
                users_id: [pending_order.userId.notification_userId],
                title: "B.Hive Orders",
                content: "Oops! Something went wrong in your payment",
                subTitle: "",
              });

              var config = {
                method: "post",
                url: "https://thebhive.io/api/notifications",
                headers: {
                  "Content-Type": "application/json",
                },
                data: data,
              };

              axios(config)
                .then(function (response) {
                  console.log(JSON.stringify(response.data));
                })
                .catch(function (error) {
                  console.log(error);
                });
            } catch(err){}

            //place order send email on fail
            // const order_fail_temp = `<b>Oops!</b><br/><br/>Something went wrong in your order payment.<br/>Order id: ${one._id}<br/><br/>Please try again`;
            // try {
            //   // send email
            //   var send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Place%20Order&to=${one.userId.email}&template=${order_fail_temp}`,
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
        })
        .catch((error) => console.log(error));
    }
  }

  if (booked_spaces[0] == null) {
    booking_counter = 1;
  } else {
    for (const oneBooking of booked_spaces) {
      dispatch_request("POST", "/binancepay/openapi/order/query", {
        merchantId: oneBooking.user_id.customized_userId,
        merchantTradeNo: oneBooking._id,
      })
        .then(async (response) => {
          const pending_booking = await BookedSpaces.findById(
            response.data.data.merchantTradeNo
          ).populate("user_id", [
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
          let temp = "";
          if (response.data.data.status == "PAID") {
            pending_booking.status = "SUCCESS";
            pending_booking.save();

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

            const points = new Points({
              userId: req.body.userId,
              orderId: response.data.data.merchantTradeNo,
              points: parseInt(
                pending_booking.total_price * process.env.USD_POINTS
              ),
              exp_day: exp_day,
              exp_month: exp_month,
              exp_year: exp_year,
            });
            try {
              await points.save();

              // change level
              try {
                let result = [];
                
                const all_levels = await Levels.find();
                const user = await Users.findById(req.body.userId);
                const new_loyalty_points = user.loyalty_points + parseInt(pending_booking.total_price * process.env.USD_POINTS)
                user.loyalty_points = new_loyalty_points;
                await user.save();
                let loyalty_points = new_loyalty_points;
                let level = user.level;

                if (
                  parseInt(loyalty_points) >= parseInt(all_levels[4].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString() ||
                    user.level.toString() == all_levels[3]._id.toString())
                ) {
                  level = all_levels[4]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[3].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString())
                ) {
                  level = all_levels[3]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[2].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString())
                ) {
                  level = all_levels[2]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[1].start_at) &&
                  user.level.toString() == all_levels[0]._id.toString()
                ) {
                  level = all_levels[1]._id;
                }
                user.level = level;
                user.save();
              } catch (err) {
                res.status(500).json({ message: err.message });
              }
            } catch (err) {
              res.status(400).json({ message: err.message });
            }

            try{
              //send notification
              var data_succ = JSON.stringify({
                users_id: [pending_booking.user_id.notification_userId],
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
              const manager = await Manager.find({ branch: pending_booking.space_id.branch });
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
            // const temp = `<b>Congratulations!</b><br/><br/>Your space has been booked from ${oneBooking.from_date} till ${oneBooking.till_date}`;
            // try {
            //   // send email
            //   var send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Book%20Space&to=${oneBooking.user_id.email}&template=${temp}`,
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
          } else {
            pending_booking.status = "FAIL";
            await pending_booking.save();

            try{
              var data = JSON.stringify({
                users_id: [pending_booking.userId.notification_userId],
                title: "B.Hive Spaces",
                content: "Oops! Something went wrong in your booking",
                subTitle: "",
              });

              var config = {
                method: "post",
                url: "https://thebhive.io/api/notifications",
                headers: {
                  "Content-Type": "application/json",
                },
                data: data,
              };

              axios(config)
                .then(function (response) {
                  console.log(JSON.stringify(response.data));
                })
                .catch(function (error) {
                  console.log(error);
                });
            } catch(err){}

            //book space send email fail
            // const fail_temp = `<b>Oops!</b><br/><br/>Something went wrong in your space booking. Please try again`;
            // try {
            //   // send email
            //   var send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Book%20Space&to=${oneBooking.user_id.email}&template=${fail_temp}`,
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
        })
        .catch((error) => console.log(error));
    }
  }

  if (bought_points[0] == null) {
    points_counter = 1;
  } else {
    for (const onePoints of bought_points) {
      dispatch_request("POST", "/binancepay/openapi/order/query", {
        merchantId: onePoints.userId.customized_userId,
        merchantTradeNo: onePoints._id,
      })
        .then(async (response) => {
          const pending_order = await BoughtPoints.findById(onePoints._id);
          if (response.data.data.status == "PAID") {
            pending_order.status = "SUCCESS";
            pending_order.save();

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

            const points = new Points({
              userId: req.body.userId,
              orderId: response.data.data.merchantTradeNo,
              points: parseInt(onePoints.points),
              exp_day: exp_day,
              exp_month: exp_month,
              exp_year: exp_year,
            });
            try {
              await points.save();

              // change level
              try {
                let result = [];
                
                const all_levels = await Levels.find();
                const user = await Users.findById(req.body.userId);
                const new_loyalty_points = user.loyalty_points + parseInt(onePoints.points)
                user.loyalty_points = new_loyalty_points;
                await user.save();
                let loyalty_points = new_loyalty_points;
                let level = user.level;

                if (
                  parseInt(loyalty_points) >= parseInt(all_levels[4].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString() ||
                    user.level.toString() == all_levels[3]._id.toString())
                ) {
                  level = all_levels[4]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[3].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString() ||
                    user.level.toString() == all_levels[2]._id.toString())
                ) {
                  level = all_levels[3]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[2].start_at) &&
                  (user.level.toString() == all_levels[0]._id.toString() ||
                    user.level.toString() == all_levels[1]._id.toString())
                ) {
                  level = all_levels[2]._id;
                } else if (
                  parseInt(loyalty_points) >= parseInt(all_levels[1].start_at) &&
                  user.level.toString() == all_levels[0]._id.toString()
                ) {
                  level = all_levels[1]._id;
                }
                user.level = level;
                user.save();
              } catch (err) {
                res.status(500).json({ message: err.message });
              }

              //Buy points send email success
              // const temp = `<b>Congratulations!</b><br/><br/>${onePoints.points} points added to your balance successfully`;
              // try {
              //   // send email
              //   var send_email = {
              //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Buy%20Points&to=${onePoints.userId.email}&template=${temp}`,
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
            } catch (err) {
              res.status(400).json({ message: err.message });
            }
          } else {
            pending_order.status = "FAIL";
            pending_order.save();

            //Buy points send email fail
            // const fail_temp = `<b>Oops!</b><br/><br/>Something went wrong in your points order. Please try again`;
            // try {
            //   // send email
            //   var send_email = {
            //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Buy%20Points&to=${onePoints.userId.email}&template=${fail_temp}`,
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
        })
        .catch((error) => console.log(error));
    }
  }

  // send points + level

  try {
    let result = [];
    
    const all_levels = await Levels.find();
    const user = await Users.findById(req.body.userId);
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

    const points = await Points.find({ userId: req.body.userId }).select("points");
    let total_points = 0;
    for (const one of points) {
      total_points = total_points + one.points;
    }

    result.push({redeemable: parseInt(total_points)});
    result.push({loyalty: loyalty_points});
    result.push({level: user_level});

    if(upgrade_level){
      const user_level_updated = Users.findById(req.body.userId)
      user_level_updated.level_updated = "yes";
      await user_level_updated.save();
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }

  // if (order_counter == 1 && booking_counter == 1 && points_counter == 1) {
  //   return res.status(400).json({ message: "No pending payment found" });
  // } else {
  //   return res.status(201).json({ message: "Checked!" });
  // }
});

function dispatch_request(http_method, path, payload = {}) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(32).toString("hex").substring(0, 32);
  const payload_to_sign =
    timestamp + "\n" + nonce + "\n" + JSON.stringify(payload) + "\n";
  const url = baseURL + path;
  const signature = crypto
    .createHmac("sha512", apiSecret)
    .update(payload_to_sign)
    .digest("hex");
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

app.listen(3000, () => console.log("Server Started!"));
