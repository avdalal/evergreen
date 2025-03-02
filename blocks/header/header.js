import { getMetadata } from "../../scripts/aem.js";
import { loadFragment } from "../fragment/fragment.js";
import {
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
} from "../../scripts/aem.js";

const searchParams = new URLSearchParams(window.location.search);

function findNextHeading(el) {
  let preceedingEl =
    el.parentElement.previousElement || el.parentElement.parentElement;
  let h = "H2";
  while (preceedingEl) {
    const lastHeading = [
      ...preceedingEl.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ].pop();
    if (lastHeading) {
      const level = parseInt(lastHeading.nodeName[1], 10);
      h = level < 6 ? `H${level + 1}` : "H6";
      preceedingEl = false;
    } else {
      preceedingEl = preceedingEl.previousElement || preceedingEl.parentElement;
    }
  }
  return h;
}

function highlightTextElements(terms, elements) {
  elements.forEach((element) => {
    if (!element || !element.textContent) return;

    const matches = [];
    const { textContent } = element;
    terms.forEach((term) => {
      let start = 0;
      let offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      while (offset >= 0) {
        matches.push({
          offset,
          term: textContent.substring(offset, offset + term.length),
        });
        start = offset + term.length;
        offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      }
    });

    if (!matches.length) {
      return;
    }

    matches.sort((a, b) => a.offset - b.offset);
    let currentIndex = 0;
    const fragment = matches.reduce((acc, { offset, term }) => {
      if (offset < currentIndex) return acc;
      const textBefore = textContent.substring(currentIndex, offset);
      if (textBefore) {
        acc.appendChild(document.createTextNode(textBefore));
      }
      const markedTerm = document.createElement("mark");
      markedTerm.textContent = term;
      acc.appendChild(markedTerm);
      currentIndex = offset + term.length;
      return acc;
    }, document.createDocumentFragment());
    const textAfter = textContent.substring(currentIndex);
    if (textAfter) {
      fragment.appendChild(document.createTextNode(textAfter));
    }
    element.innerHTML = "";
    element.appendChild(fragment);
  });
}

async function fetchData(source) {
  const response = await fetch(source);
  if (!response.ok) {
    console.error("error loading API response", response);
    return null;
  }

  const json = await response.json();
  if (!json) {
    console.error("empty API response", source);
    return null;
  }

  return json.data;
}

function renderResult(result, searchTerms, titleTag) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = result.path;
  if (result.image) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-result-image";
    const pic = createOptimizedPicture(result.image, "", false, [
      { width: "375" },
    ]);
    wrapper.append(pic);
    a.append(wrapper);
  }
  if (result.title) {
    const title = document.createElement(titleTag);
    title.className = "search-result-title";
    const link = document.createElement("a");
    link.href = result.path;
    link.textContent = result.title;
    highlightTextElements(searchTerms, [link]);
    title.append(link);
    a.append(title);
  }
  if (result.description) {
    const description = document.createElement("p");
    description.textContent = result.description;
    highlightTextElements(searchTerms, [description]);
    a.append(description);
  }
  li.append(a);
  return li;
}

function clearSearchResults(block) {
  const searchResults = block.querySelector(".search-results");
  searchResults.innerHTML = "";
}

function clearSearch(block) {
  clearSearchResults(block);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.search = "";
    searchParams.delete("q");
    window.history.replaceState({}, "", url.toString());
  }
}

async function renderResults(block, config, filteredData, searchTerms) {
  clearSearchResults(block);
  const searchResults = block.querySelector(".search-results");
  const headingTag = searchResults.dataset.h;

  if (filteredData.length) {
    searchResults.classList.remove("no-results");
    filteredData.forEach((result) => {
      const li = renderResult(result, searchTerms, headingTag);
      searchResults.append(li);
    });
  } else {
    const noResultsMessage = document.createElement("li");
    searchResults.classList.add("no-results");
    noResultsMessage.textContent =
      config.placeholders.searchNoResults || "No results found.";
    searchResults.append(noResultsMessage);
  }
}

function compareFound(hit1, hit2) {
  return hit1.minIdx - hit2.minIdx;
}

function filterData(searchTerms, data) {
  const foundInHeader = [];
  const foundInMeta = [];

  data.forEach((result) => {
    let minIdx = -1;

    searchTerms.forEach((term) => {
      const idx = (result.header || result.title).toLowerCase().indexOf(term);
      if (idx < 0) return;
      if (minIdx < idx) minIdx = idx;
    });

    if (minIdx >= 0) {
      foundInHeader.push({ minIdx, result });
      return;
    }

    const metaContents = `${result.title} ${result.description} ${result.path
      .split("/")
      .pop()}`.toLowerCase();
    searchTerms.forEach((term) => {
      const idx = metaContents.indexOf(term);
      if (idx < 0) return;
      if (minIdx < idx) minIdx = idx;
    });

    if (minIdx >= 0) {
      foundInMeta.push({ minIdx, result });
    }
  });

  return [
    ...foundInHeader.sort(compareFound),
    ...foundInMeta.sort(compareFound),
  ].map((item) => item.result);
}

