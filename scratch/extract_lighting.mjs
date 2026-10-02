async function extractLighting() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find vJ definition
  const vjIdx = txt.indexOf('function vJ(');
  if (vjIdx !== -1) {
    console.log('=== LIGHTING vJ ===');
    console.log(txt.substring(vjIdx, vjIdx + 1000));
  } else {
    // maybe var vJ or const vJ
    const m = txt.match(/[a-zA-Z0-9_]+\s*=\s*function[^{]*\{[^}]*ambientLight/g);
    console.log('ambientLight matches:', m);
  }
  
  // Find ep object (sky colors, lamps, light)
  const epIdx = txt.indexOf('sky:');
  console.log('sky at:', epIdx);
  if (epIdx !== -1) {
    console.log('=== SKY / PALETTE ===');
    console.log(txt.substring(Math.max(0, epIdx - 200), Math.min(txt.length, epIdx + 400)));
  }
}
extractLighting();
