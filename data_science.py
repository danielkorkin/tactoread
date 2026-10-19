"""TactoRead: chart data -> two 3D-printable STL plates (front chart plate + braille label plate).

The whole plate is a grid of 0.5 mm pixels, each with one height. Anything that wants to
raise pixels (ridge, title, chart, braille numbers) must "claim" them first; claiming a
pixel that is already taken, or one outside the feature's own zone, raises OverlapError.
"""
import csv
import io
import math
import os
from collections import Counter

import cairosvg
import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from matplotlib.patches import Wedge

# ----------------------------------------------------------------- layout (mm, then pixels)
PIX = 0.5  # mm per pixel: every feature below is a whole number of pixels


def px(mm):
    return round(mm / PIX)


PLATE_W, PLATE_H, CHAMFER = 100.0, 74.5, 8.0
BASE_T, RULE_T = 0.8, 2.0  # floor and separator ridge heights
DOT_H = 0.6
TOP_T = BASE_T + DOT_H  # everything raised (braille, chart) tops out here, well under 3.0
NX, NY = px(PLATE_W), px(PLATE_H)  # 200 x 149
MG = px(6.0)

# braille geometry (pixels)
SP, DOT, CELL = px(2.5), px(1.5), px(6.0)  # dot spacing, dot size, cell pitch
GLYPH_W, GLYPH_H = SP + DOT, 2 * SP + DOT  # 8 x 13 px
LINE = px(10.0)  # line pitch on the label plate
MAX_CELLS = 14  # per title / label line
MAX_LABEL, MAX_VALUE = 6, 3  # characters, donut/bar label lines
MAX_ENTRIES = 5

# zones (x0, y0, x1, y1), upper bounds exclusive, y counted from the bottom edge
CAP_Y1 = NY - MG
CAP_Y0 = CAP_Y1 - px(12.0)
RULE_Y0 = CAP_Y0 - px(1.5)
CHART_Y1 = RULE_Y0 - px(2.0)
ZONES = {
    "title": (MG, CAP_Y0, NX - MG, CAP_Y1),
    "ridge": (MG, RULE_Y0, NX - MG, CAP_Y0),
    "chart": (MG, MG, NX - MG, CHART_Y1),
    "text": (MG, MG, NX - MG, CAP_Y1),  # label plate
}
ZX0, ZY0 = ZONES["chart"][:2]
ZW, ZH = NX - 2 * MG, CHART_Y1 - MG  # 176 x 94 px = 88 x 47 mm
ZW_MM, ZH_MM = ZW * PIX, ZH * PIX
SS = 4  # supersampling when rasterizing the SVG


def _disjoint(a, b):
    return a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]


assert all(_disjoint(ZONES[a], ZONES[b]) for a, b in (("title", "ridge"), ("title", "chart"), ("ridge", "chart")))

# colors in the SVG -> textures (0 dots, 1 horizontal lines, 2 vertical lines); black = solid
PALETTE = ["#ff9999", "#66b3ff", "#99ff99"]
REFS = np.array([to_rgb("white")] + [to_rgb(c) for c in PALETTE] + [(0, 0, 0)])

# ----------------------------------------------------------------- braille
BRAILLE = {
    " ": "", "a": "1", "b": "12", "c": "14", "d": "145", "e": "15", "f": "124", "g": "1245",
    "h": "125", "i": "24", "j": "245", "k": "13", "l": "123", "m": "134", "n": "1345", "o": "135",
    "p": "1234", "q": "12345", "r": "1235", "s": "234", "t": "2345", "u": "136", "v": "1236",
    "w": "2456", "x": "1346", "y": "13456", "z": "1356",
    ".": "256", "-": "36", ":": "25", ",": "2",
}
NUMBER_SIGN = "3456"


def braille_cells(text):
    """Text -> list of dot strings. Digits are a-j behind a number sign."""
    out, in_num = [], False
    for ch in text.lower():
        if ch.isdigit():
            if not in_num:
                out.append(NUMBER_SIGN)
                in_num = True
            out.append(BRAILLE["jabcdefghi"[int(ch)]])
            continue
        if ch not in BRAILLE:
            raise ValueError(f"unsupported character {ch!r}")
        out.append(BRAILLE[ch])
        in_num = in_num and ch == "."  # a decimal point keeps number mode
    return out


