async function extractSceneDetails() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where Canvas is rendered
  const canvasIdx = txt.indexOf('<Canvas');
  if (canvasIdx !== -1) {
    console.log('--- Canvas snippet ---');
    console.log(txt.substring(canvasIdx - 100, canvasIdx + 800));
  } else {
    // maybe jsx or createElement
    const cIdx = txt.indexOf('Canvas');
    console.log('Canvas occurrences:', [...txt.matchAll(/Canvas/g)].length);
  }
  
  // Look for words like desk, chair, table, tree, plant, wall, floor, lamp, car, coffee
  const props = ['desk', 'chair', 'table', 'tree', 'plant', 'wall', 'floor', 'lamp', 'laptop', 'coffee', 'cart', 'gerobak'];
  for (const p of props) {
    const count = [...txt.matchAll(new RegExp(p, 'gi'))].length;
    console.log(`Prop "${p}": ${count} matches`);
  }
}
extractSceneDetails();
