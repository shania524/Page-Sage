//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const path = require('path');
const Book = require("./models/book");
const bcrypt = require("bcrypt");

const ObjectId = mongoose.Types.ObjectId;
const session = require("express-session");
const MongoStore = require('connect-mongo');
const app = express();


app.use(session({
  secret: "your-secret-key", 
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl:process.env.DB_URI,  })
}));

mongoose.set('strictQuery', true);

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'templates', 'views'));

// mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true })



app.use(express.static(__dirname));



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  cart: [{ book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, dueDate: Date }]
});

const User = mongoose.model("User", userSchema);

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/branch", function (req, res) {
  res.render("branch",{currentPage: 'page1'});
});



// When registering a user
app.post("/register", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the number of salt rounds

    User.findOne({ username: username })
      .then((existingUser) => {
        if (existingUser) {
          return res.render("register", { errorMessage: "Email already exists" });
        }

        const user = new User({
          username: username,
          password: hashedPassword, 
        });

        return user.save();
      })
      .then((savedUser) => {
        req.session.user = savedUser;
        const redirectTo = "/branch";
        res.redirect(redirectTo);
      })
      .catch((err) => {
        console.error(err);
        res.render("register", { errorMessage: "An error occurred" });
      });
  } catch (err) {
    console.error(err);
    res.render("register", { errorMessage: "An error occurred" });
  }
});

// When checking the login credentials
app.post("/login", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ username: username });

    if (!foundUser) {
      return res.render("login", { error: "Invalid username or password" });
    }

    // Compare the entered password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, foundUser.password);

    if (passwordMatch) {
      req.session.user = foundUser;
      return res.redirect("/branch");
    } else {
      return res.render("login", { error: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: "An error occurred" });
  }
});


app.get("/branch/:branch", async function (req, res) {
  try {
    const branch = req.params.branch;
    const user = req.session.user;
    const query = req.query.query; // Get the search query from the URL query parameters

    let books;

    if (query) {
      // If there is a search query, search for books matching the query in the specified branch
      // books = await Book.find({ branch: branch, $text: { $search: query } }).exec();
      books = await Book.find({ branch: branch, $text: { $search: `"${query}"` } }).exec();

    } else {
      // If no search query, fetch all books in the specified branch
      books = await Book.find({ branch: branch }).exec();
    }

    res.render("books", { books: books, branch: branch, user: user, currentPage: 'page2' });
  } catch (err) {
    console.error(err);
    res.render("error", { errorMessage: "An error occurred" });
  }
});

app.use(function (err, req, res, next) {
  console.error(err);
  res.render("error", { errorMessage: err.message });
});


app.post("/branch/:branch/add-to-cart", function (req, res) {
  const branch = req.params.branch;
  const bookId = req.body.bookId;
  const user = req.session.user;

  if (!user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  const userId = user._id;

  User.findById(userId)
    .then((foundUser) => {
      if (!foundUser) {
        return res.render("error", { errorMessage: "User not found" });
      }

      const bookInCart = foundUser.cart.find((item) => item.book.toString() === bookId);

      if (bookInCart) {
        return res.render("error", { errorMessage: "Book is already in your cart" });
      }

        Book.findById(bookId)
        .then((book) => {
          if (!book) {
            return res.render("error", { errorMessage: "Book not found" });
          }
         
          if (book.quantity === 0) {
            return res.render("error", { errorMessage: "Book is not available" });
          }

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + book.maxDays);

          foundUser.cart.push({ book: book, dueDate: dueDate });
          return foundUser.save()
            .then(() => {
              return res.render("cart", { user: foundUser });
            });
        })
        .catch((err) => {
          console.error(err);
          res.render("error", { errorMessage: "An error occurred" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    });
});





app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    } else {
      res.redirect("/");
    }
  });
});

// app.get('/book/:id', (req, res) => {
//   const bookId = req.params.id;

//   // Retrieve the book details, including the due date
//   const book = getBookById(bookId);
//   const dueDate = new Date(book.dueDate);

//   // Prepare the response JSON
//   const response = {
//     book: book,
//     dueDate: dueDate.toISOString(), // Convert the Date object to a string
//   };

//   // Send the response as JSON
//   res.json(response);
// });


let cart = [];


// app.delete('/cart/remove/:id', async (req, res) => {
//   try {
//     const itemId = req.params.id;
//     if (!req.session.user) {
//       return res.json({ success: false, error: 'User not found' });
//     }

//     const userId = req.session.user._id;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.json({ success: false, error: 'User not found' });
//     }

//     user.cart = user.cart.filter(item => item.book.toString() !== itemId);

//     // Save the updated user document with the item removed
//     await user.save();

//     // Return a success response with the updated cart
//     res.json({ success: true, cart: user.cart });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, error: 'An error occurred' });
//   }
// });











app.delete('/cart/remove/:id', async (req, res) => {
  try {
    const itemId = req.params.id;

    if (!req.session.user) {
      return res.json({ success: false, error: 'User not found' });
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }

    console.log('Item ID to remove:', itemId);
    console.log('Before removing item:', JSON.stringify(user.cart, null, 2));

    // Ensure itemId is treated as a string for comparison
    const itemIdStr = itemId.toString();

    user.cart.forEach(item => {
      console.log(`Item in cart: ${item.book.toString()} (Type: ${typeof item.book})`);
    });

    // Filtering the cart to remove the item
    const filteredCart = user.cart.filter(item => {
      const itemBookIdStr = item.book.toString();
      console.log(`Comparing ${itemBookIdStr} with ${itemIdStr}`);
      return itemBookIdStr !== itemIdStr;
    });

    console.log('After removing item:', JSON.stringify(filteredCart, null, 2));

    // Check if the cart was modified
    if (user.cart.length === filteredCart.length) {
      console.log('No item was removed, possible mismatch in IDs');
    }

    // Update the user's cart
    user.cart = filteredCart;

    // Save the updated user document with the item removed
    await user.save();

    // Return a success response with the updated cart
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: 'An error occurred' });
  }
});

app.get("/cart", function (req, res) {
  if (!req.session.user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  const userId = req.session.user._id;

  User.findById(userId)
    .populate("cart.book")
    .then((user) => {
      if (!user) {
        return res.render("error", { errorMessage: "User not found" });
      }
      res.render("cart", { user: user });
    })
    .catch((err) => {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    });
});

app.listen(3000, function () {
  
});