def line_cells(text):
    cells = braille_cells(text)
    if len(cells) > MAX_CELLS:
        raise ValueError(f"{text!r} needs {len(cells)} braille cells, maximum is {MAX_CELLS}")
    return cells


def braille_mask(cells, x0, y0):
    """Full-plate mask of the dots for a row of cells whose lower-left corner is (x0, y0)."""
    m = np.zeros((NY, NX), bool)
    for n, dots in enumerate(cells):
        for d in dots:
            col, row = divmod(int(d) - 1, 3)
            x, y = x0 + n * CELL + col * SP, y0 + (2 - row) * SP
            if x < 0 or y < 0 or x + DOT > NX or y + DOT > NY:
                raise OverlapError("braille falls off the plate")
            m[y:y + DOT, x:x + DOT] = True
    return m


# ----------------------------------------------------------------- canvas with overlap protection
class OverlapError(ValueError):
    pass


class Canvas:
    def __init__(self):
        xs, ys = (np.arange(NX) + 0.5) * PIX, (np.arange(NY) + 0.5) * PIX
        self.valid = xs[None, :] - ys[:, None] + (PLATE_H - CHAMFER) >= 0  # chamfer, top-left
        self.h = np.where(self.valid, BASE_T, np.nan)
        self.owner = np.zeros((NY, NX), int)
        self.names = [None]

    def free(self, x0, y0, w, h, pad=0):
        return not self.owner[max(y0 - pad, 0):y0 + h + pad, max(x0 - pad, 0):x0 + w + pad].any()

    def claim(self, mask, z, name, zone):
        ys, xs = np.nonzero(mask)
        x0, y0, x1, y1 = zone
        if len(xs) and (xs.min() < x0 or xs.max() >= x1 or ys.min() < y0 or ys.max() >= y1):
            raise OverlapError(f"{name} falls outside its zone")
        if (mask & ~self.valid).any():
            raise OverlapError(f"{name} falls off the plate")
        hit = mask & (self.owner > 0)
        if hit.any():
            raise OverlapError(f"{name} overlaps {self.names[self.owner[hit][0]]}")
        self.names.append(name)
        self.h[mask] = z
        self.owner[mask] = len(self.names) - 1


def rect_mask(zone):
    m = np.zeros((NY, NX), bool)
    m[zone[1]:zone[3], zone[0]:zone[2]] = True
    return m


# ----------------------------------------------------------------- SVG -> relief
def new_figure():
    """A matplotlib figure exactly the size of the drawing zone; 1 data unit = 1 mm."""
    fig = plt.figure(figsize=(ZW_MM / 25.4, ZH_MM / 25.4))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, ZW_MM)
    ax.set_ylim(0, ZH_MM)
    ax.axis("off")
    return fig, ax


def figure_svg(fig):
    buf = io.StringIO()
    fig.savefig(buf, format="svg")
    plt.close(fig)
    return buf.getvalue()


def rasterize(svg):
    """SVG -> (ZH, ZW) class grid, row 0 = bottom: -1 background, 0-2 texture, 3 solid."""
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=ZW * SS, output_height=ZH * SS,
                           background_color="white")
    img = plt.imread(io.BytesIO(png), format="png")[..., :3]
    img = img.reshape(ZH, SS, ZW, SS, 3).mean(axis=(1, 3))  # average down to 0.5 mm pixels
    cls = np.argmin(((img[:, :, None, :] - REFS) ** 2).sum(-1), axis=2)
    return cls[::-1] - 1


def relief_mask(cls):
    yy, xx = np.mgrid[0:ZH, 0:ZW]
    patterns = ((xx % 6 < 3) & (yy % 6 < 3), yy % 4 < 2, xx % 4 < 2)  # dots, h-lines, v-lines
    raised = cls == 3
    for t, p in enumerate(patterns):
        raised |= (cls == t) & p
    m = np.zeros((NY, NX), bool)
    m[ZY0:ZY0 + ZH, ZX0:ZX0 + ZW] = raised
    return m


def texture_indices(n):
    """Colour indices 0-2 so that no neighbours match, including last/first."""
    if n < 3:
        raise ValueError("a donut needs at least 3 items")
    idx = [0, 1]
    for i in range(2, n):
        banned = {idx[-1]} | ({idx[0]} if i == n - 1 else set())
        idx.append(next(c for c in range(3) if c not in banned))
    return idx


