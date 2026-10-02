async function extractMeshComponents() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where fountain is defined as a 3D mesh
  const fIdx = txt.indexOf('fountain');
  console.log('fountain at:', fIdx);
  
  // Find mesh JSX: e.g. <mesh or jsx("mesh" or createElement("mesh"
  // Let's find jsx("mesh" or "mesh", or type:"mesh"
  const meshIndices = [];
  let idx = 0;
  while ((idx = txt.indexOf('"mesh"', idx)) !== -1 && meshIndices.length < 5) {
    meshIndices.push(idx);
    idx += 6;
  }
  console.log('"mesh" occurrences:', meshIndices);
  if (meshIndices.length > 0) {
    console.log('Snippet around mesh:', txt.substring(meshIndices[0] - 100, meshIndices[0] + 300));
  }
  
  // Look for boxGeometry, cylinderGeometry
  const boxIdx = txt.indexOf('boxGeometry');
  console.log('boxGeometry at:', boxIdx);
  if (boxIdx !== -1) {
    console.log('Snippet around boxGeometry:', txt.substring(boxIdx - 100, boxIdx + 400));
  }
}
extractMeshComponents();
