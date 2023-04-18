const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Announcement = require("../models/announcement");
const Spaces = require("../models/spaces")
const Events = require("../models/events")

//Get all
router.get("/", async (req, res) => {
  try {
    const all_announcements = await Announcement.find();
    res.json(all_announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all in a branch
router.get("/branch/:id", getAnnouncementByBranch, async (req, res) => {
  try {
    res.send(res.announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get all spaces and events in a branch for announcements dropdown link
router.get("/dropdown/branch-:id", async (req, res) => {
  let data = [];
  try {
    const spaces = await Spaces.find({ branch: req.params.id });
    if (spaces != null) {
      data.push({ spaces: spaces});
    }
    const events = await Events.find({ branch: req.params.id });
    if (events != null) {
      data.push({ events: events});
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add new
router.post("/", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const announcement = new Announcement({
      branch: req.body.branch,
      image: req.body.image,
      link: req.body.link,
      link_type: req.body.link_type,
      internal_link: req.body.internal_link,
      internal_type: req.body.internal_type,
    });
    try {
      const newAnnouncement = await announcement.save();
      res.status(201).json(newAnnouncement);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update announcement
router.patch("/:id", getAnnouncements, async (req, res) => {
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
          res.announcement.image = req.body.image;
        }
        if (req.body.link != null) {
          res.announcement.link = req.body.link;
        }
        if (req.body.link_type != null) {
          res.announcement.link_type = req.body.link_type;
        }
        if (req.body.internal_link != null) {
          res.announcement.internal_link = req.body.internal_link;
        }
        if (req.body.internal_type != null) {
          res.announcement.internal_type = req.body.internal_type;
        }

        try {
          const updatedAnnouncement = await res.announcement.save();
          res.json(updatedAnnouncement);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete an announcement
router.delete("/:id", getAnnouncements, async (req, res) => {
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
          await res.announcement.remove();
          res.json({ message: "Announcement Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

async function getAnnouncements(req, res, next) {
  let announcement;
  try {
    announcement = await Announcement.findById(req.params.id);
    if (announcement == null) {
      return res.status(400).json({ message: "Announcement not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.announcement = announcement;
  next();
}

async function getAnnouncementByBranch(req, res, next) {
  let announcement;
  try {
    announcement = await Announcement.find({ branch: req.params.id });
    if (announcement == null) {
      return res
        .status(400)
        .json({ message: "No announcements available in this branch" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.announcement = announcement;
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
