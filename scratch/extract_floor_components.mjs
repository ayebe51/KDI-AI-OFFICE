async function extractFloors() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Search for function gf(
  const gfIdx = txt.indexOf('function gf(');
  console.log('gf (Yard) at:', gfIdx);
  if (gfIdx !== -1) {
    console.log('=== YARD gf ===');
    console.log(txt.substring(gfIdx, gfIdx + 2000));
  }

  // Search for function fm(
  const fmIdx = txt.indexOf('function fm(');
  console.log('fm (Floor 1) at:', fmIdx);
  if (fmIdx !== -1) {
    console.log('=== FLOOR 1 fm ===');
    console.log(txt.substring(fmIdx, fmIdx + 2000));
  }

  // Search for function vU(
  const vuIdx = txt.indexOf('function vU(');
  console.log('vU (Rooftop) at:', vuIdx);
  if (vuIdx !== -1) {
    console.log('=== ROOFTOP vU ===');
    console.log(txt.substring(vuIdx, vuIdx + 2000));
  }
}
extractFloors();
