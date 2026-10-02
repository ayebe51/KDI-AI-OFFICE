async function analyze() {
  const files = [
    '/_next/static/chunks/0eo1cde-rr3bs.js',
    '/_next/static/chunks/0qm0--xw4zl2a.js',
    '/_next/static/chunks/19h11uu_inxyg.js',
    '/_next/static/chunks/3z5vbm1md9k7j.js',
    '/_next/static/chunks/3rn5xu1nx1tsv.js',
    '/_next/static/chunks/3fntmmi971322.js',
  ];
  
  for (const f of files) {
    const txt = await (await fetch('https://kantor.iniwebsitemu.com' + f)).text();
    const has2d = txt.includes('2d') || txt.includes('getContext("2d")') || txt.includes("getContext('2d')");
    const hasWebgl = txt.includes('webgl');
    const hasSvg = txt.includes('<svg') || txt.includes('createElementNS');
    const hasCanvas = txt.includes('canvas');
    console.log(`${f}: len=${txt.length} | 2d=${has2d} | webgl=${hasWebgl} | svg=${hasSvg} | canvas=${hasCanvas}`);
    
    // Check if it defines drawing functions like fillRect, arc, beginPath, lineTo
    const hasDraw = txt.includes('beginPath') || txt.includes('fillRect') || txt.includes('arc(') || txt.includes('drawImage');
    console.log(`  -> has 2D drawing calls: ${hasDraw}`);
  }
}
analyze();
