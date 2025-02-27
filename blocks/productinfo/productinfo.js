import { createOptimizedPicture } from "../../scripts/aem.js";


export default async function decorate(block) {
  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    // Get the current page suffix (assuming it's the last part of the URL path)
    const pageSuffix = window.location.pathname.split('/').pop();

    const product = data.data.find(product => product.ProductID === pageSuffix);

    if (product) {
      const img = createOptimizedPicture(
        product.ImageURL,
        product.ProductName,
        false,
        [{ width: "750" }]
      );
      const imgDiv = document.createElement("div");
      imgDiv.className = "image";
      imgDiv.append(img);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "content";
      bodyDiv.innerHTML = `
        <h2>${product.ProductName}</h2>
        <p>${product.Description}</p>
        <p>Price: ${product.Price}</p>
      `;

      // Create quantity selector
      const quantityDiv = document.createElement("div");
      quantityDiv.className = "quantity-selector";
      quantityDiv.innerHTML = `
        <label for="quantity">Quantity:</label>
        <input type="number" id="quantity" name="quantity" min="1" value="1">
      `;

      // Add event listener to save quantity to local storage
      const quantityInput = quantityDiv.querySelector('#quantity');

      // Create CTA button
      const ctaButton = document.createElement("button");
      ctaButton.textContent = "Add to Cart";
      ctaButton.addEventListener('click', () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingProductIndex = cart.findIndex(item => item.productID === product.ProductID);

        if (existingProductIndex !== -1) {
          cart[existingProductIndex].amount = quantityInput.value;
        } else {
          cart.push({ productID: product.ProductID, amount: quantityInput.value });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
      });

      bodyDiv.append(quantityDiv);
      bodyDiv.append(ctaButton);
      block.append(imgDiv, bodyDiv);
    }

    // block.textContent = "";
  } catch (error) {
    console.error("Failed to fetch products data:", error);
  }
}