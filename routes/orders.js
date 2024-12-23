const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const request = require("request");
const axios = require("axios");
const crypto = require("crypto");

const Orders = require("../models/orders");
const OrderItem = require("../models/orderItems");
const Points = require("../models/points");
const Variations = require("../models/variations");
const Wifi = require("../models/wifi");
const Cart = require("../models/cart");
const Users = require("../models/users");
const Menu = require("../models/menu");
const MenuVar = require("../models/menuVars");
const Merch = require("../models/merchandises");
const MerchVar = require("../models/variations");
const AddOns = require("../models/addOns");
const Manager = require("../models/manager");
const Levels = require("../models/levels");
const merchandises = require("../models/merchandises");
const NotificationTokens = require("../models/notificationTokens");

const { sendNotification } = require('../utils/firebase');

const apiKey = "rwzzqd5vfu0dhnutywrj0oocubbasdsxdqxnvxossjesw1b0nj1gswrk4oxbwyzc"; // set your API key here
const apiSecret = "ubc7ztfkcc9nushbra4oaopgr7tecocmr3wp8fik7q9kgclk7wmja18qpmhowtrp"; // set your secret key here
const baseURL = "https://bpay.binanceapi.com";

//testing
// router.post("/test-manager", async (req, res) => {
// try {
//     //notification to manager
//     const manager = await Manager.find({ branch: req.body.branchId });
//     var data_manager = JSON.stringify({
//         users_id: [manager[0].notification_managerId],
//         title: "Testing",
//         content: "Please ignore this notification.",
//         subTitle: "",
//     });

// console.log(manager[0].notification_managerId)
// console.log("------")
//     var config_manager = {
//         method: "post",
//         url: "https://thebhive.io/api/notifications",
//         headers: {
//             "Content-Type": "application/json",
//         },
//         data: data_manager,
//     };

//     axios(config_manager)
//         .then(function (response) {
//             console.log(JSON.stringify(response.data));
//         })
//         .catch(function (error) {
//             console.log(error);
//         });
// } catch (err) {}
// })

