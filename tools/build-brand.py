#!/usr/bin/env python3
"""Gera a marca "K Cortado" (SVGs + PNGs). Uso: python3 tools/build-brand.py
Geometria: tudo a 60° exatos (dx = h / tan60). Grade 256, altura útil 224 (y 16→240)."""
import math, subprocess, pathlib
from PIL import Image

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "brand"
OUT.mkdir(parents=True, exist_ok=True)
T60 = math.tan(math.radians(60))
LIME, PURPLE, BONE, INK = "#c8f135", "#8b5cf6", "#f5f5f0", "#0a0a0a"

def f(n): return ("%.2f" % n).rstrip("0").rstrip(".")
def poly(pts): return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"

def geometry(stem=60, hw=61, gap=12, top=16, bottom=240, xl0=16, upper_tl=157, lower_tl=117):
    """devolve (stem_path, upper_path, lower_path). Pernas 'sobem' e 'descem' a 60°."""
    H = bottom - top
    hu = (H - gap) * 0.5192          # perna de cima levemente mais alta (óptico)
    hl = H - gap - hu
    dxu, dxl = hu / T60, hl / T60
    yu1, yl0 = top + hu, top + hu + gap
    s = poly([(xl0, top), (xl0 + stem, top), (xl0 + stem, bottom), (xl0, bottom)])
    u = poly([(upper_tl, top), (upper_tl + hw, top), (upper_tl + hw - dxu, yu1), (upper_tl - dxu, yu1)])
    l = poly([(lower_tl, yl0), (lower_tl + hw, yl0), (lower_tl + hw + dxl, bottom), (lower_tl + dxl, bottom)])
    return s, u, l

def svg(body, title, vb="0 0 256 256", extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="256" height="256" role="img" aria-labelledby="t"{extra}>'
            f'<title id="t">{title}</title>{body}</svg>\n')

S, U, L = geometry()
# versão para tamanhos pequenos: haste e pernas mais grossas, vão maior
Ss, Us, Ls = geometry(stem=72, hw=72, gap=18, top=12, bottom=244, xl0=12, upper_tl=150, lower_tl=108)

def mark(fills, s=S, u=U, l=L):
    return (f'<g id="symbol"><path fill="{fills[0]}" d="{s}"/><path fill="{fills[1]}" d="{u}"/><path fill="{fills[2]}" d="{l}"/></g>')

files = {
  "kl-mark.svg": svg(mark((BONE, LIME, PURPLE)), "Kauã Lucas — K Cortado"),
  "kl-mark-black.svg": svg(mark((INK,) * 3), "Kauã Lucas — K Cortado (preto)"),
  "kl-mark-white.svg": svg(mark(("#ffffff",) * 3), "Kauã Lucas — K Cortado (branco)"),
  "kl-mark-small.svg": svg(mark((BONE, LIME, PURPLE), Ss, Us, Ls), "Kauã Lucas — K Cortado (tamanho pequeno)"),
  "favicon.svg": svg(f'<rect width="256" height="256" rx="48" fill="{INK}"/><g transform="translate(128 128) scale(.8) translate(-128 -128)">{mark((BONE, LIME, PURPLE), Ss, Us, Ls)}</g>', "Kauã Lucas"),
}
for n, c in files.items(): (OUT / n).write_text(c, encoding="utf-8")

# partes separadas (usadas pelo site para animar as pernas)
(OUT / "kl-parts.json").write_text('{"stem":"%s","upper":"%s","lower":"%s"}\n' % (S, U, L))

def png(src, dst, size, bg=None):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), str(OUT / src), "-o", str(OUT / dst)], check=True)
    if bg:
        im = Image.open(OUT / dst).convert("RGBA"); base = Image.new("RGBA", im.size, bg); base.alpha_composite(im); base.convert("RGB").save(OUT / dst)

# favicon e ícones
for n in (16, 32, 48): png("favicon.svg", f"favicon-{n}.png", n)
png("favicon.svg", "apple-touch-icon.png", 180, INK)
png("favicon.svg", "icon-192.png", 192); png("favicon.svg", "icon-512.png", 512)
# maskable: marca na zona segura (80%) sobre fundo cheio
mk = svg(f'<rect width="256" height="256" fill="{INK}"/><g transform="translate(128 128) scale(.62) translate(-128 -128)">{mark((BONE, LIME, PURPLE), Ss, Us, Ls)}</g>', "Kauã Lucas")
(OUT / "_maskable.svg").write_text(mk); png("_maskable.svg", "icon-maskable-512.png", 512); (OUT / "_maskable.svg").unlink()
ims = [Image.open(OUT / f"favicon-{n}.png") for n in (16, 32, 48)]
ims[2].save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ims[:2])
# ── lockup horizontal: símbolo + "KAUÃ LUCAS" em contornos (Bebas Neue, OFL) ──
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
FONT = pathlib.Path(__file__).resolve().parent / "bebas-neue-latin-400-normal.woff"
if FONT.exists():
    tt = TTFont(FONT); gs = tt.getGlyphSet(); cm = tt.getBestCmap(); upm = tt["head"].unitsPerEm; cap = tt["OS/2"].sCapHeight
    capH = 120.0; sc = capH / cap; track = 0.05 * upm * sc
    x = 0.0; parts = []
    for ch in "KAUÃ LUCAS":
        gname = cm[ord(ch)]
        if ch != " ":
            pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
            gs[gname].draw(TransformPen(pen, (sc, 0, 0, -sc, x, 0)))
            parts.append(pen.getCommands())
        x += gs[gname].width * sc + track
    wm_w = x - track
    base = 128 + capH / 2      # linha de base: texto centrado verticalmente no símbolo
    gap = 56
    W = 256 + gap + wm_w
    def lock(fills, tcol, title):
        wm = f'<g id="wordmark" transform="translate({256 + gap} {f(base)})" fill="{tcol}"><path d="{" ".join(parts)}"/></g>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(W)} 256" width="{f(W)}" height="256" role="img" aria-labelledby="t"><title id="t">{title}</title>' + mark(fills) + wm + '</svg>\n')
    (OUT / "kl-logo-horizontal.svg").write_text(lock((BONE, LIME, PURPLE), BONE, "Kauã Lucas — editor de vídeo"), encoding="utf-8")
    (OUT / "kl-logo-horizontal-black.svg").write_text(lock((INK,) * 3, INK, "Kauã Lucas — editor de vídeo (preto)"), encoding="utf-8")
    (OUT / "kl-logo-horizontal-white.svg").write_text(lock(("#ffffff",) * 3, "#ffffff", "Kauã Lucas — editor de vídeo (branco)"), encoding="utf-8")
print("ok", sorted(p.name for p in OUT.iterdir()))
