const express = require("express");
const router = express.Router();

const Str = require("@supercharge/strings");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const request = require("request");

const Users = require("../models/users");
const Tokens = require("../models/emailVerification");
const ResetTokens = require("../models/resetPassword");
const Orders = require("../models/orders");
const OrderItems = require("../models/orderItems");
const BookedSpaces = require("../models/book");
const BookedEvents = require("../models/eventBooking");
const Points = require("../models/points");
const EmailTemp = require("../email_template");
const points = require("../models/points");

//clone loyalty points
// router.get("/clone", async (req, res) => {
//   try {
//     const users = await Users.find();
//     for (const user of users) {
//       const points = await Points.find({ userId: user._id });
//       let total_points = 0;
//       for (const one of points) {
//         total_points = total_points + one.points;
//       }
//       user.loyalty_points = parseInt(total_points)
//       await user.save();
//     }

//     res.json("ok");
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//Get user by id
router.get("/:id", async (req, res) => {
    try {
        const user = await Users.findById(req.params.id).select(["profile","name","email","active","created_date","customized_userId","level","type","notification_userId","loyalty_points","country","cloverId","cardDigits"]);
        res.send(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Get all
router.post("/", async (req, res) => {
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
                    const all_users = await Users.find().select(["profile","name","email","active","created_date","customized_userId","level","type","notification_userId","loyalty_points","country","cloverId","cardDigits"]);
                    res.json(all_users);
                } catch (err) {
                    res.status(500).json({ message: err.message });
                }
            }
        }
    });
});

