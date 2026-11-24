"""Make the repo QR code for slide 12: python tools/make_qr.py https://github.com/<you>/shopsmart docs/screenshots/repo_qr.png
Needs: pip install "qrcode[pil]" """
import sys
import qrcode

url, out = sys.argv[1], sys.argv[2]
qrcode.make(url).save(out)
print("saved", out, "for", url)
