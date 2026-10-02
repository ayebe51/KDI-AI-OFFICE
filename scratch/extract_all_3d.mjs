async function extractAll3D() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where the main Scene or Canvas is rendered
  // Let's search for Canvas props: camera, shadows, gl
  const canvasMatches = [...txt.matchAll(/<Canvas[^>]*>/g)].map(m => m[0]);
  console.log('Canvas tags:', canvasMatches);
  
  // Let's search for camera props
  const camMatch = txt.match(/camera:\{[^}]+\}/g);
  console.log('Camera props:', camMatch);

  // Let's search for lights in the scene
  const lightMatches = [...new Set(txt.match(/<ambientLight[^>]*>|<directionalLight[^>]*>|<pointLight[^>]*>|<hemisphereLight[^>]*>/g) || [])];
  console.log('Light tags:', lightMatches);

  // Let's find floor components
  // In the earlier snippet we saw: dE = { 0: [...], 1: [...], 2: [...], 3: [...], 4: [...] }
  // Let's find the floor rendering function!
  const dEIdx = txt.indexOf('dE={4:');
  if (dEIdx !== -1) {
    console.log('=== dE Floor definitions ===');
    console.log(txt.substring(dEIdx - 500, dEIdx + 1500));
  }
}
extractAll3D();
