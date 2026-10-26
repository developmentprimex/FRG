"""
Convert page 1 of a vector kitchen plan PDF to a self-contained SVG for a razor-sharp,
infinitely scalable plan in the configurator.

Part of the "build a kitchen from PDF + Excel" workflow (see kitchen-from-pdf-agent-guide.md).

Usage:
    python docs/render-plan-svg.py "frontend/public/pdfs/<plan>.pdf" "frontend/public/plans/<plan>.svg"
    python docs/render-plan-svg.py "frontend/public/pdfs/<plan>.pdf" "frontend/public/plans/<plan>.svg" --dark-strokes
    python docs/render-plan-svg.py "frontend/public/pdfs/<plan>.pdf" "frontend/public/plans/<plan>.svg" --smooth-strokes
    # Optional: add --preview-png <output.png> for an antialiased 4x browser image.

Requires PyMuPDF (`pip install pymupdf`). text_as_path=True bakes glyphs into vector paths so
the SVG renders identically in an <img> tag regardless of available fonts. The output keeps the
PDF page's viewBox, so the %-based hotspot overlay (docs/detect-plan-hotspots.py) still aligns.
Only works when the PDF is genuine vector linework (not a scanned raster).
"""
import re
import math
import sys
import fitz  # PyMuPDF

HAIRLINE_STROKE_WIDTH = 1
MAJOR_STROKE_WIDTH = 6
MINOR_STROKE_WIDTH = 4
DARK_PLAN_STROKE = "#303030"
DARK_PLAN_MIN_STROKE_WIDTH = 0.48


def smooth_plan_svg_strokes(svg: str) -> str:
    """Give CAD hairlines a 0.65pt minimum after each path's transform.

    Changing raw widths alone magnifies small marks whose transform differs
    from the main CAD drawing. Keep those already-thick strokes unchanged.
    """
    def smooth_path(match: re.Match[str]) -> str:
        path = match.group(0)
        transform = re.search(r'transform="matrix\(([^)]+)\)"', path)
        scale = 1.0
        if transform:
            values = [float(v) for v in re.split(r'[\s,]+', transform.group(1).strip())]
            a, b, c, d = values[:4]
            scale = math.sqrt(abs(a * d - b * c))
        if scale <= 0:
            return path
        return re.sub(
            r'stroke-width="([0-9]*\.?[0-9]+)"',
            lambda width: f'stroke-width="{max(float(width.group(1)), 0.65 / scale):.6g}"',
            path,
        )
    return re.sub(r"<path\b[^>]*?/>", smooth_path, svg, flags=re.DOTALL)


def normalize_plan_svg_strokes(svg: str, dark_strokes: bool = False) -> str:
    """Boost hairline PDF strokes so exported plans match the visual weight of thicker CAD exports."""
    # Appliance symbols can intentionally use a pale CAD gray. Keep that source
    # distinction instead of flattening every stroke to black (for example, the
    # integrated-dishwasher basket in AB 105748 is RGB 240/240/240).
    def normalize_stroke_color(match: re.Match[str]) -> str:
        color = match.group(1).lower()
        if color == "#f0f0f0":
            return f'stroke="{DARK_PLAN_STROKE}"' if dark_strokes else 'stroke="#f0f0f0"'
        if color == "#00ffff":
            return 'stroke="#00ffff"'
        return 'stroke="#000000"'

    svg = re.sub(
        r'stroke="(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})"',
        normalize_stroke_color,
        svg,
    )

    def boost_black_stroke(match: re.Match[str]) -> str:
        path = match.group(0)
        if not dark_strokes and 'stroke="#000000"' not in path and 'stroke="#000"' not in path:
            return path
        if dark_strokes:
            def boost_hairline_width(width_match: re.Match[str]) -> str:
                width = float(width_match.group(1))
                return f'stroke-width="{max(width, DARK_PLAN_MIN_STROKE_WIDTH):g}"'

            return re.sub(r'stroke-width="([0-9]*\.?[0-9]+)"', boost_hairline_width, path)
        path = path.replace(f'stroke-width="{HAIRLINE_STROKE_WIDTH}"', f'stroke-width="{MAJOR_STROKE_WIDTH}"')
        path = path.replace('stroke-width="2"', f'stroke-width="{MINOR_STROKE_WIDTH}"')
        path = path.replace('stroke-width="3"', f'stroke-width="{MINOR_STROKE_WIDTH}"')
        return path

    return re.sub(r"<path\b[^>]*?/>", boost_black_stroke, svg, flags=re.DOTALL)


if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(1)

src, out = sys.argv[1], sys.argv[2]
dark_strokes = "--dark-strokes" in sys.argv[3:]
doc = fitz.open(src)
page = doc[0]
source_svg = page.get_svg_image(text_as_path=True)
svg = (smooth_plan_svg_strokes(source_svg) if "--smooth-strokes" in sys.argv[3:]
       else normalize_plan_svg_strokes(source_svg, dark_strokes=dark_strokes))
with open(out, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"{out}: {len(svg)} bytes, page {page.rect.width:.0f}x{page.rect.height:.0f}")
if "--preview-png" in sys.argv[3:]:
    preview_path = sys.argv[sys.argv.index("--preview-png") + 1]
    preview_doc = fitz.open(stream=svg.encode("utf-8"), filetype="svg")
    preview_doc[0].get_pixmap(matrix=fitz.Matrix(4, 4), alpha=False).save(preview_path)
    print(f"{preview_path}: antialiased 4x preview")