def fmt_value(v):
    s = str(int(v)) if float(v).is_integer() else str(v)
    if len(s) > MAX_VALUE:
        raise ValueError(f"value {s} is longer than {MAX_VALUE} characters")
    return s


# ----------------------------------------------------------------- charts
class Chart:
    """Shared machinery. Subclasses supply _svg(), _lines() and (optionally) _place_labels()."""

    def __init__(self, title):
        self.title = title
        line_cells(title)  # validates characters and length
        lines = self._lines()
        if len(lines) > (CAP_Y1 - MG - GLYPH_H) // LINE + 1:
            raise ValueError("too many label lines for the back plate")
        for line in lines:
            line_cells(line)
        self.svg_data = self._svg()

    def _place_labels(self, cv):
        pass

    def front_canvas(self):
        cv = Canvas()
        cv.claim(rect_mask(ZONES["ridge"]), RULE_T, "ridge", ZONES["ridge"])
        cells = line_cells(self.title)
        x0 = MG + (ZW - ((MAX_CELLS - 1) * CELL + GLYPH_W)) // 2 + ((MAX_CELLS - len(cells)) // 2) * CELL
        y0 = CAP_Y0 + (CAP_Y1 - CAP_Y0 - GLYPH_H) // 2
        cv.claim(braille_mask(cells, x0, y0), TOP_T, "title", ZONES["title"])
        cv.claim(relief_mask(rasterize(self.svg_data)), TOP_T, "chart", ZONES["chart"])
        self._place_labels(cv)
        return cv

    def back_canvas(self):
        cv = Canvas()
        x0 = MG + (ZW - ((MAX_CELLS - 1) * CELL + GLYPH_W)) // 2
        for k, line in enumerate(self._lines()):
            mask = braille_mask(line_cells(line), x0, CAP_Y1 - GLYPH_H - k * LINE)
            cv.claim(mask, TOP_T, f"line {k}", ZONES["text"])
        return cv

    def save(self, stem):
        """Writes <stem>_front.stl and <stem>_back.stl."""
        paths = []
        for side, cv in (("front", self.front_canvas()), ("back", self.back_canvas())):
            V, F = build_mesh(cv.h)
            path = f"{stem}_{side}.stl"
            with open(path, "wb") as f:
                f.write(stl_bytes(V, F, f"TactoRead {side}"))
            report = check_watertight(V, F)
            print(path, report)
            paths.append(path)
        return paths


class _Ranked(Chart):
    """Donut and bar: a few labelled non-negative values."""
    MIN_N = 1

    def __init__(self, title, labels, values):
        labels, values = [str(x) for x in labels], [float(v) for v in values]
        if len(labels) != len(values):
            raise ValueError(f"labels and values must be the same length ({len(labels)} vs {len(values)})")
        if not self.MIN_N <= len(values) <= MAX_ENTRIES:
            raise ValueError(f"need between {self.MIN_N} and {MAX_ENTRIES} entries")
        if any(len(l) > MAX_LABEL for l in labels):
            raise ValueError(f"labels are limited to {MAX_LABEL} characters")
        if any(v < 0 for v in values) or sum(values) <= 0:
            raise ValueError("values must be non-negative and not all zero")
        self.labels, self.values = labels, values
        self._check()
        super().__init__(title)

    def _check(self):
        pass

    def _lines(self):
        return [f"{i} {l} {fmt_value(v)}" for i, (l, v) in enumerate(zip(self.labels, self.values))]

    @classmethod
    def from_csv(cls, filename, title):
        """CSV with a header row (labels) and exactly one data row (values)."""
        with open(filename, newline="", encoding="utf-8") as f:
            rows = list(csv.reader(f))
        if len(rows) != 2:
            raise ValueError("expected a header row and exactly one data row")
        return cls(title, rows[0], [float(x) for x in rows[1]])

    def _stamp(self, cv, i, x0, y0):
        cv.claim(braille_mask(braille_cells(str(i)), x0, y0), TOP_T, f"number {i}", ZONES["chart"])


