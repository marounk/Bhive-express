const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const request = require("request");
const https = require("https");
var axios = require("axios");

const Events = require("../models/events");
const EventGallery = require("../models/eventGallery");
const EventBooking = require("../models/eventBooking");
const Users = require("../models/users");
const Manager = require("../models/manager");

const { sendNotification } = require('../utils/firebase');

//Get all
router.get("/", async (req, res) => {
  try {
    const all_events = await Events.find().sort({
      exp_date: -1,
    });
    res.json(all_events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all in a branch
router.get("/branch/:id", getEventsByBranch, async (req, res) => {
  let items = [];
  try {
    for (const one of res.events) {
      let one_item = [];
      vars = await EventGallery.find({ eventId: one._id });
      one_item.push(one);
      one_item.push(vars);
      items.push(one_item);
    }
    res.send(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get event details + if user already booked
router.post("/checkBooking", async (req, res) => {
  try {
    let result = [];
    let item = [];
    let userBooking;
    const event = await Events.findById(req.body.event_id);
    const gallery = await EventGallery.find({ eventId: req.body.event_id });
    item.push(event);
    item.push(gallery);
    result.push(item);

    if (req.body.user_id !== 0) {
      userBooking = await EventBooking.find({
        user_id: req.body.user_id,
        event_id: req.body.event_id,
      });
      result.push(userBooking);
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new event
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const event = new Events({
      branch: req.body.branch,
      image: req.body.image,
      title: req.body.title,
      description: req.body.description,
      exp_date: req.body.exp_date,
      total_seats: req.body.total_seats,
    });
    try {
      const newevent = await event.save();

        try {
          const tokens = [req.body.userId.notification_userId];
      
          const content = {
            title: "B.Hive Events",
            body: "Hey! Check our new event",
            type: "event",  
            object: "", 
            screen: "event-screen"
          };
      
          // Send notifications using the Firebase new
          await sendNotification(tokens, content);
      
          //res.status(201).json("Notification sent");
        } catch (err) {
          console.error('Error sending notification:', err);
          res.status(500).json({ message: err.message });
        }

      res.status(201).json(newevent);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

//Add event gallery
router.post("/gallery", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    for (const one of req.body.images) {
      const gallery = new EventGallery({
        eventId: req.body.eventId,
        image: one,
      });
      try {
        const newgallery = await gallery.save();
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
    const allGallery = await EventGallery.find({ eventId: req.body.eventId });
    res.status(201).json(allGallery);
  }
});

//Book
router.post("/book", authenticateToken, async (req, res) => {
  if (res.authData.userId !== req.body.user_id) {
    res.status(400).json({ message: "token error" });
  } else {
    const userBooking = await EventBooking.find({
      user_id: req.body.user_id,
      event_id: req.body.event_id,
    });

    if (userBooking[0] == null) {
      const seats = await Events.find({ _id: req.body.event_id });
      const available_seats = seats[0].total_seats > seats[0].booked_seats;
      if (available_seats) {
        const book = new EventBooking({
          user_id: req.body.user_id,
          event_id: req.body.event_id,
        });
        try {
          const newbook = await book.save();
          const event = await Events.find({ _id: req.body.event_id });
          event[0].booked_seats = event[0].booked_seats + 1;
          event[0].save();

            try {
              const tokens = [req.body.userId.notification_userId];
          
              const content = {
                title: "B.Hive Events",
                body: "Your place is now reserved. See you soon!",
                type: "event",  
                object: "", 
                screen: "event-screen"
              };
          
              // Send notifications using the Firebase new
              await sendNotification(tokens, content);
          
              //res.status(201).json("Notification sent");
            } catch (err) {
              console.error('Error sending notification:', err);
              res.status(500).json({ message: err.message });
            }

            try {
              const tokens = [req.body.userId.notification_userId];
          
              const content = {
                title: "New Events Booking",
                body: "A seat has been booked in your event.",
                type: "event",  
                object: "", 
                screen: "event-screen"
              };
          
              // Send notifications using the Firebase new
              await sendNotification(tokens, content);
          
              //res.status(201).json("Notification sent");
            } catch (err) {
              console.error('Error sending notification:', err);
              res.status(500).json({ message: err.message });
            }

          res.status(201).json(newbook);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      } else {
        return res.status(400).json({ message: "No more available seats" });
      }
    } else {
      return res.status(400).json({ message: "User already booked" });
    }
  }
});

//Get all booking for an event
router.post("/booked/:id", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
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

// Update event
router.patch("/:id", getEvent, async (req, res) => {
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
        if (req.body.image != null) {
          res.event.image = req.body.image;
        }
        if (req.body.title != null) {
          res.event.title = req.body.title;
        }
        if (req.body.description != null) {
          res.event.description = req.body.description;
        }
        if (req.body.exp_date != null) {
          res.event.exp_date = req.body.exp_date;
        }
        if (req.body.total_seats != null) {
          res.event.total_seats = req.body.total_seats;
        }

        try {
          const updatedevent = await res.event.save();
          res.json(updatedevent);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//clear events
// router.delete("/", async (req, res) => {
//   try {
//     await Events.find().remove();
//     await EventGallery.find().remove();
//     res.json({ message: "Events + Images deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//clear all booking
// router.delete("/clear-book", async (req, res) => {
//   try {
//     await EventBooking.find().remove();
//     res.json({ message: "Booking Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

//delete a gallery image
router.delete("/gallery/:id", async (req, res) => {
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
          await EventGallery.findById(req.params.id).remove();
          res.json({ message: "Image deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//delete an event
router.delete("/:id", getEvent, async (req, res) => {
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
          await res.event.remove();
          res.json({ message: "event Deleted" });
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

async function getEvent(req, res, next) {
  let event;
  try {
    event = await Events.findById(req.params.id);
    if (event == null) {
      return res.status(400).json({ message: "event not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.event = event;
  next();
}

async function getEventsByBranch(req, res, next) {
  let events;
  try {
    events = await Events.find({ branch: req.params.id }).sort({
      exp_date: -1,
    });
    if (events == null) {
      return res
        .status(400)
        .json({ message: "No events available in this branch" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.events = events;
  next();
}

module.exports = router;
