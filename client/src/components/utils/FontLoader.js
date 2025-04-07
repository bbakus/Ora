// src/utils/loadFont.js
export function loadSansationFont() {
  const font = new FontFace(
    'Sansation_Regular',
    'url(/assets/fonts/Sansation_Regular.ttf) format("truetype")'
  );

  font.load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    
    // Apply font to all heading elements using JavaScript
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      heading.style.fontFamily = '"Sansation_Regular", sans-serif';
    });
    
    // Add observer for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const newHeadings = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
            if (newHeadings.length > 0) {
              newHeadings.forEach(heading => {
                heading.style.fontFamily = '"Sansation_Regular", sans-serif';
              });
            }
            if (node.tagName && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
              node.style.fontFamily = '"Sansation_Regular", sans-serif';
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("Sansation_Regular font loaded successfully");
  }).catch((err) => {
    console.error("Font failed to load:", err);
  });
}