//Get all orders
router.get("/", async (req, res) => {
    try {
        const orders = await Orders.find()
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
            .sort({
                created_date: -1,
            })
            .then((user) => {
                res.json(user);
            });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Get pending orders
// router.get("/pending", async (req, res) => {
//   try {
//     const orders = await Orders.find({ status: "pending" });
//     res.json(orders);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Get orders by user id
router.get("/user/:id", getUserOrders, async (req, res) => {
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
                let allOrdersDetails = [];
                try {
                    for (const one of res.orders) {
                        let orderDetails = [];
                        const items = await OrderItem.find({
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

//place order
router.post("/", authenticateToken, async (req, res) => {
    if (res.authData.userId !== req.body.userId) {
        res.status(400).json({ message: "token error" });
    } else {
        const items = req.body.items;
        let count = 0;
        let result = [];

        try {
            for (const item of items) {
                if (item.wifi == "yes") {
                    let one = await Wifi.find({
                        available: "yes",
                        branch: req.body.branchId,
                    }).count();
                    one = parseInt(one);
                    if (one - item.quantity < 0) {
                        count = 1;
                    }
                } else if (item.merchVarId) {
                    const one = await Variations.findById(item.merchVarId);
                    if (one.stock - item.quantity < 0) {
                        count = 1;
                    }
                } else if (item.menuId) {
                    const one = await Menu.findById(item.menuId);
                    if (one.in_stock == "false") {
                        count = 1;
                    }
                }
                else if (item.merchId) {
                    const one = await Merch.findById(item.merchId);
                    if (one.in_stock == "false") {
                        count = 1;
                    }
                }
            }
        } catch (err) {
            res.status(400).json({ message: err.message });
        }

        if (count === 1) {
            res.status(400).json({ message: "Unavailable stock" });
        } else if (count === 0) {
            let total_price = 0;
            for (const oneItem of items) {
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

            if (req.body.pay_with == "points") {
                const points = await Points.find({ userId: req.body.userId }).select("points");
                if (points == null) {
                    res.status(400).json({ message: "No points found" });
                } else {
                    let total_points = 0;
                    for (const one of points) {
                        total_points = total_points + one.points;
                    }
                    if (total_points < total_price * process.env.POINTS_USD) {
                        res.status(400).json({ message: "More points needed" });
                    }
                }
            }
            let mybinance_response = "";

            const nft_user = await Users.findById(req.body.userId);
            if (nft_user.type == "nft") {
                total_price = total_price * 0.8;
            }

            const order = new Orders({
                userId: req.body.userId,
                customized_userId: req.body.customized_userId,
                countryId: req.body.countryId,
                branchId: req.body.branchId,
                total_price: total_price,
                pay_with: req.body.pay_with,
            });
            try {
                const newOrder = await order.save();
                items.forEach(async function (item) {
                    const cartItem = new OrderItem({
                        orderId: newOrder._id,
                        merchId: item.merchId,
                        merchVarId: item.merchVarId,
                        menuId: item.menuId,
                        menuVarId: item.menuVarId,
                        wifi: item.wifi,
                        total_price: item.total_price,
                        quantity: item.quantity,
                        milk: item.milk,
                        ice: item.ice,
                        addOns: item.addOns,
                        request: item.request,
                    });
                    try {
                        cartItem.save();
                    } catch (err) {
                        res.status(400).json({ message: err.message });
                    }

                    if (item.merchVarId) {
                        const one = await Variations.findById(item.merchVarId);
                        one.stock = one.stock - item.quantity;
                        const updatedStock = await one.save();
                    }

                    if (item.wifi) {
                        const codes = await Wifi.find({
                            available: "yes",
                            branch: req.body.branchId,
                        }).limit(item.quantity);

                        for (const code of codes) {
                            code.available = "no";
                            code.userId = req.body.userId;
                            code.date_sold = new Date();
                            await code.save();
                        }
                    }
                });

                if (req.body.pay_with == "binance") {
                    await dispatch_request("POST", "/binancepay/openapi/order", {
                        merchantId: newOrder.customized_userId,
                        merchantTradeNo: newOrder._id,
                        tradeType: "APP",
                        totalFee: total_price,
                        currency: "USDT",
                        productType: "products",
                        productName: "B.Hive",
                        productDetail: "order products",
                    })
                        .then((response) => {
                            mybinance_response = response.data;
                        })
                        .catch((error) => console.log(error));
                } else if (req.body.pay_with == "points" && req.body.countryId != "6332a4cdfe9b8e512af37e15") {
                    try {
                        let pointsToRemove = parseInt(total_price * process.env.POINTS_USD);

                        do {
                            const orderPoints = await Points.find({
                                userId: req.body.userId,
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

                        const my_order = await Orders.findById(newOrder._id).populate("userId", [
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
                        my_order.status = "SUCCESS";
                        await my_order.save();

                        const userCountry = await Users.findById(req.body.userId)
                        await Cart.find({ userId: req.body.userId, country: userCountry.country }).remove();

                        try {
                            const tokens = await NotificationTokens.find({ user_id: my_order.userId }).select('token_device');
                            if (tokens.length === 0) {
                                console.log("No tokens found for this user.");
                            }
                            else{
                                const content = {
                                    title: "B.Hive Orders",
                                    body: "Your order is placed successfully. Thank you!",
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

                        try {
                            const manager = await Manager.find({ branch: req.body.branchId });
                            const tokens = [manager[0].notification_managerId];
                        
                            const content = {
                                title: "New Order",
                                body: "New order placed.",
                                type: "order",  
                                object: "", 
                                screen: "order-screen"
                            };
                        
                            // Send notifications using the Firebase new
                            await sendNotification(tokens, content);
                        
                            } catch (err) {
                            console.error('Error sending notification:', err);
                            res.status(500).json({ message: err.message });
                            }

                        //place order send email success
                        // const order_temp = `<b>Congratulations!</b><br/><br/>Your order ${my_order._id} has been placed successfully for ${my_order.total_price}$`;
                        // try {
                        //   // send email
                        //   var send_email = {
                        //     url: `https://backend.thebhive.io/api/mobile_send_email?subject=Place%20Order&to=${my_order.userId.email}&template=${order_temp}`,
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
                }

                const current_order = await Orders.findById(newOrder._id);
                result.push(current_order);
                const points = await Points.find({ userId: req.body.userId }).select("points");
                let total_points = 0;
                for (const one of points) {
                    total_points = total_points + parseInt(one.points);
                }
                result.push(total_points);
                result.push(mybinance_response);
                res.status(201).send(result);
            } catch (err) {
                res.status(400).json({ message: err.message });
            }
        }
    }
});

//get user order but paginated
router.get("/paginatedorders/user/:id", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extract token from Authorization header
    if (token == null) return res.sendStatus(401); // If no token, return 401 Unauthorized

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
        if (err) {
            return res.sendStatus(403); // If token is invalid, return 403 Forbidden
        }

        // Check if the userId in the token matches the one in the request params
        if (authData.userId !== req.params.id) {
            return res.status(400).json({ message: "Token does not match the user" });
        }

        const limit = 3; // Set the limit of results per page
        const page = parseInt(req.query.page) || 1; // Get the page from query or default to 1

        try {
            // Fetch the user's orders with pagination
            const orders = await Orders.find({
                userId: req.params.id,
                status: { $in: ["SUCCESS", "pending"] }
            })
                .sort({ created_date: -1 }) // Sort by most recent orders
                .skip((page - 1) * limit) // Skip based on current page
                .limit(limit); // Limit the number of results to 3 per request

            // If no orders are found
            if (!orders || orders.length === 0) {
                return res.status(400).json({ message: "No more orders for this user" });
            }

            // Count the total number of orders
            const totalOrders = await Orders.countDocuments({
                userId: req.params.id,
                status: { $in: ["SUCCESS", "pending"] }
            });

            // Respond with orders, current page, and total pages
            res.status(200).json({
                orders,
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit), // Calculate total pages based on count
            });
        } catch (err) {
            // Handle any server error
            return res.status(500).json({ message: err.message });
        }
    });
});

//Get order details
router.get("/:id", getOrderDetails, async (req, res) => {
    try {
        res.send(res.order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Update
router.patch("/clover/:id", async (req, res) => {
    if (req.body.key == "dHe%l491#0GT") {
        const order = await Orders.findById(req.params.id).populate("userId", [
            "country",
            "notification_userId"
          ]);

          try {
            order.status = "SUCCESS";
            const updatedOrder = await order.save();
            await Cart.find({ userId: order.userId._id, country: order.userId.country }).remove();

            try {
                const tokens = await NotificationTokens.find({ user_id: order.userId }).select('token_device');
                if (tokens.length === 0) {
                    console.log("No tokens found for this user.");
                }
                else{
                    const content = {
                        title: "B.Hive Orders",
                        body: "Order submitted for approval",
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
                console.error('Error sending notification to user:', err);
                //res.status(500).json({ message: err.message });
                }

            try {
                const manager = await Manager.find({ branch: order.branchId });
                const tokens = [manager[0].notification_managerId];
            
                const content = {
                    title: "New Order",
                    body: "New order placed.",
                    type: "order",  
                    object: "", 
                    screen: "order-screen"
                };
            
                // Send notifications using the Firebase new
                await sendNotification(tokens, content);
        
                } catch (err) {
                console.error('Error sending notification to manager:', err);
                //res.status(500).json({ message: err.message });
                }
            
            res.json(updatedOrder);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else {
        res.json({ message: "Unauthorised call!" });
    }
});

router.patch("/test-:id",getOrderDetails, async (req, res) => {
    
          if (req.body.notification_userId != null) {
            res.order[0].userId.notification_userId = req.body.notification_userId;
          }
          try {
            const updated = await res.order[0].save();
            res.json(updated);
          } catch (err) {
            res.status(400).json({ message: err.message });
          }
        
    
  });

//Clear all orders
// router.delete("/", async (req, res) => {
//   try {
//     let orders = await Orders.find();
//     for (const one of orders) {
//       const items = await OrderItem.find({
//         orderId: one._id,
//       }).remove();
//       await one.remove();
//     }
//     res.json({ message: "Orders Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//delete order
router.delete("/:id", getOrder, async (req, res) => {
    try {
        console.log(res.order)
            const items = await OrderItem.find({
                orderId: res.order._id,
            }).remove();
            await res.order.remove();
        
        res.json({ message: "Order Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

async function getOrderDetails(req, res, next) {
    let order = [];
    try {
        const info = await Orders.findById(req.params.id).populate("userId", [
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
            "cloverId"
        ]);
        if (info == null) {
            return res.status(400).json({ message: "Order not found" });
        } else {
            const items = await OrderItem.find({
                orderId: req.params.id,
            }).populate("merchId merchVarId menuId menuVarId milk addOns");

            order.push(info);
            order.push(items);
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.order = order;
    next();
}

async function getOrder(req, res, next) {
    let order;
    try {
        order = await Orders.findById(req.params.id);
        if (order == null) {
            return res.status(400).json({ message: "Order not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.order = order;
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

async function getUserOrders(req, res, next) {
    let orders;
    try {
        orders = await Orders.find({
            userId: req.params.id,
            status: { $in: ["SUCCESS", "pending"] }
        })
            .sort({
                created_date: -1,
            })
            .limit(10)
            .populate("countryId branchId");
        if (orders == null) {
            return res.status(400).json({ message: "No orders for this user" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.orders = orders;
    next();
}

function hash_signature(query_string) {
    return crypto.createHmac("sha512", apiSecret).update(query_string).digest("hex");
}

function random_string() {
    return crypto.randomBytes(32).toString("hex").substring(0, 32);
}

function dispatch_request(http_method, path, payload = {}) {
    const timestamp = Date.now();
    const nonce = random_string();
    const payload_to_sign = timestamp + "\n" + nonce + "\n" + JSON.stringify(payload) + "\n";
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

module.exports = router;
