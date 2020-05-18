const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const blogModel = require("../models/blog");
const fileUpload = require("../middleware/file-upload");
const createError = require("http-errors");
const { check } = require("express-validator");
const validateRequest = require("../middleware/validateRequest");
const excerpts = require("excerpts");
var cloudinary = require("cloudinary").v2;

//Create new blog
router.post(
  "/",
  auth,
  fileUpload.single("image"),
  validateRequest([
    check("title").exists().trim().isLength({ min: 3, max: 160 }),
    check("body").trim().exists().isLength({ min: 200, max: 2000000 }),
    check("tags").not().isEmpty().withMessage("At least one tag is required"),
  ]),
  async (req, res, next) => {
    if (!req.file) throw createError(422, "Blog Image is required");
    const path = req.file.path.replace("public\\", "");
    const image = await cloudinary.uploader.upload(path, {
      tags: "express_sample",
    });
    req.body.image = image.secure_url;
    req.body.excerpt = excerpts(req.body.body, { words: 40 });
    req.body.tags = req.body.tags.split(",");
    const blog = new blogModel({ ...req.body, postedBy: req.user._id });
    await blog.save();
    res
      .status(201)
      .send({ message: "Blog was created successfully", blogId: blog._id });
  }
);

router.get("/search", async (req, res, next) => {
  const { search } = req.query;
  if (search) {
    const blogs = await blogModel
      .find({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
        ],
      })
      .select("-image -body");

    if (!blogs) {
      return next(createError(400, "0 blogs was found."));
    }

    res.send(blogs);
  }
});

//get single blog by Id
router.get("/:id", async (req, res, next) => {
  const blog = await blogModel
    .findById(req.params.id)
    .populate({
      path: "postedBy",
      select: "username",
    })
    .populate("tags", "_id name")
    .select("_id title image body tags postedBy createdAt updatedAt")
    .exec((err, blog) => {
      if (err) {
        return next(createError(404, "There is no blog with such id"));
      }
      res.send(blog);
    });
});

//Delete a blog with specific id
router.delete("/:id", auth, async (req, res, next) => {
  const blog = await blogModel.findOneAndDelete({
    _id: req.params.id,
    postedBy: req.user._id,
  });
  if (!blog) throw createError(404, "No blog with such id");
  res.send({ message: "Blog was deleted successfully" });
});

//Edit blog with specific Id
router.put(
  "/:id",
  auth,
  fileUpload.single("image"),
  validateRequest([
    check("title").exists().trim().isLength({ min: 3, max: 160 }),
    check("body").trim().exists().isLength({ min: 200, max: 2000000 }),
    check("tags").not().isEmpty().withMessage("At least one tag is required"),
  ]),
  async (req, res, next) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["title", "body", "image", "tags"];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );
    if (!isValidOperation)
      return next(createError(400, "Invalid updates fields"));
    if (!req.file) throw createError(422, "Blog Image is required");
    const path = req.file.path.replace("public\\", "");
    const image = await cloudinary.uploader.upload(path, {
      tags: "express_sample",
    });
    req.body.image = image.secure_url;
    req.body.excerpt = excerpts(req.body.body, { words: 40 });
    req.body.tags = req.body.tags.split(",");

    const updatedBlog = await blogModel.findOneAndUpdate(
      {
        _id: req.params.id,
        postedBy: req.user._id,
      },
      req.body
    );
    if (!updatedBlog) throw createError(400, "There is no blog with such id");

    res.send({ message: "Blog was updated successfully" });
  }
);

module.exports = router;
