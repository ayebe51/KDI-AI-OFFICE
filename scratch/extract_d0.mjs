async function extractD0() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find function d0(
  const d0Idx = txt.indexOf('function d0(');
  console.log('function d0 at:', d0Idx);
  if (d0Idx !== -1) {
    console.log('=== FUNCTION d0 (CHIBI 3D CHARACTER) ===');
    console.log(txt.substring(d0Idx, d0Idx + 3000));
  } else {
    // maybe const d0 = or var d0 =
    const m = txt.match(/d0\s*=\s*(?:function|\([^)]*\)\s*=>)/g);
    console.log('d0 matches:', m);
  }
}
extractD0();
