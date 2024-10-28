const express = require("express");
const router = express.Router();

const md5 = require("md5");
const Str = require("@supercharge/strings");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const Manager = require("../models/manager");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const GeneratedPoints = require("../models/generatedPoints");
const Spaces = require("../models/spaces");
const BookedSpaces = require("../models/book");
const EventBooking = require("../models/eventBooking");
const Merchandises = require("../models/merchandises");
const AddOns = require("../models/addOns");
const MerchVar = require("../models/variations");
const Users = require("../models/users");
const Menu = require("../models/menu");
const Points = require("../models/points");
const Cart = require("../models/cart");
const NotificationTokens = require("../models/notificationTokens");
const Levels = require("../models/levels");

const { sendNotification } = require('../utils/firebase');


//Get all (keep it commented)
router.get("/", async (req, res) => {
  try {
    const managers = await Manager.find();
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Register new manager (keep it commented)
// router.post("/", async (req, res) => {
//   let find;
//   try {
//     find = await Manager.findOne({ username: req.body.username });
//     if (find != null) {
//       return res.status(400).json({ message: "Username already exist" });
//     } else {
//       const pass = md5(req.body.password);
//       const manager = new Manager({
//         username: req.body.username,
//         password: pass,
//         branch: req.body.branch,
//       });
//       try {
//         const newManager = await manager.save();
//         res.json(newManager);
//       } catch (err) {
//         res.status(400).json({ message: err.message });
//       }
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// });

//update manager(keep it commented)
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { username, password } = req.body;
//   try {
//     const manager = await Manager.findById(id);
//     manager.username = username;
//     manager.password = md5(password);
//     const updatedManager = await manager.save();
//     res.json(updatedManager);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// login
router.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = md5(req.body.password);

  let find;
  try {
    find = await Manager.findOne({ username: username, password: password });
    if (find == null) {
      return res.status(400).json({ message: "Wrong Credentials" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  find.notification_managerId = req.body.notification_managerId;
  await find.save();

  const manager = { managerId: find._id };
  const accessToken = jwt.sign(manager, process.env.ACCESS_TOKEN_SECRET);
  find.login_token = accessToken;
  res.status(201).send(find);
});

//delete manager
// router.delete("/:id", getManager, async (req, res) => {
//   try {
//     await res.manager.remove();
//     res.json({ message: "Manager account Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//get orders by date
router.post("/orders_by_date", getOrdersByDate, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.managerId !== req.body.managerId) {
        res.status(400).json({ message: "token error" });
      } else {
        let allOrdersDetails = [];
        try {
          for (const one of res.orders) {
            let orderDetails = [];
            const items = await OrderItems.find({
              orderId: one._id,
            }).populate("merchId merchVarId menuId menuVarId milk addOns");
            orderDetails.push(one);
            orderDetails.push(items);
            allOrdersDetails.push(orderDetails);
          }
          res.send(allOrdersDetails);
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//get orders
router.post("/orders", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.managerId !== req.body.managerId) {
        res.status(400).json({ message: "token error" });
      } else {
        try {
          const manager = await Manager.findById(req.body.managerId);
          const managerBranch = manager.branch;
          const all_orders = await Orders.find({
            branchId: managerBranch,
            status: "SUCCESS",
          }).sort({
            created_date: -1,
          });

          let allOrdersDetails = [];
          for (const one of all_orders) {
            let orderDetails = [];
            const items = await OrderItems.find({
              orderId: one._id,
            }).populate("merchId merchVarId menuId menuVarId milk addOns");
            orderDetails.push(one);
            orderDetails.push(items);
            allOrdersDetails.push(orderDetails);
          }
          res.send(allOrdersDetails);
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//remove item from order
router.patch("/orders/:orderId/remove/:OrderItemId", authenticateToken, async (req, res) => {
  if (res.authData.managerId !== req.body.managerId) {
    res.status(400).json({ message: "token error" });
  } else {
    //add stock and delete item
    const orderId = req.params.orderId;
    const orderItemId = req.params.OrderItemId;
    try {
      const OrderItem = await OrderItems.findById(orderItemId);
      if (OrderItem.merchVarId) {
          const one = await Variations.findById(OrderItem.merchVarId);
          one.stock = one.stock + OrderItem.quantity;
          await one.save();
      }

      if (OrderItem.quantity == 1) {
        await OrderItems.findByIdAndDelete(orderItemId);
      } else{
        OrderItem.quantity--
        OrderItem.save();
      }

      // Recalculate total
      const remainingItems = await OrderItems.find({ orderId: orderId });
      let total_price = 0;
      for (const oneItem of remainingItems) {
        let item_price = 0;
        if (oneItem.menuId) {
            const menuItem = await Menu.findById(oneItem.menuId);
            item_price = parseFloat(menuItem.price);
            if (oneItem.menuVarId) {
                const menuVarItem = await MenuVar.findById(oneItem.menuVarId);
                item_price = item_price + parseFloat(menuVarItem.price);
            }
            if (oneItem.milk) {
                const milkItem = await AddOns.findById(oneItem.milk);
                item_price = item_price + parseFloat(milkItem.price);
            }
            if (oneItem.addOns) {
                for (const oneAddOn of oneItem.addOns) {
                    const addOnItem = await AddOns.findById(oneAddOn);
                    item_price = item_price + parseFloat(addOnItem.price);
                }
            }
        }
        if (oneItem.merchId) {
            const merchItem = await Merch.findById(oneItem.merchId);
            item_price = parseFloat(merchItem.price);
            if (oneItem.merchVarId) {
                const merchVarItem = await MerchVar.findById(oneItem.merchVarId);
                item_price = parseFloat(merchVarItem.price);
            }
        }
        if (oneItem.wifi == "yes") {
            item_price = parseFloat(process.env.WIFI_PRICE);
        }
        total_price = total_price + parseFloat(item_price) * parseFloat(oneItem.quantity);
      }

      const orderUsr = await Orders.findById(orderId);
      if (!orderUsr) {
        return res.status(404).json({ message: "Order not found" });
      }

      const nft_user = await Users.findById(orderUsr.userId);
      if (nft_user.type == "nft") {
          total_price = total_price * 0.8;
      }

      const order = await Orders.findById(orderId);
      order.total_price = total_price;
      await order.save();

      res.status(200).json({ message: "Order Items updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//Confirm order steps
router.patch("/confirm-:id", authenticateToken, async (req, res) => {
  if (res.authData.managerId !== req.body.managerId) {
    res.status(400).json({ message: "token error" });
  } else {
    const order = await Orders.findById(req.params.id).populate("userId", [
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
    order.step = req.body.step;
    try {
      const updatedOrder = await order.save();
      let status = req.body.step;
      let content_sent = "";
      if (status === "confirm") {
        content_sent = "Your order has bee-n confirmed";

        //remove points logic for canada users
        if (order.pay_with == "points" && order.countryId == "6332a4cdfe9b8e512af37e15") {
          try {
              let pointsToRemove = parseInt(order.total_price * process.env.POINTS_USD);

              do {
                  const orderPoints = await Points.find({
                      userId: order.userId,
                  }).limit(1);

                  if (orderPoints[0].points - pointsToRemove > 0) {
                      orderPoints[0].points = orderPoints[0].points - pointsToRemove;
                      await orderPoints[0].save();
                      pointsToRemove = 0;
                  } else {
                      pointsToRemove = pointsToRemove - orderPoints[0].points;
                      await orderPoints[0].remove();
                  }
              } while (pointsToRemove > 0);

              order.status = "SUCCESS";
              await order.save();

              const userCountry = await Users.findById(order.userId)
              await Cart.find({ userId: order.userId, country: userCountry.country }).remove();

              //send notification to the user
              try {
                const tokens = await NotificationTokens.find({ user_id: order.userId }).select('token_device');
                if (tokens.length === 0) {
                    console.log("No tokens found for this user.");
                }
                else{
                  const content = {
                    title: "B.Hive Orders",
                    body: "Your order is confirmed. Thank you!",
                    type: "order",  
                    object: "", 
                    screen: "order-screen"
                  };
                
                    // Send notifications using the Firebase new
                    for (const token of tokens) {
                        await sendNotification(token.token_device, content);
                        console.log("Sending notification to:", token.token_device);
                    }
                }
            
              } catch (err) {
                console.error('Error sending notification:', err);
                res.status(500).json({ message: err.message });
              }

              // send notification to the manager
              try {
                const tokens = await NotificationTokens.find({ user_id: req.body.managerId }).select('token_device');
                if (tokens.length === 0) {
                    console.log("No tokens found for this user.");
                }
                else{
                  const content = {
                    title: "New Order",
                    body: "Order status updated to: confirmed",
                    type: "order",  
                    object: "", 
                    screen: "order-screen"
                  };
                
                    // Send notifications using the Firebase new
                    for (const token of tokens) {
                        await sendNotification(token.token_device, content);
                        console.log("Sending notification to:", token.token_device);
                    }
                }
            
              } catch (err) {
                console.error('Error sending notification:', err);
                res.status(500).json({ message: err.message });
              }

          } catch (err) {
              res.status(400).json({ message: err.message });
          }
        }

        //add points logic for canada users
        if (order.pay_with == "clover" && order.countryId == "6332a4cdfe9b8e512af37e15") {
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
            userId: order.userId._id,
            orderId: order._id,
            points: parseInt(
              order.total_price * process.env.USD_POINTS
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
                const user = await Users.findById(order.userId._id);
                const new_loyalty_points = user.loyalty_points + parseInt(order.total_price * process.env.USD_POINTS)
                user.loyalty_points = new_loyalty_points;
                await user.save();
                let loyalty_points = new_loyalty_points;
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

                if(upgrade_level){
                    const user_level_updated = Users.findById(order.userId._id)
                    user_level_updated.level_updated = "yes";
                    await user_level_updated.save();
                }

              } catch (err) {
                res.status(500).json({ message: err.message });
              }
            } catch (err) {
              res.status(400).json({ message: err.message });
            }
        }
      } else if (status === "preparing") {
        content_sent = "Your order is bee-ing prepared";
      } else if (status === "delivered") {
        content_sent = "Your order has bee-n delivered";
      } else if (status === "decline") {
        content_sent =
          "Your order has bee-n declined. Please check with the B.Hive team";
      }


      if (status !== "confirm"){
        try {
          const tokens = await NotificationTokens.find({ user_id: order.userId }).select('token_device');
          if (tokens.length === 0) {
              console.log("No tokens found for this user.");
          }
          else{
            const content = {
              title: "B.Hive Orders",
              body: content_sent,
              type: "order",  
              object: "", 
              screen: "order-screen"
            };
          
              // Send notifications using the Firebase new
              for (const token of tokens) {
                  await sendNotification(token.token_device, content);
                  console.log("Sending notification to:", token.token_device);
              }
          }
      
        } catch (err) {
          console.error('Error sending notification:', err);
          res.status(500).json({ message: err.message });
        }
      }

      res.json(updatedOrder);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Generate points
router.post("/generate-points", authenticateToken, async (req, res) => {
  if (res.authData.managerId !== req.body.managerId) {
    res.status(400).json({ message: "token error" });
  } else {
    const newPoints = new GeneratedPoints({
      managerId: req.body.managerId,
      code: randomString(15),
      price: req.body.price,
      points: parseInt(req.body.price * process.env.POINTS_USD),
    });
    try {
      const generatedpoints = await newPoints.save();
      res.status(201).json(generatedpoints.code);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//get booked spaces by date
router.post("/space-bookings", getSpacesByDate, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.managerId !== req.body.managerId) {
        res.status(400).json({ message: "token error" });
      } else {
        res.send(res.spaces);
      }
    }
  });
});

//get all booked spaces
router.post("/all-space-bookings", authenticateToken, async (req, res) => {
  if (res.authData.managerId !== req.body.managerId) {
    res.status(400).json({ message: "token error" });
  } else {
    const manager = await Manager.findById(req.body.managerId);
    const managerBranch = manager.branch;

    await BookedSpaces.find()
      .populate({
        path: "space_id",
        match: {
          branch: managerBranch,
        },
      })
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
      .then((bookings) => {
        res.json(bookings);
      });
  }
});

//Get all booking for an event
router.post("/booked/:id", authenticateToken, async (req, res) => {
  if (res.authData.managerId !== req.body.managerId) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      const booked = await EventBooking.find({
        event_id: req.params.id,
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
      res.status(201).json(booked);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//Update item
router.patch("/menu/:id", getMenuItem, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.managerId !== req.body.managerId) {
        res.status(400).json({ message: "token error" });
      } else {
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

//Update merch
router.patch("/merchandises/:id", getMerchs, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      if (authData.managerId !== req.body.managerId) {
        res.status(400).json({ message: "token error" });
      } else {
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

async function getManager(req, res, next) {
  let manager;
  try {
    manager = await Manager.findById(req.params.id);
    if (manager == null) {
      return res
        .status(400)
        .json({ message: "This manager id is not available" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.manager = manager;
  next();
}

async function getOrdersByDate(req, res, next) {
  const manager = await Manager.findById(req.body.managerId);
  const managerBranch = manager.branch;
  let date = req.body.date;
  //   date = date.split("T")[0];
  let all_orders;
  let orders = [];
  try {
    all_orders = await Orders.find({
      branchId: managerBranch,
      $or: [
        { status: "SUCCESS" },
        { pay_with: "points" }
      ]
    }).populate("userId", ["name", "email", "type"]);

    if (all_orders == null) {
      return res.status(400).json({ message: "No orders available" });
    } else {
      for (const one of all_orders) {
        let created_date = one.created_date;
        let month = created_date.getMonth() + 1;
        let days = created_date.getDate();

        if (
          month === 1 ||
          month === 2 ||
          month === 3 ||
          month === 4 ||
          month === 5 ||
          month === 6 ||
          month === 7 ||
          month === 8 ||
          month === 9
        ) {
          month = "0" + month;
        }
        if (
          days === 1 ||
          days === 2 ||
          days === 3 ||
          days === 4 ||
          days === 5 ||
          days === 6 ||
          days === 7 ||
          days === 8 ||
          days === 9
        ) {
          days = "0" + days;
        }

        created_date = created_date.getFullYear() + "-" + month + "-" + days;

        if (created_date == date) {
          orders.push(one);
        }
      }
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.orders = orders;
  next();
}

async function getSpacesByDate(req, res, next) {
  const manager = await Manager.findById(req.body.managerId);
  const managerBranch = manager.branch;

  let date = req.body.date;
  let bookings = [];
  let result = [];
  try {
    const all_spaces = await BookedSpaces.find({
      status: "SUCCESS",
    })
      .sort({
        from_date: -1,
      })
      .populate({
        path: "space_id",
        match: {
          branch: managerBranch,
        },
      })
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
      ]);

    for (const one of all_spaces) {
      if (one.space_id !== null) {
        bookings.push(one);
      }
    }

    if (bookings == null) {
      return res.status(400).json({ message: "No bookings available" });
    } else {
      for (const one of bookings) {
        let from_date = one.from_date.split(" ")[0];
        from_date = new Date(from_date);
        let month = from_date.getMonth() + 1;
        let days = from_date.getDate();

        if (
          month === 1 ||
          month === 2 ||
          month === 3 ||
          month === 4 ||
          month === 5 ||
          month === 6 ||
          month === 7 ||
          month === 8 ||
          month === 9
        ) {
          month = "0" + month;
        }
        if (
          days === 1 ||
          days === 2 ||
          days === 3 ||
          days === 4 ||
          days === 5 ||
          days === 6 ||
          days === 7 ||
          days === 8 ||
          days === 9
        ) {
          days = "0" + days;
        }
        from_date = from_date.getFullYear() + "-" + month + "-" + days;
        if (from_date == date) {
          result.push(one);
        }
      }
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.spaces = result;
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

function randomString(length) {
  var result = "";
  var characters = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

module.exports = router;
