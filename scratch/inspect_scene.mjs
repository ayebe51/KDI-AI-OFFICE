async function inspectScene() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Look for Three.js geometry constructors
  const geomMatches = [...new Set(txt.match(/[a-zA-Z0-9_\.]*Geometry/g) || [])];
  console.log('Geometries:', geomMatches);
  
  // Look for Three.js material constructors
  const matMatches = [...new Set(txt.match(/[a-zA-Z0-9_\.]*Material/g) || [])];
  console.log('Materials:', matMatches);
  
  // Look for GLTF/GLB loader
  const hasGltf = txt.includes('GLTFLoader') || txt.includes('gltf') || txt.includes('.glb');
  console.log('Has GLTF/GLB loader:', hasGltf);
  
  // Search for how character is drawn
  const charDrawIdx = txt.indexOf('createCharacter') !== -1 ? txt.indexOf('createCharacter') : txt.indexOf('Character');
  console.log('Character search index:', charDrawIdx);
  
  // Look for functions defining the world/scene/rooms
  const roomMatches = [...new Set(txt.match(/create[A-Z][a-zA-Z0-9]+/g) || [])];
  console.log('Create functions:', roomMatches.slice(0, 30));
  
  // Look for mesh definitions or functions building the office
  const officeKeywords = ['createOffice', 'buildOffice', 'OfficeScene', 'setupScene', 'initScene', 'addDesk', 'addTree', 'addWall', 'addFloor'];
  for (const kw of officeKeywords) {
    if (txt.includes(kw)) {
      console.log('Found keyword:', kw);
    }
  }
}
inspectScene();
