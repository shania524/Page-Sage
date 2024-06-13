const mongoose = require("mongoose");


const bookSchema = new mongoose.Schema({
    title: String,
    author: String,
    branch: String,
    image: String,
    description: String,
    quantity: Number, // Number of books available
    maxDays: Number // Maximum number of days a book can be kept
    
  });
  bookSchema.index({ title: "text", description: "text" });
  
  const Book = mongoose.model("Book", bookSchema,"books");
  
  module.exports = Book;
  