function searchResultsContainer(block) {
  const results = document.createElement("ul");
  results.className = "search-results";
  results.dataset.h = findNextHeading(block);
  return results;
}

function searchInput(block, config) {
  const input = document.createElement("input");
  input.setAttribute("type", "search");
  input.className = "search-input";

  const searchPlaceholder = config.placeholders.searchPlaceholder || "Search";
  input.placeholder = searchPlaceholder;
  input.setAttribute("aria-label", searchPlaceholder);

  return input;
}

function searchBox(block, config) {
  const form = document.createElement("form");
  form.classList.add("search-form");
  form.setAttribute("action", "/products");
  form.setAttribute("method", "GET");

  const input = searchInput(block, config);
  input.setAttribute("name", "q"); // Set the name attribute to "q" for the query parameter

  const box = document.createElement("div");
  box.classList.add("search-box");
  box.append(input);

  form.append(box);
  return form;
}

async function decorateSearch(block) {
  const placeholders = await fetchPlaceholders();
  const source = block.querySelector("a[href]")
    ? block.querySelector("a[href]").href
    : "/query-index.json";
  block.innerHTML = "";
  block.append(
    searchBox(block, { source, placeholders }),
    searchResultsContainer(block)
  );

  if (searchParams.get("q")) {
    const input = block.querySelector("input");
    input.value = searchParams.get("q");
    input.dispatchEvent(new Event("input"));
  }

  decorateIcons(block);
}

// media query match that indicates desktop width
const isDesktop = window.matchMedia("(min-width: 1299px)");

