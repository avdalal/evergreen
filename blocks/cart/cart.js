import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Create the empty message element
  const emptyMessage = document.createElement('p');
  emptyMessage.className = 'empty-message';
  emptyMessage.textContent = 'The cart is empty.';
  block.append(emptyMessage);

  // Function to check if the cart is empty and display a message
  function checkEmptyCart() {
    if (cart.length === 0) {
      emptyMessage.style.display = 'block';
      emptyMessage.style.cursor = 'not-allowed';
      emptyMessage.style.opacity = '0.65';
      return true;
    }
    emptyMessage.style.display = 'none';
    return false;
  }

  // Check if the cart is empty at the beginning
  checkEmptyCart();

  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    const cartProducts = [];
    data.data.forEach((product) => {
      const cartItem = cart.find((item) => item.productID === product.ProductID);
      if (cartItem) {
        cartProducts.push({ ...product, quantity: cartItem.amount });
      }
    });

    const ul = document.createElement("ul");
    let totalPrice = 0;
    let totalItems = 0;
    const shippingFee = 5.00; // Example shipping fee

    cartProducts.forEach((product) => {
      const li = document.createElement("li");

      const img = createOptimizedPicture(
        product.ImageURL,
        product.ProductName,
        false,
        [{ width: "750" }]
      );
      const imgDiv = document.createElement("div");
      imgDiv.className = "cards-card-image";
      imgDiv.append(img);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "cards-card-body";
      bodyDiv.innerHTML = `
        <h6>${product.ProductName}</h6>
        <p>${product.Description}</p>
        <p>Price: ${product.Price}</p>
      `;

      // Create quantity input
      const quantityDiv = document.createElement("div");
      quantityDiv.className = "quantity-selector";
      quantityDiv.innerHTML = `
        <label for="quantity-${product.ProductID}">Quantity:</label>
        <input type="number" id="quantity-${product.ProductID}" name="quantity" min="1" value="${product.quantity}">
      `;

      const quantityInput = quantityDiv.querySelector(`#quantity-${product.ProductID}`);
      quantityInput.addEventListener('change', () => {
        product.quantity = quantityInput.value;
        updateTotalPrice();
        updateLocalStorage();
      });

      // Calculate total price and total items
      totalPrice += parseFloat(product.Price.replace('$', '')) * product.quantity;
      totalItems += parseInt(product.quantity, 10);

      // Create the "X" button
      const removeButton = document.createElement("button");
      removeButton.textContent = "X";
      removeButton.className = "remove-button";
      removeButton.addEventListener('click', () => {
        // Remove the product from the cart in local storage
        cart = cart.filter(item => item.productID !== product.ProductID);
        localStorage.setItem('cart', JSON.stringify(cart));

        // Remove the product from the DOM
        li.remove();
        updateTotalPrice();
        updateLocalStorage();
        checkEmptyCart();
      });

      bodyDiv.append(quantityDiv);
      li.append(imgDiv, bodyDiv, removeButton);
      ul.append(li);
    });

    block.append(ul);

    // Create summary card
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "summary-card";
    summaryDiv.innerHTML = `
      <h3>Summary</h3>
      <p>Total Items: <span id="total-items">${totalItems}</span></p>
      <p>Total Price: <span id="total-price">${Math.round(totalPrice)}</span></p>
      <p>Shipping Fee: <span id="shipping-fee">$${totalItems > 0 ? Math.round(shippingFee) : '0'}</span></p>
      <p>Total Price (including shipping): <span id="total-price-with-shipping">${totalItems > 0 ? Math.round(totalPrice + shippingFee) : '0'}</span></p>
      <button class="cta-button">Complete Payment</button>
    `;
    block.append(summaryDiv);

    // Function to update total price and total items
    function updateTotalPrice() {
      cart = JSON.parse(localStorage.getItem('cart')) || [];

      let updatedCart = cartProducts.map(product => ({
        productID: product.ProductID,
        amount: product.quantity
      }));
      if (cart.length === 0) {
        updatedCart = [];
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart));

      let newTotalPrice = 0;
      let newTotalItems = 0;
      updatedCart.forEach(item => {
        const product = data.data.find(product => product.ProductID === item.productID);
        if (product) {
          newTotalPrice += parseFloat(product.Price.replace('$', '')) * item.amount;
          newTotalItems += parseInt(item.amount, 10);
        }
      });

      document.getElementById('total-price').textContent = `$${Math.round(newTotalPrice)}`;
      document.getElementById('total-items').textContent = newTotalItems;
      document.getElementById('total-price-with-shipping').textContent = (newTotalItems === 0 ? '$0' : `$${Math.round(newTotalPrice + shippingFee)}`);

      // Update the state of the "Complete Payment" button and empty message
      updateEmptyMessageAndButtonState(newTotalItems);
    }

    // Function to update local storage
    function updateLocalStorage() {
      cart = JSON.parse(localStorage.getItem('cart')) || [];

      let updatedCart = cartProducts.map(product => ({
        productID: product.ProductID,
        amount: product.quantity
      }));
      if (cart.length === 0) {
        updatedCart = [];
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }

    // Function to update the empty message and button state
    function updateEmptyMessageAndButtonState(totalItems) {
      const completePaymentButton = summaryDiv.querySelector('.cta-button');
      if (totalItems === 0) {
        completePaymentButton.disabled = true;
        emptyMessage.style.display = 'block';
        emptyMessage.style.cursor = 'not-allowed';
        emptyMessage.style.opacity = '0.65';
      } else {
        completePaymentButton.disabled = false;
        emptyMessage.style.display = 'none';
      }
    }

    // Add event listener to the "Complete Payment" button
    const completePaymentButton = summaryDiv.querySelector('.cta-button');
    completePaymentButton.addEventListener('click', () => {
      updateLocalStorage();
      alert('Payment completed and cart updated in local storage.');
      checkEmptyCart();
    });

    // Initial call to update the total price and items
    updateTotalPrice();

  } catch (error) {
    console.error("Failed to fetch products data:", error);
  }
}