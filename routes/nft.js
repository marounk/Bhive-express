const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const md5 = require("md5");

const NftQuestions = require("../models/nftQuestions");
const NftAnswers = require("../models/nftAnswers");
const NftBenefits = require("../models/nftBenefits");
const Users = require("../models/users");
const Points = require("../models/points");
const nftQuestions = require("../models/nftQuestions");
const nftAnswers = require("../models/nftAnswers");

const apiKey =
  "rwzzqd5vfu0dhnutywrj0oocubbasdsxdqxnvxossjesw1b0nj1gswrk4oxbwyzc"; // set your API key here
const apiSecret =
  "ubc7ztfkcc9nushbra4oaopgr7tecocmr3wp8fik7q9kgclk7wmja18qpmhowtrp"; // set your secret key here
const baseURL = "https://bpay.binanceapi.com";

//Get nft page data
router.post("/", getQuestions, async (req, res) => {
  let data = [];
  let questions = [];
  try {
    for (const one of res.questions) {
      let one_question = [];
      const answers = await NftAnswers.find({ questionId: one._id }).populate(
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
      one_question.push(one);
      one_question.push(answers);
      questions.push(one_question);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
  const nftUsers = await Users.find({ type: "nft" });
  data.push(nftUsers);
  data.push(questions);
  res.status(201).json(data);
});

//Register NFT user
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
        name: req.body.name,
        email: lower_email,
        password: pass,
        notification_userId: req.body.notification_userId,
        work: req.body.work,
        text: req.body.text,
        wallet_address: req.body.wallet_address,
        type: "nft",
        active: 1,
      });
      try {
        const newUser = await user.save();
        res.json(newUser);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

//Add new Question
router.post("/addQuestion", async (req, res) => {
  const nftQuestions = new NftQuestions({
    userId: req.body.userId,
    question: req.body.question,
  });
  try {
    const newNftQuestions = await nftQuestions.save();
    
    //send notification
    const nftUsers = await Users.find({ type: "nft" });
    for (const one of nftUsers) {
      if(one._id != req.body.userId){
        try{
          var data = JSON.stringify({
            users_id: [one.notification_userId],
            title: "New NFT Question",
            content: "Hello, take a look on the new question added!",
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
        }
        catch(err){}
      } else {}
    }

    res.status(201).json(newNftQuestions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//Answer on a Question
router.post("/addAnswer", async (req, res) => {
  const nftAnswers = new NftAnswers({
    questionId: req.body.questionId,
    userId: req.body.userId,
    answer: req.body.answer,
  });
  try {
    const newNftAnswers = await nftAnswers.save();

    //send notification
    const nftUsers = await Users.find({ type: "nft" });
    for (const one of nftUsers) {
      if(one._id != req.body.userId){
        try{
          var data = JSON.stringify({
            users_id: [one.notification_userId],
            title: "New NFT Answer",
            content: "Hello, take a look on the new answer added!",
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
        }
        catch(err){}
      } else {}
    }

    res.status(201).json(newNftAnswers);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//View nft questions from admin
router.post("/questions", getQuestions, async (req, res) => {
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
        let questions = [];
        try {
          for (const one of res.questions) {
            let one_question = [];
            const answers = await NftAnswers.find({
              questionId: one._id,
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
            one_question.push(one);
            one_question.push(answers);
            questions.push(one_question);
          }
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
        res.status(201).json(questions);
      }
    }
  });
});

//delete an nft question with answers
router.delete("/question-:id", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      await nftQuestions.findById(req.params.id).remove();
      await nftAnswers.find({ questionId: req.params.id }).remove();
      res.json({ message: "Question Deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//delete an nft answers
router.delete("/answer-:id", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    try {
      await nftAnswers.findById(req.params.id).remove();
      res.json({ message: "Answer Deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
});

//clear nft questions
router.delete("/clear", async (req, res) => {
  try {
    await NftQuestions.find().remove();
    await NftAnswers.find().remove();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get nft benefits
router.get("/benefits", async (req, res) => {
  try {
    const nftBenefits = await NftBenefits.find();
    res.status(201).json(nftBenefits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Add nft benefit
router.post("/benefits", authenticateToken, async (req, res) => {
  if (res.authData.adminId !== req.body.adminId) {
    res.status(400).json({ message: "token error" });
  } else {
    const nftBenefits = new NftBenefits({
      country: req.body.countryId,
      description: req.body.description,
    });
    try {
      const newNftBenefits = await nftBenefits.save();
      res.status(201).json(newNftBenefits);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update nft benefit
router.patch("/benefits", getBenefit, async (req, res) => {
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
        if (req.body.description != null) {
          res.benefit.description = req.body.description;
        }
        try {
          const updatedBenefit = await res.benefit.save();
          res.json(updatedBenefit);
        } catch (err) {
          res.status(400).json({ message: err.message });
        }
      }
    }
  });
});

//delete an nft benefit
router.delete("/benefits", getBenefit, async (req, res) => {
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
          await res.benefit.remove();
          res.json({ message: "Benefit Deleted" });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      }
    }
  });
});

//Check wallet address exist
router.post("/exist", async (req, res) => {
  try {
    const nftUser = await Users.find({
      type: "nft",
      wallet_address: req.body.wallet_address,
    });
    if (nftUser[0] == null) {
      return res.status(400).json({ message: "wallet not found" });
    } else {
      nftUser[0].notification_userId = req.body.notification_userId;
      nftUser[0].save();

      const user = { userId: nftUser[0]._id };
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      nftUser[0].login_token = accessToken;

      let result = [];
      result.push(nftUser[0]);
      const points = await Points.find({ userId: nftUser[0]._id }).select(
        "points"
      );
      let total_points = 0;
      for (const one of points) {
        total_points = total_points + one.points;
      }
      result.push(total_points);
      res.status(201).send(result);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getBenefit(req, res, next) {
  let benefit;
  try {
    benefit = await NftBenefits.findById(req.body.benefitId);
    if (benefit == null) {
      return res.status(400).json({ message: "benefit not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.benefit = benefit;
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

async function getQuestions(req, res, next) {
  let questions;
  try {
    questions = await NftQuestions.find().populate("userId", [
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
    if (questions == null) {
      return res
        .status(400)
        .json({ message: "No questions available" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.questions = questions;
  next();
}

module.exports = router;
