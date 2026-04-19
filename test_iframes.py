import re
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with open('src/lib/data/links.ts', 'r') as f:
    content = f.read()

urls = re.findall(r"url:\s*'([^']+)'", content)

for url in urls:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            headers = response.headers
            x_frame = headers.get('X-Frame-Options', '').lower()
            csp = headers.get('Content-Security-Policy', '').lower()
            
            blocks = False
            reason = ''
            if x_frame in ['deny', 'sameorigin']:
                blocks = True
                reason = f"X-Frame-Options: {x_frame}"
            elif 'frame-ancestors' in csp and 'campusweb.cloud' not in csp:
                blocks = True
                reason = f"CSP: {csp}"
                
            print(f"{'BLOCKS' if blocks else 'ALLOWS'} - {url} ({reason})")
    except Exception as e:
        print(f"ERROR - {url} ({e})")
