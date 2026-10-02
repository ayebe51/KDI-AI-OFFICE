async function check() {
  try {
    const html = await (await fetch('https://kantor.iniwebsitemu.com/')).text();
    console.log('HTML length:', html.length);
    
    // Find all script tags
    const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
    console.log('Scripts found:', scripts.length);
    
    for (const s of scripts) {
      const url = s.startsWith('http') ? s : 'https://kantor.iniwebsitemu.com' + s;
      try {
        const txt = await (await fetch(url)).text();
        const m = txt.match(/[a-zA-Z0-9_\-\/\.]+\.(glb|gltf|fbx|obj)/gi);
        if (m) console.log('Found 3D models in', s, ':', [...new Set(m)]);
        
        // Also check for three.js / playcanvas / babylon / canvas
        if (txt.includes('three') || txt.includes('PlayCanvas') || txt.includes('WebGLRenderer')) {
          console.log(s, 'contains 3D engine keywords');
        }
      } catch(e) {
        console.error('Error fetching', url, e.message);
      }
    }
  } catch (err) {
    console.error('Main error:', err);
  }
}
check();