//Register new user
router.post("/register", async (req, res) => {
    const lower_email = req.body.email.toLowerCase();
    let find;
    try {
        find = await Users.findOne({ email: lower_email });
        if (find != null) {
            return res.status(400).json({ message: "Email already exist" });
        } else {
            const pass = md5(req.body.password);
            const user = new Users({
                country: req.body.country,
                profile: req.body.profile,
                name: req.body.name,
                email: lower_email,
                password: pass,
                notification_userId: req.body.notification_userId,
            });
            try {
                const newUser = await user.save();
            } catch (err) {
                res.status(400).json({ message: err.message });
            }

            const generateToken = Str.random(15);
            const token = new Tokens({
                email: lower_email,
                token: generateToken,
            });
            try {
                await token.save();
            } catch (err) {
                res.status(400).json({ message: err.message });
            }

            try {
                // send email
                const temp = `<b>Welcome to B.Hive,</b><br/><br/>To verify your email <a href='https://www.thebhive.io/verification/${lower_email}/${generateToken}'>Click here.</a>`;
                var send_email = {
                    url: `https://backend.thebhive.io/api/mobile_send_email?subject=Email%20Verification&to=${lower_email}&template=${temp}`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                };
                request(send_email, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        console.log("Message sent");
                    } else {
                        console.log(error);
                        console.log("Message NOT sent!");
                    }
                });
                res.json("Email Function");
            } catch (err) {
                res.status(400).json({ message: err.message });
            }
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

//Change password from profile
router.post("/change_password", authenticateToken, async (req, res) => {
    if (res.authData.userId !== req.body.userId) {
        res.status(400).json({ message: "token error" });
    } else {
        const password = md5(req.body.old_password);
        const user = await Users.findOne({
            _id: req.body.userId,
            password: password,
        });

        if (user == null) {
            return res.status(400).json({ message: "Wrong current Password" });
        } else {
            if (req.body.new_password !== null) {
                user.password = md5(req.body.new_password);
            }
            try {
                await user.save();
            } catch (err) {
                res.status(400).json({ message: err.message });
            }

            res.send("Password Changed!");
        }
    }
});

//Get verification
router.get("/verification", async (req, res) => {
    try {
        const all_tokens = await Tokens.find();
        res.json(all_tokens);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Email verification check
router.post("/verification/:email/:token", checkToken, async (req, res) => {
    try {
        res.user[0].active = "1";
        const updatedUser = await res.user[0].save();
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

//Get reset requests
router.get("/forgot", async (req, res) => {
    try {
        const all_tokens = await ResetTokens.find();
        res.json(all_tokens);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Forgot password request
router.post("/forgot/:email", async (req, res) => {
    const lower_email = req.params.email;
    const userId = await Users.find({ email: lower_email }).select("_id");

    if (userId == null) {
        return res.status(400).json({ message: "email not found" });
    } else {
        const generateToken = Str.random(15);
        const resetReq = new ResetTokens({
            userId: userId[0]._id,
            email: lower_email,
            token: generateToken,
        });
        try {
            await resetReq.save();
        } catch (err) {
            res.status(400).json({ message: err.message });
        }

        try {
            // send email
            const temp = `<b>Reset Password</b><br/><br/>There was a request to change your password!<br/>If you did not make this request then please ignore this email.<br/>Otherwise, please click this link to change your password: <a href='https://www.thebhive.io/checkForgotRequest/${req.params.email}/${generateToken}'>Reset my Password</a>`;
            var send_email = {
                url: `https://backend.thebhive.io/api/mobile_send_email?subject=Reset%20Password&to=${lower_email}&template=${temp}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            };
            request(send_email, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("Message sent");
                } else {
                    console.log(error);
                    console.log("Message NOT sent!");
                }
            });
            res.json("Email Function");
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
});

//Forgot password check token
router.post("/checkForgotRequest/:email/:token", checkForgotToken, async (req, res) => {
    try {
        res.token[0].status = "1";
        const updatedToken = await res.token[0].save();
        res.json(updatedToken);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

//Reset password
router.patch("/forgot/:id", getUsers, async (req, res) => {
    if (req.body.password != null) {
        res.user.password = md5(req.body.password);
    }
    try {
        const updatedUser = await res.user.save();
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

//delete
router.delete("/forgot/:id", getResetToken, async (req, res) => {
    try {
        await res.token.remove();
        res.json({ message: "Token Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//inactivate my account
router.patch("/deactivate-myaccount", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            if (authData.userId !== req.body.userId) {
                res.status(400).json({ message: "token error" });
            } else {
                try {
                    let result = "";
                    const user = await Users.findById(req.body.userId);
                    if (user.password === md5(req.body.password)) {
                        user.active = 0;
                        user.save();
                        result = "deactivated";
                    } else {
                        result = "wrong password";
                    }
                    res.json(result);
                } catch (err) {
                    res.status(400).json({ message: err.message });
                }
            }
        }
    });
});

//Update user type only webhook
router.patch("/change_type/user-:id", getUsers, async (req, res) => {
    if (req.body.key == "dHe%l491#0GT") {
        if (req.body.type != null) {
            res.user.type = req.body.type;
        }
        if (req.body.wallet_address != null) {
            res.user.wallet_address = req.body.wallet_address;
        }

        try {
            const updatedUser = await res.user.save();
            res.json(updatedUser);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else {
        res.json({ message: "Unauthorised call!" });
    }
});

//Update user notification id
router.patch("/change_notificationId/user-:id", getUsers, async (req, res) => {
    if (req.body.key == "dHe%l491#0GT") {
        if (req.body.notification_userId != null) {
            res.user.notification_userId = req.body.notification_userId;
        }

        try {
            const updatedUser = await res.user.save();
            res.json(updatedUser);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else {
        res.json({ message: "Unauthorised call!" });
    }
});

//update user cloverId
router.patch("/change_cloverId/user-:id", getUsers, async (req, res) => {
    if (req.body.key == "dHe%l491#0GT") {
        if (req.body.cloverId != null) {
            res.user.cloverId = req.body.cloverId;
        }

        try {
            const updatedUser = await res.user.save();
            res.json(updatedUser);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else {
        res.json({ message: "Unauthorised call!" });
    }
});

//Update user cardDigits
router.patch("/change_cardDigits/user-:id", getUsers, async (req, res) => {
    if (req.body.key == "dHe%l491#0GT") {
        if (req.body.cardDigits != null) {
            res.user.cardDigits = req.body.cardDigits;
        }

        try {
            const updatedUser = await res.user.save();
            res.json(updatedUser);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else {
        res.json({ message: "Unauthorised call!" });
    }
});

//Update user
router.patch("/:id", getUsers, async (req, res) => {
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
                if (req.body.country != null) {
                    res.user.country = req.body.country;
                }
                if (req.body.profile != null) {
                    res.user.profile = req.body.profile;
                }
                if (req.body.name != null) {
                    res.user.name = req.body.name;
                }
                if (req.body.work != null) {
                    res.user.work = req.body.work;
                }
                if (req.body.text != null) {
                    res.user.text = req.body.text;
                }
                try {
                    const updatedUser = await res.user.save();
                    res.json(updatedUser);
                } catch (err) {
                    res.status(400).json({ message: err.message });
                }
            }
        }
    });
});

//delete user
router.delete("/:id", getUsers, async (req, res) => {
    try {
        await BookedSpaces.find({ user_id: req.params.id }).remove();
        await BookedEvents.find({ user_id: req.params.id }).remove();
        await Points.find({ userId: req.params.id }).remove();
        const orders = await Orders.find({ userId: req.params.id });
        for (const one of orders) {
            const items = await OrderItems.find({
                orderId: one._id,
            }).remove();
            await one.remove();
        }
        await res.user.remove();
        res.json({ message: "User Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

async function getUsers(req, res, next) {
    let user;
    try {
        user = await Users.findById(req.params.id).select(["profile","name","email","active","created_date","customized_userId","level","type","notification_userId","loyalty_points","country","cloverId","cardDigits"]);
        if (user == null) {
            return res.status(400).json({ message: "User not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.user = user;
    next();
}

async function checkToken(req, res, next) {
    let token;
    let user;
    try {
        token = await Tokens.find({
            email: req.params.email,
            token: req.params.token,
            status: "0",
        });
        if (token == null) {
            return res.status(400).json({ message: "Unmatched Email/User" });
        }
        user = await Users.find({ email: req.params.email });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.user = user;
    next();
}

async function getResetToken(req, res, next) {
    let token;
    try {
        token = await ResetTokens.findById(req.params.id);
        if (token == null) {
            return res.status(400).json({ message: "Token not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.token = token;
    next();
}

async function checkForgotToken(req, res, next) {
    let token;
    try {
        token = await ResetTokens.find({
            email: req.params.email,
            token: req.params.token,
            status: "0",
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

        if (token == null) {
            return res.status(400).json({ message: "Unmatched User/Token" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.token = token;
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
