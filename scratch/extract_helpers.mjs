async function extractHelpers() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find pk definition
  const pkIdx = txt.indexOf('function pk(');
  console.log('pk at:', pkIdx);
  if (pkIdx !== -1) {
    console.log('=== pk (RoundedBox) ===');
    console.log(txt.substring(pkIdx, pkIdx + 500));
  } else {
    // maybe const pk or var pk
    const m = txt.match(/[a-zA-Z0-9_]+\s*=\s*function[^{]*\{[^}]*color[^}]*size/g);
    console.log('pk matches:', m);
  }

  // Find pN definition (Material)
  const pnIdx = txt.indexOf('function pN(');
  console.log('pN at:', pnIdx);
  if (pnIdx !== -1) {
    console.log('=== pN (Material) ===');
    console.log(txt.substring(pnIdx, pnIdx + 500));
  }

  // Find character model function: look for hairStyle, skin, outfit
  const charIdx = txt.indexOf('hairStyle');
  console.log('hairStyle at:', charIdx);
  if (charIdx !== -1) {
    console.log('=== Character 3D Model ===');
    console.log(txt.substring(charIdx - 300, charIdx + 1200));
  }
}
extractHelpers();