class Donut(_Ranked):
    MIN_N = 3
    CX, CY, R, W = ZW_MM / 2, ZH_MM / 2, 14.0, 6.3  # mm; small enough that numbers fit above/below

    def _check(self):
        if any(v <= 0 for v in self.values):
            raise ValueError("donut values must be greater than zero")

    def _svg(self):
        fig, ax = new_figure()
        total, angle = sum(self.values), 90.0
        for v, c in zip(self.values, texture_indices(len(self.values))):
            sweep = 360 * v / total
            ax.add_patch(Wedge((self.CX, self.CY), self.R, angle, angle + sweep, width=self.W,
                               fc=PALETTE[c], ec="white", lw=3))
            angle += sweep
        return figure_svg(fig)

    def _place_labels(self, cv):
        """Index numbers just outside the ring, at each segment's mid-angle."""
        total, done = sum(self.values), 0.0
        for i, v in enumerate(self.values):
            mid = math.radians(90 + 360 * (done + v / 2) / total)
            done += v
            c, s = math.cos(mid), math.sin(mid)
            w, h = (len(braille_cells(str(i))) - 1) * CELL + GLYPH_W, GLYPH_H
            reach = abs(c) * w / 2 + abs(s) * h / 2  # how far the box sticks out along this direction
            for extra in (0, 4, 8, 12):
                d = px(self.R) + px(1.5) + reach + extra
                x0 = round(ZX0 + px(self.CX) + d * c - w / 2)
                y0 = round(ZY0 + px(self.CY) + d * s - h / 2)
                inside = ZX0 <= x0 and x0 + w <= ZX0 + ZW and ZY0 <= y0 and y0 + h <= ZY0 + ZH
                if inside and cv.free(x0, y0, w, h, pad=2):
                    break
            else:
                raise OverlapError(f"no room for number {i} next to its segment (segments too small)")
            self._stamp(cv, i, x0, y0)


class Bar(_Ranked):
    BASE, TOP, SIDE = 9.5, 44.0, 4.0  # baseline height, tallest bar, side margin (mm)

    def _slot(self):
        return (ZW_MM - 2 * self.SIDE) / len(self.values)

    def _svg(self):
        fig, ax = new_figure()
        slot, top = self._slot(), max(self.values)
        xs = [self.SIDE + slot * (i + 0.5) for i in range(len(self.values))]
        hs = [v / top * (self.TOP - self.BASE) for v in self.values]
        ax.bar(xs, hs, bottom=self.BASE, width=min(0.6 * slot, 14), color="black")
        ax.plot([2, ZW_MM - 2], [self.BASE] * 2, color="black", lw=4, solid_capstyle="butt")
        return figure_svg(fig)

    def _place_labels(self, cv):
        """Index number centred under each bar."""
        for i in range(len(self.values)):
            w = (len(braille_cells(str(i))) - 1) * CELL + GLYPH_W
            cx = px(self.SIDE + self._slot() * (i + 0.5))
            self._stamp(cv, i, ZX0 + cx - w // 2, ZY0 + px(1.5))


class Scatter(Chart):
    L, R, B, T = 6.0, 84.0, 6.0, 43.0  # axes box (mm)

    def __init__(self, title, labels, x_values, y_values, trendline=False, degree=1):
        if len(labels) != 2:
            raise ValueError("labels must be [x_label, y_label]")
        if len(x_values) != len(y_values) or len(x_values) < 2:
            raise ValueError("need matching x and y values, at least 2 points")
        x_values, y_values = [float(v) for v in x_values], [float(v) for v in y_values]
        if np.ptp(x_values) == 0 or np.ptp(y_values) == 0:
            raise ValueError("x and y values must each vary")
        if trendline and len(set(x_values)) <= degree:
            raise ValueError(f"a degree-{degree} trendline needs at least {degree + 1} distinct x values")
        self.labels = [str(l) for l in labels]
        self.x_values, self.y_values = x_values, y_values
        self.trendline, self.degree = trendline, degree
        super().__init__(title)

    def _lines(self):
        return [f"x: {self.labels[0]}", f"y: {self.labels[1]}"]

    def _svg(self):
        xs, ys = self.x_values, self.y_values
        if self.trendline:
            lx = np.linspace(min(xs), max(xs), 200)
            ly = np.polyval(np.polyfit(xs, ys, self.degree), lx)
        ylo, yhi = min(ys + (list(ly) if self.trendline else [])), max(ys + (list(ly) if self.trendline else []))
        fx = lambda v: self.L + 5 + (v - min(xs)) / (max(xs) - min(xs)) * (self.R - self.L - 10)
        fy = lambda v: self.B + 5 + (v - ylo) / (yhi - ylo) * (self.T - self.B - 10)
        fig, ax = new_figure()
        ax.plot([self.L, self.L, self.R], [self.T, self.B, self.B], color="black", lw=4,
                solid_joinstyle="miter")
        ax.scatter([fx(v) for v in xs], [fy(v) for v in ys], s=110, color="black")
        if self.trendline:
            ax.plot([fx(v) for v in lx], [fy(v) for v in ly], color="black", lw=4, linestyle=(0, (3, 2)))
        return figure_svg(fig)

    @classmethod
    def from_csv(cls, filename, title, trendline=False, degree=1):
        """CSV with exactly two columns (x, y); the headers are the axis labels."""
        with open(filename, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            if not headers or len(headers) != 2:
                raise ValueError("scatter CSV needs exactly 2 columns (x, y)")
            rows = [(float(r[headers[0]]), float(r[headers[1]])) for r in reader]
        return cls(title, headers, [r[0] for r in rows], [r[1] for r in rows], trendline, degree)


def from_data(filename, kind, title, trendline=False):
    if kind == "scatter":
        return Scatter.from_csv(filename, title, trendline)
    return {"donut": Donut, "bar": Bar}[kind].from_csv(filename, title)


# ----------------------------------------------------------------- mesh + STL
def build_mesh(h):
    """Height grid (NaN = no plate) -> (vertices, triangles). One column per pixel."""
    V, F, index = [], [], {}

    def vert(x, y, z):
        key = (round(x, 6), round(y, 6), round(z, 6))
        if key not in index:
            index[key] = len(V)
            V.append(key)
        return index[key]

    ny, nx = h.shape
    for j in range(ny):
        for i in range(nx):
            z = h[j, i]
            if np.isnan(z):
                continue
            x0, x1, y0, y1 = i * PIX, (i + 1) * PIX, j * PIX, (j + 1) * PIX
            c = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
            t, b = [vert(x, y, z) for x, y in c], [vert(x, y, 0.0) for x, y in c]
            F += [(t[0], t[1], t[2]), (t[0], t[2], t[3]), (b[2], b[1], b[0]), (b[3], b[2], b[0])]
            # walls only on the side of a lower neighbour (or the plate edge)
            for k, (di, dj) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0))):
                ni, nj = i + di, j + dj
                nz = h[nj, ni] if 0 <= ni < nx and 0 <= nj < ny else np.nan
                nz = 0.0 if np.isnan(nz) else nz
                if nz < z - 1e-9:
                    a, e = c[k], c[(k + 1) % 4]
                    F += [(vert(*a, nz), vert(*e, nz), vert(*e, z)), (vert(*a, nz), vert(*e, z), vert(*a, z))]
    return np.array(V, float), np.array(F, int)


