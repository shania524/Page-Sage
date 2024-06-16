document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM fully loaded and parsed');

  const removeButtons = document.querySelectorAll('.remove-btn');
  console.log('Remove buttons found:', removeButtons.length);

  removeButtons.forEach(button => {
    console.log('Attaching event listener to button:', button);
    button.addEventListener('click', function () {
      const bookId = this.getAttribute('data-book-id');
      console.log('Remove button clicked, book ID:', bookId);
      removeFromCart(bookId);
    });
  });

  function removeFromCart(bookId) {
    console.log('Removing book with ID:', bookId);
    fetch(`/cart/remove/${encodeURIComponent(bookId)}`, {
      method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Book removed successfully:', data);
        updateCartDisplay(data.cart);
      } else {
        console.error('Error removing item from cart:', data.error);
      }
    })
    .catch(error => {
      console.error('Error removing item from cart:', error);
    });
  }

  function updateCartDisplay(cartData) {
    const cartContainer = document.querySelector('.cart-items');
    const emptyCartMsg = document.querySelector('.empty-cart');

    cartContainer.innerHTML = '';

    if (cartData.length > 0) {
      emptyCartMsg.style.display = 'none';

      cartData.forEach((item) => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');

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

        const dueDateDiv = document.createElement('div');
        dueDateDiv.classList.add('due-date');
        const dueDate = document.createElement('p');
        dueDate.textContent = 'Due Date: ' + new Date(item.dueDate).toDateString();
        dueDateDiv.appendChild(dueDate);

        cartItemDiv.appendChild(dueDateDiv);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn');
        removeBtn.textContent = 'Remove from Cart';
        removeBtn.setAttribute('data-book-id', item.book._id);
        removeBtn.addEventListener('click', function () {
          console.log('Remove button clicked for book ID:', item.book._id);
          removeFromCart(item.book._id);
        });
        cartItemDiv.appendChild(removeBtn);

        cartContainer.appendChild(cartItemDiv);
      });
    } else {
      emptyCartMsg.style.display = 'block';
    }
  }
});
