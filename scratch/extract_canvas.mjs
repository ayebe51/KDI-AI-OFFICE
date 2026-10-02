async function extractCanvasSetup() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  const idx = txt.indexOf('camera:{fov:30');
  console.log('=== CANVAS SETUP around', idx, '===');
  console.log(txt.substring(Math.max(0, idx - 400), Math.min(txt.length, idx + 1200)));
}
extractCanvasSetup();
