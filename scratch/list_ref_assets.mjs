async function run() {
  const html = await (await fetch('https://kantor.iniwebsitemu.com/')).text();
  const allUrls = [...new Set(html.match(/\/(_next\/static\/[^"'\s\\]+)/g) || [])];
  console.log('Static URLs found in HTML:');
  for (const u of allUrls) {
    console.log(u);
  }
}
run();
