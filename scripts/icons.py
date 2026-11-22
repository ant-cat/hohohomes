"""Builds every HoHoHomes icon from one lit-house drawing. Run: pip install cairosvg pillow && python3 scripts/icons.py"""
import cairosvg, io, sys, os
from PIL import Image
R = sys.argv[1] if len(sys.argv) > 1 else "."  # repo root

BULBS = [(13,30.5,"#e8394a"),(22.5,21.5,"#2fbf71"),(32,12.5,"#ffc94d"),(41.5,21.5,"#5fb8ff"),(51,30.5,"#e8394a")]

def art(animated):
    bulbs = "".join(f'<circle class="b b{i}" cx="{x}" cy="{y}" r="4.2" fill="{c}"/>' for i,(x,y,c) in enumerate(BULBS))
    return f'''<circle cx="32" cy="40" r="30" fill="url(#g)"/>
<path d="M14 33 L32 16 L50 33 V52 H14 Z" fill="#f6f1e7"/>
<rect class="w" x="27" y="38" width="10" height="14" rx="2" fill="#ffc94d"/>
<path d="M9 34 L32 12 L55 34" fill="none" stroke="#2a3150" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
{bulbs}'''

DEFS = '<defs><radialGradient id="g" cx="32" cy="40" r="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffc94d" stop-opacity=".45"/><stop offset="1" stop-color="#ffc94d" stop-opacity="0"/></radialGradient></defs>'

STYLE = '''<style>
.b{animation:t 1.6s ease-in-out infinite}
.b1{animation-delay:.32s}.b2{animation-delay:.64s}.b3{animation-delay:.96s}.b4{animation-delay:1.28s}
.w{animation:w 3.2s ease-in-out infinite}
@keyframes t{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes w{0%,100%{opacity:1}50%{opacity:.75}}
@media (prefers-reduced-motion:reduce){.b,.w{animation:none}}
</style>'''

def svg(rounded=True, scale=1.0, animated=False):
    bg = f'<rect width="64" height="64"{" rx=\"14\"" if rounded else ""} fill="#0b1020"/>'
    t = (1-scale)*32
    body = art(animated) if scale==1 else f'<g transform="translate({t} {t+1}) scale({scale})">{art(animated)}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{STYLE if animated else ""}{DEFS}{bg}{body}</svg>'

def png(s, size):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=size, output_height=size))).convert("RGBA")

# Browser tab: animated SVG (Firefox twinkles, others show it still) plus a still .ico fallback.
open(f"{R}/app/icon.svg","w").write(svg(rounded=True, animated=True)+"\n")
ico = svg(rounded=True)
png(ico,48).save(f"{R}/app/favicon.ico", sizes=[(16,16),(32,32),(48,48)], append_images=[png(ico,16),png(ico,32)])
# Home screen and app icons: full-bleed tiles, since iOS and Android round the corners themselves.
full = svg(rounded=False)
png(full,180).convert("RGB").save(f"{R}/app/apple-icon.png", optimize=True)
png(full,192).convert("RGB").save(f"{R}/public/icon-192.png", optimize=True)
png(full,512).convert("RGB").save(f"{R}/public/icon-512.png", optimize=True)
# Maskable: house shrunk into Android's safe circle so no launcher shape clips the bulbs.
png(svg(rounded=False, scale=0.72),512).convert("RGB").save(f"{R}/public/icon-maskable-512.png", optimize=True)
print("ok")
