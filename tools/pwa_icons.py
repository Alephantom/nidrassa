# Erzeugt die App-Icons (PWA) aus den Stern-Polygonen (star-sprite.html, viewBox 0..100).
# Aufruf: uv run -q --with pillow python pwa_icons.py <ausgabe-ordner> [olive|creme]
import sys, os
from PIL import Image, ImageDraw

P = [
 "82,18 82,36.745 95.255,50 82,63.255 82,82 63.255,82 50,95.255 36.745,82 18,82 18,63.255 4.745,50 18,36.745 18,18 36.745,18 50,4.745 63.255,18",
 "81.358,37.011 75.977,50 81.358,62.989 68.369,68.369 62.989,81.358 50,75.977 37.011,81.358 31.631,68.369 18.642,62.989 24.023,50 18.642,37.011 31.631,31.631 37.011,18.642 50,24.023 62.989,18.642 68.369,31.631",
 "66,34 66,43.373 72.627,50 66,56.627 66,66 56.627,66 50,72.627 43.373,66 34,66 34,56.627 27.373,50 34,43.373 34,34 43.373,34 50,27.373 56.627,34",
 "61.759,45.129 59.742,50 61.759,54.871 56.888,56.888 54.871,61.759 50,59.742 45.129,61.759 43.112,56.888 38.241,54.871 40.258,50 38.241,45.129 43.112,43.112 45.129,38.241 50,40.258 54.871,38.241 56.888,43.112",
]
POLYS = [[tuple(map(float, p.split(","))) for p in s.split()] for s in P]
LITE = ["#F2EADF", "#E4D6C3", "#C9C7A6", "#A7A77B"]   # .star-lite (Intro-Stern auf Olive)
DARK = ["#4B4E2A", "#6E7040", "#A7A77B", "#C9C7A6"]   # .star-dark (Logo auf Creme)
OLIVE, CREME = "#42452A", "#F2EADF"
SS = 4  # Supersampling


def icon(size, bg, colors, star_frac, radius=0.0):
    """star_frac = Breite des Sterns (Spitze zu Spitze, 90,5 % der viewBox) im Verhältnis zur Icon-Kante."""
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg:
        if radius:
            d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(radius * S), fill=bg)
        else:
            d.rectangle([0, 0, S, S], fill=bg)
    box = star_frac * S / 0.9051          # viewBox-Kante in px
    off = (S - box) / 2
    for poly, c in zip(POLYS, colors):
        d.polygon([(off + x * box / 100, off + y * box / 100) for x, y in poly], fill=c)
    return im.resize((size, size), Image.LANCZOS)


def main():
    out = sys.argv[1]
    look = sys.argv[2] if len(sys.argv) > 2 else "olive"
    os.makedirs(out, exist_ok=True)
    bg, star = (OLIVE, LITE) if look == "olive" else (CREME, DARK)
    # purpose any: abgerundetes Quadrat, Stern 62 %
    for s in (192, 512):
        icon(s, bg, star, 0.62, radius=0.22).save(f"{out}/icon-{s}.png", optimize=True)
    # purpose maskable: randlos, Stern 70 % (liegt komplett in der 80-%-Safe-Zone)
    icon(512, bg, star, 0.70).save(f"{out}/icon-maskable-512.png", optimize=True)
    icon(192, bg, star, 0.70).save(f"{out}/icon-maskable-192.png", optimize=True)
    # iOS: randlos (iOS rundet selbst), keine Transparenz
    icon(180, bg, star, 0.62).convert("RGB").save(f"{out}/apple-touch-icon.png", optimize=True)
    # Favicon-Fallback wie favicon.svg: dunkler Stern, transparent
    for s in (32, 48):
        icon(s, None, DARK, 0.96).save(f"{out}/favicon-{s}.png", optimize=True)


main()
