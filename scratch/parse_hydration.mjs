async function parseHydration() {
  const html = await (await fetch('https://kantor.iniwebsitemu.com/')).text();
  const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([^"]+)"\]\)/g)].map(m => m[1]);
  console.log('Push count:', pushMatches.length);
  const unescaped = pushMatches.map(s => {
    try {
      return JSON.parse(`"${s}"`);
    } catch {
      return s;
    }
  }).join('\n');
  
  // Find all file paths and chunk names in hydration data
  const chunkMatches = [...new Set(unescaped.match(/\/_next\/static\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g) || [])];
  console.log('Chunks in hydration:', chunkMatches);
  
  // Find components / filenames
  const componentMatches = [...new Set(unescaped.match(/[a-zA-Z0-9_\-]+\.(tsx|jsx|js|ts)/g) || [])];
  console.log('Components mentioned:', componentMatches);
}
parseHydration();
