const express = require("express");
const tagModel = require("../models/tag");
const blogModel = require("../models/blog");
const { check } = require("express-validator");
const validateRequest = require("../middleware/validateRequest");
const createError = require("http-errors");

const router = express.Router();

router.post(
  "/",
  validateRequest([
    check("name").not().isEmpty().isLength({ min: 2, max: 32 }),
  ]),
  async (req, res, next) => {
    const tag = new tagModel(req.body);
    await tag.save();
    res.status(201).send({ message: "Tag was created successfully" });
  }
);

router.get("/", async (req, res, next) => {
  const tags = await tagModel.find({});
  res.send(tags);
});

router.get("/:name", async (req, res, next) => {
  const tag = await tagModel.findOne({ name: req.params.name.toLowerCase() });
  const blogs = await blogModel
    .find({ tags: tag })
    .populate("tags", "_id name")
    .populate("postedBy", "_id username")
    .select("_id title image excerpt tags postedBy createdAt updatedAt")
    .exec();

  if (!blogs.length) {
    return next(createError(404, "There is no blogs with such tag"));
  }
  res.send({ blogs, tag });
});

module.exports = router;
