async function inspectChunk() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const res = await fetch(url);
  console.log('Status:', res.status);
  const txt = await res.text();
  console.log('Length:', txt.length);
  
  // Search for rendering keywords
  console.log('has canvas:', txt.includes('canvas'));
  console.log('has 2d:', txt.includes('2d'));
  console.log('has webgl:', txt.includes('webgl') || txt.includes('WebGL'));
  console.log('has svg:', txt.includes('svg'));
  console.log('has three:', txt.includes('three') || txt.includes('THREE'));
  console.log('has pixi:', txt.includes('pixi') || txt.includes('PIXI'));
  console.log('has phaser:', txt.includes('phaser') || txt.includes('Phaser'));
  
  // Look for React components or DOM elements
  const jsxElements = [...new Set(txt.match(/<[a-zA-Z0-9_\-]+/g) || [])];
  console.log('JSX elements:', jsxElements.slice(0, 20));
  
  // Look for CSS styles / tailwind classes
  const classes = [...new Set(txt.match(/className:"([^"]+)"/g) || [])];
  console.log('Classes count:', classes.length);
  console.log('Sample classes:', classes.slice(0, 10));
}
inspectChunk();
