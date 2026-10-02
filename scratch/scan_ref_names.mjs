import fs from 'node:fs';

async function check() {
  const res = await fetch('https://kantor.iniwebsitemu.com/_next/static/chunks/0ctmvi3avs-o0.js');
  const t = await res.text();
  
  // Find all occurrences of name:"..." where it looks like a person
  const matches = [...t.matchAll(/name:"([A-Z][a-zA-Z\s]+)"/g)].map(m => m[1]);
  console.log('Capitalized Names in chunk:', [...new Set(matches)]);

  // Search for title:"..."
  const titles = [...t.matchAll(/title:"([^"]+)"/g)].map(m => m[1]);
  console.log('Titles in chunk:', [...new Set(titles)]);

  // Search for Raka or Dinda or Sinta context
  for (const name of ['Raka', 'Dinda', 'Sinta', 'Budi', 'Andi', 'Siti', 'Dewi', 'Rian', 'Bayu', 'Arya', 'Jhony', 'Sofia', 'Maya', 'Ujang']) {
    let pos = 0;
    let found = 0;
    while ((pos = t.indexOf(`"${name}"`, pos)) !== -1 && found < 2) {
      console.log(`=== Match for ${name} at ${pos} ===`);
      console.log(t.substring(Math.max(0, pos - 150), Math.min(t.length, pos + 250)));
      pos += name.length + 2;
      found++;
    }
  }
}

check();
