async function extractAllComponents() {
  const url = 'https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js';
  const txt = await (await fetch(url)).text();
  
  // Find where fe, ft, fn are defined (Floor 1 components)
  const funcs = ['fe', 'ft', 'fn', 'fo', 'fu', 'fh', 'gt', 'gr', 'ga', 'gs', 'go', 'gl', 'gc', 'gu', 'gd', 'gp', 'vS', 'vy', 'vb', 'vM', 'vw', 'vT', 'vE', 'vA', 'vC', 'vR', 'vP', 'vI', 'vD'];
  for (const fn of funcs) {
    const idx = txt.indexOf(`function ${fn}(`);
    if (idx !== -1) {
      console.log(`=== Function ${fn} at ${idx} ===`);
      console.log(txt.substring(idx, idx + 600));
    }
  }
}
extractAllComponents();
