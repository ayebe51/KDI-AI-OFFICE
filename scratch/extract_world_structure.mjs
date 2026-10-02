async function extractWorldStructure() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Look around 925202 (where dS was found)
  const start = 920000;
  const end = 935000;
  console.log('=== SNIPPET around 920000-930000 ===');
  console.log(txt.substring(start, start + 3000));
}
extractWorldStructure();
