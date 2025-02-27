import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-class';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  footer.querySelectorAll('a.button').forEach((a) => {
    a.classList.remove('button');
  });
    // Add click event listeners for toggling sections on small screens
    footer.querySelectorAll('.section h4').forEach((h4) => {
      h4.addEventListener('click', () => {
        const section = h4.closest('.section');
        section.classList.toggle('open');
      });
    });
  block.append(footer);
}
