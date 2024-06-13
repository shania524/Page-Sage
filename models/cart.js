document.addEventListener('DOMContentLoaded', function () {
  const removeButtons = document.querySelectorAll('.remove-btn');

  removeButtons.forEach(button => {
    button.addEventListener('click', function () {
      const bookId = this.getAttribute('data-book-id');
      removeFromCart(bookId);
    });
  });
  function removeFromCart(bookId) {
    fetch(`/cart/remove/${encodeURIComponent(bookId)}`, {
      method: 'DELETE',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Update the cart display based on the updated cart in data.cart
          updateCartDisplay(data.cart);
        } else {
          console.error('Error removing item from cart:', data.error);
        }
      })
      .catch((error) => {
        console.error('Error removing item from cart:', error);
      });
  }
  
  
});



function updateCartDisplay(cartData) {
  const cartContainer = document.querySelector('.cart-items');
  const emptyCartMsg = document.querySelector('.empty-cart');

  // Clear the current cart items
  cartContainer.innerHTML = '';

  if (cartData.length > 0) {
    // If there are items in the cart, render them
    emptyCartMsg.style.display = 'none'; // Hide the empty cart message

    cartData.forEach((item) => {
      const cartItemDiv = document.createElement('div');
      cartItemDiv.classList.add('cart-item');

      // Create elements for book details
      const bookDetailsDiv = document.createElement('div');
      bookDetailsDiv.classList.add('book-details');

      const bookImage = document.createElement('img');
      bookImage.classList.add('book-image');
      bookImage.src = item.book.image;
      bookImage.alt = item.book.title;
      bookDetailsDiv.appendChild(bookImage);

      const bookTitle = document.createElement('h3');
      bookTitle.classList.add('book-title');
      bookTitle.textContent = item.book.title;
      bookDetailsDiv.appendChild(bookTitle);

      const bookAuthor = document.createElement('p');
      bookAuthor.classList.add('book-author');
      bookAuthor.textContent = 'By ' + item.book.author;
      bookDetailsDiv.appendChild(bookAuthor);

      const bookDescription = document.createElement('p');
      bookDescription.classList.add('book-description');
      bookDescription.textContent = item.book.description;
      bookDetailsDiv.appendChild(bookDescription);

      cartItemDiv.appendChild(bookDetailsDiv);

      // Create elements for due date
      const dueDateDiv = document.createElement('div');
      dueDateDiv.classList.add('due-date');

      const dueDate = document.createElement('p');
      dueDate.textContent = 'Due Date: ' + new Date(item.dueDate).toDateString();
      dueDateDiv.appendChild(dueDate);

      cartItemDiv.appendChild(dueDateDiv);

      // Create remove button
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-btn');
      removeBtn.textContent = 'Remove from Cart';
      removeBtn.onclick = function () {
        removeFromCart(item.book.id);
      };
      cartItemDiv.appendChild(removeBtn);

      // Append the cart item to the container
      cartContainer.appendChild(cartItemDiv);
    });
  } else {
    // If the cart is empty, show the empty cart message
    emptyCartMsg.style.display = 'block';
  }
}


function removeItemFromCart(itemId) {
  $.ajax({
    type: 'DELETE',
    url: `/cart/remove/${itemId}`,
    success: function (data) {
      if (data.success) {
        updateCart(data.updatedCart); // Update the cart display with the updated cart
      } else {
        console.log('Error:', data.error);
      }
    },
    error: function (error) {
      console.log('AJAX Error:', error);
    },
  });
}