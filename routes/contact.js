var express = require("express");
var router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const { check } = require("express-validator");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* GET home page. */
router.post(
  "/blog-author",
  validateRequest([
    check("name").not().isEmpty().withMessage("Name is required"),
    check("email").isEmail().withMessage("Must be valid email address"),
    check("authorEmail").isEmail().withMessage("Must be valid email address"),
    check("message")
      .not()
      .isEmpty()
      .isLength({ min: 20 })
      .withMessage("Message muts be at least 20 characters long"),
  ]),
  async (req, res, next) => {
    const { authorEmail, email, name, message } = req.body;
    const emailData = {
      to: authorEmail,
      from: "Amir.mohammed2121@gmail.com",
      subject: "Someone messaged you from - Blogger App",
      text: `Email received from contact form \n Sender name: ${name} \n Sender email: ${email}`,
      html: `
      <h4>Message received from:</h4>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <p>Message: ${message}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <a>https://bit.ly/Js-Blog</a>
    `,
    };

    await sgMail.send(emailData);
    res.json({ success: true });
  }
);

router.post(
  "/",
  validateRequest([
    check("name").not().isEmpty().withMessage("Name is required"),
    check("email").isEmail().withMessage("Must be valid email address"),
    check("message")
      .not()
      .isEmpty()
      .isLength({ min: 20 })
      .withMessage("Message muts be at least 20 characters long"),
  ]),
  async (req, res, next) => {
    const { email, name, message } = req.body;
    const emailData = {
      to: process.env.EMAIL_TO,
      from: "Amir.mohammed2121@gmail.com",
      subject: "Contact form - Blogger App",
      text: `Email received from contact from \n Sender name: ${name} \n Sender email: ${email}`,
      html: `
      <h4>Message received from contact form:</h4>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <p>Message: ${message}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <a>bit.ly/Js-Blog</a>
    `,
    };

    await sgMail.send(emailData);
    res.json({ success: true });
  }
);

module.exports = router;
