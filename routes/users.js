const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const auth = require("../middleware/auth");
const { check } = require("express-validator");
const userModel = require("../models/user");
const fileUpload = require("../middleware/file-upload");
const createError = require("http-errors");
var cloudinary = require("cloudinary").v2;

//Register a user with the following required attributes Username, password, firstName
router.post(
  "/signup",
  fileUpload.single("image"),
  validateRequest([
    check("username")
      .not()
      .isEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3, max: 50 }),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least  8 characters long"),
    check("email")
      .not()
      .isEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
  ]),
  async (req, res) => {
    if (!req.file) throw createError(422, "Profile Image is required");
    const path = req.file.path.replace("public\\", "");
    cloudinary.uploader
      .upload(path, { tags: "express_sample" })
      .then(function (image) {
        console.log("** file uploaded to Cloudinary service");
        console.dir(image);
        req.body.image = image.secure_url;
      });
    // req.body.image = path;
    const user = new userModel(req.body);
    await user.save();
    const token = await user.generateAuthToken();
    user.tokens.push({ token });
    res
      .status(201)
      .send({ message: "user was registered successfully", user, token });
  }
);

//Login a user after checking credentials
router.post(
  "/login",
  validateRequest([
    check("email")
      .not()
      .isEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Must be a valid email address"),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ]),
  async (req, res, next) => {
    const user = await userModel.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.send({
      message: "logged in successfully",
      user,
      token,
    });
  }
);

//Logout a user
router.post("/logout", auth, async (req, res) => {
  req.user.tokens = req.user.tokens.filter(
    (token) => token.token !== req.token
  );
  await req.user.save();
  res.send({ message: "user was logged out successfully" });
});

//Logout a user from all sessions
router.post("/logoutAll", auth, async (req, res) => {
  req.user.tokens = [];
  await req.user.save();
  res.send({ message: "user was logged out from all sessions successfully" });
});

//Get User private profile
router.get("/me", auth, async (req, res) => {
  const user = await userModel
    .findOne({ username: req.user.username })
    .populate({
      path: "blogs",
      select: "title excerpt tags createdAt updatedAt",
    })
    .populate("followers", "_id username")
    .populate("following", "_id username");
  res.send({ user, blogs: user.blogs });
});

//Edit user profile
router.patch(
  "/me",
  auth,
  fileUpload.single("image"),
  validateRequest([
    check("username").optional().isLength({ min: 3, max: 50 }),
    check("about")
      .optional()
      .isLength({ min: 10, max: 100 })
      .withMessage("about must be between 10 to 100 characters long"),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Must be a valid email address"),
  ]),
  async (req, res, next) => {
    if (req.file) {
      const path = req.file.path.replace("public\\", "");
      req.body.image = path;
    }
    if (!req.file && req.body.image) {
      return next(createError(400, "Please upload an image"));
    }
    if (!req.body.image) {
      req.body.image = req.user.image;
    }
    if (!Object.keys(req.body).length) {
      return next(createError(400, "Please send any fields to update"));
    }
    const updates = Object.keys(req.body);
    const allowedUpdates = ["username", "email", "image", "about"];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );
    if (!isValidOperation)
      return next(createError(400, "Invalid updates fields"));
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send({ message: "user was updated successfully", user: req.user });
  }
);

//Get User public profile with his own blogs
router.get("/:username", async (req, res) => {
  const user = await userModel
    .findOne({ username: req.params.username })
    .populate({
      path: "blogs",
      select: "title excerpt tags createdAt updatedAt",
    })
    .populate("followers", "_id username")
    .populate("following", "_id username");
  res.send({ user, blogs: user.blogs });
});

//add following
router.patch("/follow/:username", auth, async (req, res, next) => {
  const followedUser = await userModel.findOneAndUpdate(
    { username: req.params.username },
    { $addToSet: { followers: req.user._id } }
  );
  if (!followedUser)
    return next(createError(400, "There is no user with such username"));
  await userModel.findByIdAndUpdate(req.user._id, {
    $addToSet: { following: followedUser._id },
  });
  res.send({ message: `You are now following ${followedUser.username}` });
});

//remove following
router.patch("/unFollow/:username", auth, async (req, res, next) => {
  const unFollowedUser = await userModel.findOneAndUpdate(
    { username: req.params.username },
    { $pull: { followers: req.user._id } }
  );
  if (!unFollowedUser)
    return next(createError(400, "There is no user with such username"));
  await userModel.findByIdAndUpdate(req.user._id, {
    $pull: { following: unFollowedUser._id },
  });
  res.send({
    message: `You are no longer following ${unFollowedUser.username}`,
  });
});

//Change Password
router.patch(
  "/me/password",
  auth,
  validateRequest([
    check("oldPassword")
      .not()
      .isEmpty()
      .withMessage("Old password is required"),
    check("newPassword")
      .not()
      .isEmpty()
      .withMessage("new password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least  8 characters long"),
  ]),
  async (req, res, next) => {
    const user = await userModel.findByCredentials(
      req.user.email,
      req.body.oldPassword
    );
    user.password = req.body.newPassword;
    await user.save();
    res.send({ message: "user Password was updated successfully" });
  }
);

//Delete user
router.delete("/", auth, async (req, res) => {
  const user = await userModel.findByCredentials(
    req.user.email,
    req.body.Password
  );
  await user.remove();
  res.send({ message: "user was deleted successfully" });
});

module.exports = router;
