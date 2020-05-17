const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { saltRounds, jwtSecret } = require("../config");
const uniqueValidator = require("mongoose-unique-validator");
const createError = require("http-errors");
const blogModel = require("../models/blog");

const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      email: true,
    },
    password: { type: String, required: true },
    image: { type: String, required: true },
    about: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 100,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
    following: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.tokens;
      },
    },
  }
);

schema.plugin(uniqueValidator, { message: "already in use" });

schema.virtual("blogs", {
  ref: "Blog",
  localField: "_id",
  foreignField: "postedBy",
});

//Generate Tokens
schema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, jwtSecret, {
    expiresIn: "1h",
  });
  user.tokens.push({ token });
  await user.save();
  return token;
};

//checking credentials of a user
schema.statics.findByCredentials = async (email, password) => {
  const user = await userModel.findOne({ email });
  if (!user) throw createError(401, "invalid credentials");

  const isMatched = await bcrypt.compare(password, user.password);
  if (!isMatched) throw createError(401, "invalid credentials");

  return user;
};

//hash password before saving
schema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, +saltRounds);
  }

  next();
});

//Delete user Blogs when user is deleted
schema.pre("remove", async function (next) {
  const user = this;
  await blogModel.deleteMany({ postedBy: user._id });
  next();
});

const userModel = mongoose.model("User", schema);

module.exports = userModel;
