async function inspectChunks() {
  const html = await (await fetch('https://kantor.iniwebsitemu.com/')).text();
  const chunkRegex = /\/_next\/static\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g;
  const matches = [...new Set(html.match(chunkRegex) || [])];
  console.log('All chunks referenced in HTML:', matches);
  
  for (const c of matches) {
    const txt = await (await fetch('https://kantor.iniwebsitemu.com' + c)).text();
    // search for more chunks
    const inner = [...new Set(txt.match(chunkRegex) || [])];
    console.log(`Chunk ${c} (size ${txt.length}): inner chunks=${inner.length}`);
    if (txt.includes('WebGL') || txt.includes('canvas') || txt.includes('isometric') || txt.includes('svg') || txt.includes('three')) {
      console.log(`--> ${c} has keywords!`);
    }
    // Also look for assets (.png, .svg, .gltf, .glb, .css, etc.)
    const assetMatches = [...new Set(txt.match(/[\/a-zA-Z0-9_\-\.]+\.(png|webp|svg|jpg|glb|gltf)/gi) || [])];
    if (assetMatches.length > 0) {
      console.log(`--> ${c} assets:`, assetMatches.slice(0, 15));
    }
  }
}
inspectChunks();
