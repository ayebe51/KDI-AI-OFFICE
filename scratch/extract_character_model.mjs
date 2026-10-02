async function extractCharModel() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where hairStyle is used
  const hIdx = txt.indexOf('hairStyle===');
  const hIdx2 = txt.indexOf('"hijab"') !== -1 ? txt.indexOf('"hijab"') : txt.indexOf('hijab');
  console.log('hijab at:', hIdx2);
  if (hIdx2 !== -1) {
    console.log('=== CHIBI AVATAR CODE ===');
    console.log(txt.substring(Math.max(0, hIdx2 - 600), Math.min(txt.length, hIdx2 + 1800)));
  }
}
extractCharModel();
