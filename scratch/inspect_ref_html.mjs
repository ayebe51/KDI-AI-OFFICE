async function inspect() {
  const html = await (await fetch('https://kantor.iniwebsitemu.com/')).text();
  console.log('--- HTML Preview ---');
  console.log(html.substring(0, 2000));
  
  // Find all images
  const images = [...html.matchAll(/src="([^"]+\.(png|jpg|jpeg|webp|svg|gif))"/gi)].map(m => m[1]);
  console.log('Images in HTML:', images);
  
  // Find all script URLs
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/gi)].map(m => m[1]);
  console.log('Scripts:', scripts);
  
  // Let's search inside scripts for canvas, WebGL, three, etc.
  for (const s of scripts) {
    const url = s.startsWith('http') ? s : 'https://kantor.iniwebsitemu.com' + s;
    const txt = await (await fetch(url)).text();
    const hasCanvas = txt.includes('<canvas') || txt.includes('createElement("canvas")');
    const hasWebGL = txt.includes('webgl') || txt.includes('WebGL');
    const hasThree = txt.includes('THREE') || txt.includes('three');
    const hasPlaycanvas = txt.includes('pc.') || txt.includes('playcanvas');
    const hasPixi = txt.includes('PIXI');
    const hasPhaser = txt.includes('Phaser');
    const hasCssIsometric = txt.includes('rotateX') || txt.includes('rotateZ') || txt.includes('matrix3d');
    console.log(`Script ${s}: len=${txt.length}, canvas=${hasCanvas}, webgl=${hasWebGL}, three=${hasThree}, playcanvas=${hasPlaycanvas}, pixi=${hasPixi}, phaser=${hasPhaser}, cssIso=${hasCssIsometric}`);
  }
}
inspect();
