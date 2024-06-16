// jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const path = require('path');
const Book = require("./models/book");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require('connect-mongo');

const app = express();

// Ensure environment variable is loaded
console.log('MongoDB URI:', process.env.DB_URI);

app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URI,
    collectionName: 'sessions'
  })
}));

mongoose.set('strictQuery', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates', 'views'));

// Connect to MongoDB Atlas
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static("public"));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  cart: [{ book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, dueDate: Date }]
});
const User = mongoose.model("User", userSchema);

// Define routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/branch", (req, res) => {
  res.render("branch", { currentPage: 'page1' });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.render("register", { errorMessage: "Email already exists" });
    }

    const user = new User({ username, password: hashedPassword });
    const savedUser = await user.save();
    req.session.user = savedUser;
    res.redirect("/branch");
  } catch (err) {
    console.error(err);
    res.render("register", { errorMessage: "An error occurred" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      return res.render("login", { error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, foundUser.password);
    if (passwordMatch) {
      req.session.user = foundUser;
      res.redirect("/branch");
    } else {
      res.render("login", { error: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: "An error occurred" });
  }
});

app.get("/branch/:branch", async (req, res) => {
  try {
    const branch = req.params.branch;
    const query = req.query.query;
    const user = req.session.user;

    let books;
    if (query) {
      books = await Book.find({ branch, $text: { $search: `"${query}"` } }).exec();
    } else {
      books = await Book.find({ branch }).exec();
    }

    res.render("books", { books, branch, user, currentPage: 'page2' });
  } catch (err) {
    console.error(err);
    res.render("error", { errorMessage: "An error occurred" });
  }
});

app.post("/branch/:branch/add-to-cart", async (req, res) => {
  const { branch } = req.params;
  const { bookId } = req.body;
  const user = req.session.user;

  if (!user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  try {
    const foundUser = await User.findById(user._id);
    if (!foundUser) {
      return res.render("error", { errorMessage: "User not found" });
    }

    const bookInCart = foundUser.cart.find(item => item.book.toString() === bookId);
    if (bookInCart) {
      return res.render("error", { errorMessage: "Book is already in your cart" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.render("error", { errorMessage: "Book not found" });
    }

    if (book.quantity === 0) {
      return res.render("error", { errorMessage: "Book is not available" });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + book.maxDays);
    foundUser.cart.push({ book, dueDate });
    await foundUser.save();
    res.render("cart", { user: foundUser });
  } catch (err) {
    console.error(err);
    res.render("error", { errorMessage: "An error occurred" });
  }
});

app.get("/cart", async (req, res) => {
  if (!req.session.user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  try {
    const user = await User.findById(req.session.user._id).populate("cart.book");
    if (!user) {
      return res.render("error", { errorMessage: "User not found" });
    }
    res.render("cart", { user });
  } catch (err) {
    console.error(err);
    res.render("error", { errorMessage: "An error occurred" });
  }
});

// app.delete('/cart/remove/:id', async (req, res) => {
//   try {
//     const { id: itemId } = req.params;
//     if (!req.session.user) {
//       return res.json({ success: false, error: 'User not found' });
//     }

//     const userId = req.session.user._id;
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.json({ success: false, error: 'User not found' });
//     }

//     user.cart = user.cart.filter(item => item.book.toString() !== itemId);
//     await user.save();
//     res.json({ success: true, cart: user.cart });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, error: 'An error occurred' });
//   }
// });

app.delete('/cart/remove/:id', async (req, res) => {
  console.log('Delete request received for book ID:', req.params.id);
  try {
    const { id: itemId } = req.params;
    if (!req.session.user) {
      console.log('User not found in session');
      return res.json({ success: false, error: 'User not found' });
    }

    const userId = req.session.user._id;
    console.log('User ID from session:', userId);
    const user = await User.findById(userId).populate('cart.book');
    if (!user) {
      console.log('User not found in database');
      return res.json({ success: false, error: 'User not found' });
    }

    console.log('User cart before removal:', user.cart);
    user.cart = user.cart.filter(item => item.book._id.toString() !== itemId);
    await user.save();
    console.log('User cart after removal:', user.cart);
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    console.error('Error during deletion:', error);
    res.json({ success: false, error: 'An error occurred' });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    } else {
      res.redirect("/");
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
