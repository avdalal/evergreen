import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  console.log('cart', cart);

  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    const cartProducts = [];
    data.data.forEach((product) => {
      if (cart.some((item) => item.productID === product.ProductID)) {
        cartProducts.push(product);
      }
    });
    const ul = document.createElement("ul");
    cartProducts.forEach((product) => {
      const li = document.createElement("li");

      const img = createOptimizedPicture(
        product.ImageURL,
        product.ProductName,
        false,
        [{width: "750"}]
      );
      const imgDiv = document.createElement("div");
      imgDiv.className = "cards-card-image";
      imgDiv.append(img);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "cards-card-body";
      bodyDiv.innerHTML = `
        <h2>${product.ProductName}</h2>
        <p>${product.Description}</p>
        <p>Price: ${product.Price}</p>
      `;

      li.append(imgDiv, bodyDiv);
      ul.append(li);
    });

    block.textContent = "";
    block.append(ul);
  } catch (error) {
    console.error("Failed to fetch products data:", error);
  }
}