function closeOnEscape(e) {
  if (e.code === "Escape") {
    const nav = document.getElementById("nav");
    const navSections = nav.querySelector(".nav-sections");
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]'
    );
    if (navSectionExpanded && isDesktop.matches) {
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      toggleMenu(nav, navSections);
      nav.querySelector("button").focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector(".nav-sections");
    const navSectionExpanded = navSections.querySelector(
      '[aria-expanded="true"]'
    );
    if (navSectionExpanded && isDesktop.matches) {
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === "nav-drop";
  if (isNavDrop && (e.code === "Enter" || e.code === "Space")) {
    const dropExpanded = focused.getAttribute("aria-expanded") === "true";
    toggleAllNavSections(focused.closest(".nav-sections"));
    focused.setAttribute("aria-expanded", dropExpanded ? "false" : "true");
  }
}

function focusNavSection() {
  document.activeElement.addEventListener("keydown", openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections
    .querySelectorAll(".nav-sections .default-content-wrapper > ul > li")
    .forEach((section) => {
      section.setAttribute("aria-expanded", expanded);
    });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded =
    forceExpanded !== null
      ? !forceExpanded
      : nav.getAttribute("aria-expanded") === "true";
  const button = nav.querySelector(".nav-hamburger button");
  document.body.style.overflowY = expanded || isDesktop.matches ? "" : "hidden";
  nav.setAttribute("aria-expanded", expanded ? "false" : "true");
  toggleAllNavSections(
    navSections,
    expanded || isDesktop.matches ? "false" : "true"
  );
  button.setAttribute(
    "aria-label",
    expanded ? "Open navigation" : "Close navigation"
  );
  nav.setAttribute("aria-expanded", "false");
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll(".nav-drop");
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute("tabindex")) {
        drop.setAttribute("tabindex", 0);
        drop.addEventListener("focus", focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute("tabindex");
      drop.removeEventListener("focus", focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener("keydown", closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener("focusout", closeOnFocusLost);
  } else {
    window.removeEventListener("keydown", closeOnEscape);
    nav.removeEventListener("focusout", closeOnFocusLost);
  }
}

function toggleNavDrop(navSection, navSections) {
  const expanded = navSection.getAttribute("aria-expanded") === "true";
  navSections.querySelectorAll(".nav-drop").forEach((section) => {
    if (section !== navSection) {
      section.setAttribute("aria-expanded", "false");
      const dropdown = section.querySelector("ul");
      dropdown.style.maxHeight = dropdown.scrollHeight + "px";
      dropdown.style.opacity = "1";
      setTimeout(() => {
        dropdown.style.maxHeight = "0";
        dropdown.style.opacity = "0";
      }, 10);
      setTimeout(() => {
        dropdown.style.display = "none";
      }, 500);
    }
  });
  navSection.setAttribute("aria-expanded", expanded ? "false" : "true");
  const dropdown = navSection.querySelector("ul");
  if (expanded) {
    dropdown.style.maxHeight = dropdown.scrollHeight + "px";
    dropdown.style.opacity = "1";
    setTimeout(() => {
      dropdown.style.maxHeight = "0";
      dropdown.style.opacity = "0";
    }, 10);
    setTimeout(() => {
      dropdown.style.display = "none";
    }, 300);
  } else {
    dropdown.style.display = "block";
    setTimeout(() => {
      dropdown.style.maxHeight = "unset";
      dropdown.style.opacity = "1";
    }, 10);
  }
}

function createHref(navDropLabel, liContent) {
  const formattedNavDropLabel = navDropLabel.toLowerCase().replace(/\s+/g, "-");
  const formattedLiContent = liContent.toLowerCase().replace(/\s+/g, "-");
  return `/${formattedNavDropLabel}/${formattedLiContent}`;
}

function toggleSideMenu() {
  const sideMenu = document.querySelector(".side-menu");
  sideMenu.classList.toggle("open");
}

function closeSideMenu() {
  const sideMenu = document.querySelector(".side-menu");
  sideMenu.classList.remove("open");
}

function toggleSideMenuDropdown(e) {
  const clickedLi = e.currentTarget;
  const sideMenu = document.querySelector(".side-menu");
  const allDropdowns = sideMenu.querySelectorAll(
    ".default-content-wrapper > ul > li > ul"
  );

  allDropdowns.forEach((dropdown) => {
    if (dropdown !== clickedLi.querySelector("ul")) {
      dropdown.style.maxHeight = "0";
      dropdown.style.opacity = "0";
      // dropdown.previousElementSibling.textContent = "+";
    }
  });

  const isExpanded = clickedLi.querySelector("ul");
  if (clickedLi.querySelector("ul").style.display === "block") {
    clickedLi.querySelector("ul").style.maxHeight = isExpanded ? "0" : "unset";
    clickedLi.querySelector("ul").style.opacity = isExpanded ? "0" : "1";
    clickedLi.querySelector("ul").style.display = isExpanded ? "none" : "block";
    clickedLi.querySelector("span.toggle-sign").textContent = isExpanded
      ? "+"
      : "-";
  } else {
    clickedLi.querySelector("ul").style.maxHeight = isExpanded ? "unset" : "0";
    clickedLi.querySelector("ul").style.opacity = isExpanded ? "1" : "0";
    clickedLi.querySelector("ul").style.display = isExpanded ? "block" : "none";
    clickedLi.querySelector("span.toggle-sign").textContent = isExpanded
      ? "-"
      : "+";
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata("nav");
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : "/nav";
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = "";
  const nav = document.createElement("nav");
  nav.id = "nav";
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Add favicon logo
  const logo = document.createElement("img");
  logo.src = "/favicon.ico";
  logo.alt = "Logo";
  logo.className = "nav-logo";
  logo.style.cursor = "pointer";
  logo.addEventListener("click", () => {
    window.location.href = "/";
  });
  nav.prepend(logo);

  const classes = ["brand", "sections", "tools"];
  classes.forEach((c, i) => {
    const section = nav.children[i + 1]; // Adjust index to account for logo
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector(".nav-brand");
  navBrand.style.cursor = "pointer";
  navBrand.addEventListener("click", () => {
    window.location.href = "/";
  });

  const brandLink = navBrand.querySelector(".button");
  if (brandLink) {
    brandLink.className = "";
    brandLink.closest(".button-container").className = "";
  }

  const navSections = nav.querySelector(".nav-sections");
  if (navSections) {
    navSections
      .querySelectorAll(":scope .default-content-wrapper > ul > li")
      .forEach((navSection) => {
        if (navSection.querySelector("ul")) {
          navSection.classList.add("nav-drop");
          navSection.querySelector("ul").style.transition =
            "max-height 0.5s ease-in-out, opacity 0.5s ease-in-out";
          navSection.addEventListener("click", () => {
            if (isDesktop.matches) {
              toggleNavDrop(navSection, navSections);
            }
          });
        }
      });
  }

  // hamburger for mobile
  const hamburger = document.createElement("div");
  hamburger.classList.add("nav-hamburger");
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener("click", () => {
    nav.setAttribute("aria-expanded", "false");
    toggleMenu(nav, navSections);
    toggleSideMenu();
  });
  nav.prepend(hamburger);
  nav.setAttribute("aria-expanded", "false");
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener("change", () =>
    toggleMenu(nav, navSections, isDesktop.matches)
  );

  const navTools = nav.querySelector(".nav-tools");
  if (navTools) {
    decorateSearch(navTools);
  }

  // Create side menu for mobile
  const sideMenu = document.createElement("div");
  sideMenu.className = "side-menu";
  sideMenu.innerHTML = `
    <span class="side-menu-close">×</span>
    <ul>${navSections.innerHTML}</ul>
  `;
  document.body.appendChild(sideMenu);

  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.append(nav);
  block.append(navWrapper);

  // Add event listener for close button to close side menu
  document
    .querySelector(".side-menu-close")
    .addEventListener("click", closeSideMenu);

  // Add toggle signs and event listeners for side menu dropdowns
  sideMenu
    .querySelectorAll(".default-content-wrapper > ul > li")
    .forEach((li) => {
      if (li.querySelector("ul")) {
        const toggleSign = document.createElement("span");
        toggleSign.className = "toggle-sign";
        toggleSign.textContent = "+";
        li.prepend(toggleSign);
        li.addEventListener("click", toggleSideMenuDropdown);
      }
    });
}
