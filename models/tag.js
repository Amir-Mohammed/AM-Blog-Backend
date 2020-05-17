const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
  },
  { timestamps: true }
);

const tagModel = mongoose.model("Tag", schema);

module.exports = tagModel;
