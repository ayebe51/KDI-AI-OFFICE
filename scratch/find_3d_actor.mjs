async function find3DActor() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where .look is accessed
  const matches = [...txt.matchAll(/\.look/g)].map(m => m.index);
  console.log('.look accessed at indices:', matches);
  for (const idx of matches) {
    console.log('=== AT', idx, '===');
    console.log(txt.substring(Math.max(0, idx - 200), Math.min(txt.length, idx + 800)));
  }
}
find3DActor();
