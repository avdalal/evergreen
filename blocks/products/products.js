import { createOptimizedPicture } from "../../scripts/aem.js";

export default async function decorate(block) {
  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    // Extract category and subcategory from the URL
    const url = new URL(window.location.href);
    const category = url.pathname.split("/").pop();
    const subcategory = url.searchParams.get("subcategory");

    const ul = document.createElement("ul");
    ul.className = "products__list";

    // Filter products by category and subcategory
    const filteredProducts = data.data.filter((product) => {
      const isCategoryMatch =
        product.Category.toLowerCase() === category.toLowerCase();
      const isSubcategoryMatch = subcategory
        ? product.SubCategory &&
          product.SubCategory.toLowerCase() === subcategory.toLowerCase()
        : true;
      return isCategoryMatch && isSubcategoryMatch;
    });

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
