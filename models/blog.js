const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const createError = require("http-errors");

const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 160,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 200,
      maxlength: 2000000,
    },
    excerpt: {
      type: String,
      required: true,
    },
    image: { type: String, required: true },
    tags: [{ type: mongoose.Schema.ObjectId, ref: "Tag", required: true }],
    postedBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

schema.plugin(uniqueValidator, {
  type: createError(422, "{path} is already taken"),
});

const blogModel = mongoose.model("Blog", schema);

module.exports = blogModel;
