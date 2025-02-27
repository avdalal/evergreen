import { createOptimizedPicture } from "../../scripts/aem.js";

export default async function decorate(block) {
  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    // Extract category from the URL
    const url = new URL(window.location.href);
    const category = url.pathname.split("/").pop();

    const ul = document.createElement("ul");
    ul.className = "products__list";

    // Filter products by category
    const filteredProducts = data.data.filter(
      (product) => product.Category.toLowerCase() === category.toLowerCase()
    );

    filteredProducts.forEach((product) => {
      const li = document.createElement("li");
      li.className = "products__product-item";

      const img = createOptimizedPicture(
        product.ImageURL,
        product.ProductName,
        false,
        [{ width: "750" }]
      );
      const imgDiv = document.createElement("div");
      imgDiv.className = "products__product-image";
      imgDiv.append(img);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "products__product-body";
      bodyDiv.innerHTML = `
        <div class="products___product-manufacturer">${product.Manufacturer}</div>
        <h3 class="products___product-title"><a href="/${product.Category}/${product.ProductID}" title="${product.ProductName}">${product.ProductName}</a></h3>
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
