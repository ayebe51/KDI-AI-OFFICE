async function extractProps() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find "gerobak"
  let gIdx = 0;
  while ((gIdx = txt.indexOf('gerobak', gIdx)) !== -1) {
    console.log('=== GEROBAK at', gIdx, '===');
    console.log(txt.substring(Math.max(0, gIdx - 300), Math.min(txt.length, gIdx + 500)));
    gIdx += 7;
  }

  // Find camera / lighting / render setup
  const camIdx = txt.indexOf('OrthographicCamera');
  if (camIdx !== -1) {
    console.log('=== CAMERA SETUP ===');
    console.log(txt.substring(Math.max(0, camIdx - 200), Math.min(txt.length, camIdx + 600)));
  }
}
extractProps();
