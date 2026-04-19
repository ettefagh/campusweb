const fs = require('fs');
const path = require('path');

// A simple regex to find all urls in links.ts
const content = fs.readFileSync('src/lib/data/links.ts', 'utf-8');
const urlRegex = /url:\s*'([^']+)'/g;
let match;
const urls = [];
while ((match = urlRegex.exec(content)) !== null) {
  urls.push(match[1]);
}

async function checkUrl(urlStr) {
  try {
    const res = await fetch(urlStr, { method: 'GET' });
    const xFrameOptions = res.headers.get('x-frame-options');
    const csp = res.headers.get('content-security-policy');
    
    let blocksIframe = false;
    let reason = '';
    
    if (xFrameOptions) {
      if (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase() === 'sameorigin') {
        blocksIframe = true;
        reason = `X-Frame-Options: ${xFrameOptions}`;
      }
    }
    
    if (csp && csp.toLowerCase().includes('frame-ancestors')) {
      if (!csp.toLowerCase().includes('campusweb.cloud')) {
        blocksIframe = true;
        reason = `CSP: ${csp}`;
      }
    }
    
    console.log(`${blocksIframe ? 'BLOCKS' : 'ALLOWS'} - ${urlStr} (${reason})`);
  } catch (e) {
    console.log(`ERROR - ${urlStr} (${e.message})`);
  }
}

async function main() {
  for (const urlStr of urls) {
    await checkUrl(urlStr);
  }
}

main();
