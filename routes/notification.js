const express = require("express");
const router = express.Router();
const OneSignal = require("onesignal-node");

const { sendNotification } = require('../utils/firebase');

const Users = require("../models/users")

// With default options
const client = new OneSignal.Client(
  "b75dac47-bd1a-4c3f-87e0-e4fad026e768",
  "YzBjMTY0YzAtZWUzYy00MTQ4LThjMDYtNTA5YzQxODcyNGRi"
);
// const userClient = new OneSignal.UserClient(
//   "OTMxMzMxMWUtNWE0MS00ZmVjLWI0MmYtNWI0ODM2YjFiNzQ1"
// );

//token
const app_key_provider = {
  getToken() {
    return "YzBjMTY0YzAtZWUzYy00MTQ4LThjMDYtNTA5YzQxODcyNGRi";
  },
};

//client configuration
async function client_configuration() {
  const configuration = OneSignal.createConfiguration({
    authMethods: {
      app_key: {
        tokenProvider: app_key_provider,
      },
    },
  });
  const client = new OneSignal.DefaultApi(configuration);
}

//create notification
async function create_notification() {
  const notification = new OneSignal.Notification();
  notification.app_id = ONESIGNAL_APP_ID;
  notification.included_segments = ["Subscribed Users"];
  notification.contents = {
    en: "Hello OneSignal!",
  };
  const { id } = await client.createNotification(notification);
  res.json(id);
}

//view notification
async function view_notification() {
  const response = await client.getNotification(ONESIGNAL_APP_ID, id);
}

router.get("/", client_configuration, async (req, res) => {
  try {
    res.send(res.client_configuration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//send custom notification
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    return res.status(400).json({ message: "Token error" });
  }

  try {
    const users = await Users.find({ country: req.body.country });
    const tokens = users.map(user => user.notification_userId);

    const content = {
      title: req.body.title,
      body: req.body.content,
      type: req.body.type,
      object: req.body.object,
      screen: req.body.screen
    };

    await sendNotification(tokens, content);

    //res.status(201).json("Notification sent");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

module.exports = router;
