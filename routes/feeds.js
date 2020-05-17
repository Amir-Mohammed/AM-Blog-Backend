var express = require("express");
var router = express.Router();
const blogModel = require("../models/blog");
const tagModel = require("../models/tag");
const auth = require("../middleware/auth");

//get feeds
router.get("/", async (req, res) => {
  const count = await blogModel.countDocuments();
  const tags = await tagModel.find({});
  const blogs = await blogModel
    .find({})
    .sort({ createdAt: -1 })
    .skip(+req.query.skip || 0)
    .limit(+req.query.limit || 3)
    .populate({
      path: "postedBy",
      select: "username",
    })
    .populate("tags", "_id name")
    .select("_id title image excerpt tags postedBy createdAt updatedAt")
    .exec();
  res.send({ blogs, count, tags });
});

//get feeds of specific user
router.get("/me", auth, async (req, res) => {
  const count = await blogModel.countDocuments({
    postedBy: { $in: req.user.following },
  });
  const tags = await tagModel.find({});

  const blogs = await blogModel
    .find({ postedBy: { $in: req.user.following } })
    .sort({ createdAt: -1 })
    .skip(+req.query.skip || 0)
    .limit(+req.query.limit || 3)
    .populate({
      path: "postedBy",
      select: "username",
    })
    .populate("tags", "_id name")
    .select("_id title image excerpt tags postedBy createdAt updatedAt")
    .exec();
  res.send({ blogs, count, tags });
});

module.exports = router;
