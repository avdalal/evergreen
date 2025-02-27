import { createOptimizedPicture } from "../../scripts/aem.js";

export default async function decorate(block) {
  try {
    const response = await fetch("/products.json");
    const data = await response.json();

    // Extract category, subcategory, and query parameter from the URL
    const url = new URL(window.location.href);
    const category = url.pathname.split("/").pop();
    const subcategory = url.searchParams.get("subcategory");
    const q = url.searchParams.get("q");
    console.log("category:", category);
    console.log("subcategory:", subcategory);
    console.log("q:", q);

    const ul = document.createElement("ul");
    ul.className = "products__list";

    // Filter products by category, subcategory, and query parameter
    const filteredProducts = data.data.filter((product) => {
      const isCategoryMatch =
        category && category.toLowerCase() !== "products"
          ? product.Category.toLowerCase() === category.toLowerCase()
          : true;
      const isSubcategoryMatch = subcategory
        ? product.SubCategory &&
          product.SubCategory.toLowerCase() === subcategory.toLowerCase()
        : true;
      const isQueryMatch = q
        ? product.ProductName.toLowerCase().includes(q.toLowerCase()) ||
          product.Description.toLowerCase().includes(q.toLowerCase())
        : true;
      return isCategoryMatch && isSubcategoryMatch && isQueryMatch;
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
