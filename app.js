const express = require("express");
require("express-async-errors");
const path = require("path");
const logger = require("morgan");
const cors = require("cors");
const { port } = require("./config");
const fs = require("fs");
require("./db");
const createError = require("http-errors");

const feedsRouter = require("./routes/feeds");
const usersRouter = require("./routes/users");
const blogsRouter = require("./routes/blogs");
const contactRouter = require("./routes/contact");
const tagsRouter = require("./routes/tags");

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/feeds", feedsRouter);
app.use("/users", usersRouter);
app.use("/blogs", blogsRouter);
app.use("/contact", contactRouter);
app.use("/tags", tagsRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404, "Couldn't find this route"));
});

// error handler
app.use((err, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(err);
  }

  res.status(err.status || 500);
  res.send({ message: err.message || "Something went wrong" });
});

app.listen(port, () => console.log(`server listening on port ${port}`));
