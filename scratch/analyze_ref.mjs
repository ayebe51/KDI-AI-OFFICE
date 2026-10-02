import fs from 'node:fs';

async function run() {
  const res = await fetch('https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js');
  const t = await res.text();
  
  // Find NPCs / characters
  const sintaIdx = t.indexOf('name:"Sinta"');
  if (sintaIdx !== -1) {
    console.log('--- NPC definitions ---');
    console.log(t.substring(Math.max(0, sintaIdx - 800), Math.min(t.length, sintaIdx + 1200)));
  }

  // Find Floors / zones
  const floorIdx = t.indexOf('rooftop');
  if (floorIdx !== -1) {
    console.log('--- Floor definitions ---');
    console.log(t.substring(Math.max(0, floorIdx - 400), Math.min(t.length, floorIdx + 600)));
  }

  // Find Character selection
  const charIdx = t.indexOf('Pilih Karakter');
  if (charIdx !== -1) {
    console.log('--- Character selection ---');
    console.log(t.substring(Math.max(0, charIdx - 300), Math.min(t.length, charIdx + 600)));
  }

  // Find Palette / colors
  const colorMatches = t.match(/#[0-9a-fA-F]{6}/g) || [];
  const colorCounts = {};
  for (const c of colorMatches) {
    colorCounts[c.toLowerCase()] = (colorCounts[c.toLowerCase()] || 0) + 1;
  }
  const topColors = Object.entries(colorCounts).sort((a,b) => b[1] - a[1]).slice(0, 25);
  console.log('--- Top Colors ---', topColors);
}

run();