def check_watertight(V, F):
    directed, undirected = Counter(), Counter()
    for a, b, c in F:
        for e in ((a, b), (b, c), (c, a)):
            directed[e] += 1
            undirected[tuple(sorted(e))] += 1
    return dict(
        n_vertices=len(V), n_triangles=len(F),
        every_edge_twice=all(n == 2 for n in undirected.values()),
        consistent_winding=all(n == 1 for n in directed.values()),
    )


_STL_RECORD = np.dtype([("normal", "<f4", 3), ("verts", "<f4", (3, 3)), ("attr", "<u2")])


def stl_bytes(V, F, name="TactoRead"):
    corners = V[F]
    normals = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    records = np.zeros(len(F), dtype=_STL_RECORD)
    records["normal"] = normals / np.where(lengths == 0, 1, lengths)
    records["verts"] = corners
    return name.encode()[:80].ljust(80, b"\0") + np.array([len(F)], "<u4").tobytes() + records.tobytes()


# ----------------------------------------------------------------- examples
if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    Donut("Pets", ["Dogs", "Cats", "Fish", "Birds"], [45, 30, 15, 10]).save("out/donut")
    Bar("Rain mm", ["Jan", "Feb", "Mar", "Apr", "May"], [80, 65, 90, 40, 20]).save("out/bar")
    Scatter("Study vs score", ["Hours", "Score"], [1, 2, 3, 4, 5, 6, 7],
            [52, 58, 61, 70, 74, 83, 88], trendline=True).save("out/scatter")
    # From CSV instead:
    #   Donut.from_csv("test.csv", "My title").save("out/mine")
    #   Scatter.from_csv("test_scatter.csv", "My title", trendline=True).save("out/mine")