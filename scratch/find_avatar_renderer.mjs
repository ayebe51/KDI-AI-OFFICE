async function findAvatarRenderer() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where .hairStyle is accessed
  const matches = [...txt.matchAll(/\.hairStyle/g)].map(m => m.index);
  console.log('.hairStyle accessed at indices:', matches);
  for (const idx of matches) {
    console.log('=== AT', idx, '===');
    console.log(txt.substring(Math.max(0, idx - 400), Math.min(txt.length, idx + 1000)));
  }
}
findAvatarRenderer();
