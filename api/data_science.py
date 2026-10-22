"""Chart data -> tactile donut, bar or scatter chart on a TactoRead card."""

import csv
import math

import numpy as np

try:
    from . import stl
except ImportError:  # run directly as a script
    import stl

# Sizes in mm (heights are above the floor)
AXIS_W = 1.6  # axes and bar baseline
AXIS_H = 2.0
BAR_H = 1.5  # bars sit lower than their baseline so it stays easy to find
POINT_D = 3.0  # scatter point
POINT_H = 2.0
TREND_W = 1.0  # dashed trendline: thinner and lower than the axes
TREND_H = 1.2
DASH, DASH_GAP = 3.0, 2.0
TEX_H = 1.2  # donut segment textures
TEX_PITCH = 2.5
TEX_W = 1.0  # texture line width / dot diameter
EDGE = 0.6  # sloped rim of filled shapes (bars, donut segments)
R_OUT, R_IN = 13.5, 7.0  # donut ring
SEG_GAP = 1.5  # bare floor between donut segments
LABEL_GAP = 1.2  # bare floor around braille numbers
PAD = 1.5  # keep-out from the drawing-area edge
POWER = 3.0  # ridge profile: flat crest, steep walls
RES = 0.2  # height-field grid spacing
MAX_ITEMS = 5

# Drawing box in card coordinates
X0, X1 = stl.MARGIN + PAD, stl.PLATE_W - stl.MARGIN - PAD
Y0, Y1 = stl.DRAW_BOT + PAD, stl.DRAW_TOP - PAD

# Braille: stl.BRAILLE plus digits (a-j after a number sign) and a few marks
CHARS = {**stl.BRAILLE, ".": "256", "-": "36", ":": "25"}
NUMBER_SIGN = "3456"
LINE_H = 2 * stl.DOT_SP + stl.DOT_D  # height of a braille line
NUM_W = stl.BR_CELL + stl.DOT_SP + stl.DOT_D  # width of an index number (sign + digit)


def braille_cells(text):
    cells, in_num = [], False
    for ch in text.lower():
        if ch.isdigit():
            if not in_num:
                cells.append(NUMBER_SIGN)
            cells.append(CHARS["jabcdefghi"[int(ch)]])
            in_num = True
        else:
            cells.append(CHARS[ch])
            in_num = in_num and ch == "."  # a decimal point keeps number mode
    return cells


def braille_dots(text, x0, y0):
    """Dot centres for a braille line whose lower-left corner is (x0, y0)."""
    r = stl.DOT_D / 2
    return [
        (x0 + r + i * stl.BR_CELL + col * stl.DOT_SP, y0 + r + (2 - row) * stl.DOT_SP)
        for i, dots in enumerate(braille_cells(text))
        for col, row in (divmod(int(d) - 1, 3) for d in dots)
    ]


# Height-field helpers
def _profile(s, r, height):
    """Height at distance s inside an edge: 0 at the edge, full height from r inwards."""
    u = np.clip(1.0 - s / r, 0.0, 1.0)
    return height * (1.0 - u**POWER) ** (1.0 / POWER)


def _seg_dist(px, py, a, b):
    """Distance from points (px, py) to segment a-b."""
    abx, aby = b[0] - a[0], b[1] - a[1]
    denom = abx * abx + aby * aby
    if denom < 1e-12:
        return np.hypot(px - a[0], py - a[1])
    t = np.clip(((px - a[0]) * abx + (py - a[1]) * aby) / denom, 0.0, 1.0)
    return np.hypot(px - (a[0] + t * abx), py - (a[1] + t * aby))


def _ridges(xs, ys, segs, width, height):
    """Height field of rounded ridges along segs (a segment a-a is a round bump)."""
    d = np.full((len(ys), len(xs)), np.inf)
    r = width / 2
    for a, b in segs:
        i0, i1 = (
            np.searchsorted(xs, min(a[0], b[0]) - r),
            np.searchsorted(xs, max(a[0], b[0]) + r, side="right"),
        )
        j0, j1 = (
            np.searchsorted(ys, min(a[1], b[1]) - r),
            np.searchsorted(ys, max(a[1], b[1]) + r, side="right"),
        )
        if i1 > i0 and j1 > j0:
            gx, gy = np.meshgrid(xs[i0:i1], ys[j0:j1])
            d[j0:j1, i0:i1] = np.minimum(d[j0:j1, i0:i1], _seg_dist(gx, gy, a, b))
    return _profile(r - d, r, height)


def _texture(gx, gy, kind):
    """0 = dots, 1 = horizontal lines, 2 = vertical lines."""
    dx = np.mod(gx, TEX_PITCH) - TEX_PITCH / 2
    dy = np.mod(gy, TEX_PITCH) - TEX_PITCH / 2
    d = (np.hypot(dx, dy), np.abs(dy), np.abs(dx))[kind]
    return _profile(TEX_W / 2 - d, TEX_W / 2, TEX_H)


def _pt(x, y):
    return np.array([x, y], float)


# Charts: each returns relief heights h[y, x] and braille numbers [(text, x0, y0)]
def _donut(xs, ys, values):
    """Textured ring segments, counter-clockwise from 12 o'clock, numbered outside."""
    if len(values) < 3 or min(values) <= 0:
        raise ValueError("a donut needs at least 3 values, all greater than zero")
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    gx, gy = np.meshgrid(xs - cx, ys - cy)
    r, theta = np.hypot(gx, gy), np.arctan2(gy, gx)
    kinds = [i % 3 for i in range(len(values))]
    if len(values) % 3 == 1:
        kinds[-1] = 1  # the last segment touches the first

    h, numbers, a0 = np.zeros_like(r), [], math.pi / 2
    for i, v in enumerate(values):
        sweep = 2 * math.pi * v / sum(values)
        if (R_IN + R_OUT) / 2 * sweep < SEG_GAP + 2.0:
            raise ValueError(f"segment {i} is too small to feel")
        phi = np.mod(theta - a0, 2 * math.pi)
        inside = np.minimum.reduce(
            [
                r - R_IN,
                R_OUT - r,
                r * phi - SEG_GAP / 2,
                r * (sweep - phi) - SEG_GAP / 2,
            ]
        )
        h = np.maximum(
            h, np.minimum(_texture(gx, gy, kinds[i]), _profile(inside, EDGE, TEX_H))
        )

        # Number just outside the ring, at the segment's mid-angle
        c, s = math.cos(a0 + sweep / 2), math.sin(a0 + sweep / 2)
        d = R_OUT + LABEL_GAP + abs(c) * NUM_W / 2 + abs(s) * LINE_H / 2
        numbers.append((str(i), cx + d * c - NUM_W / 2, cy + d * s - LINE_H / 2))
        a0 += sweep
    return h, numbers


def _bar(xs, ys, values):
    """Solid bars standing on a baseline ridge, numbered underneath."""
    slot = (X1 - X0) / len(values)
    base = Y0 + LINE_H + LABEL_GAP + AXIS_W / 2  # baseline just above the numbers
    foot, width = base + AXIS_W / 2, min(0.6 * slot, 14.0)
    gx, gy = np.meshgrid(xs, ys)

    h = _ridges(
        xs,
        ys,
        [(_pt(X0 + AXIS_W / 2, base), _pt(X1 - AXIS_W / 2, base))],
        AXIS_W,
        AXIS_H,
    )
    numbers = []
    for i, v in enumerate(values):
        cx = X0 + slot * (i + 0.5)
        top = foot + v / max(values) * (Y1 - foot)
        inside = np.minimum.reduce(
            [gx - cx + width / 2, cx + width / 2 - gx, gy - base, top - gy]
        )
        h = np.maximum(h, _profile(inside, EDGE, BAR_H))
        numbers.append((str(i), cx - NUM_W / 2, Y0))
    return h, numbers


def _scatter(xs, ys, x_values, y_values, trendline=False):
    """L-shaped axes, round points and an optional dashed straight-line fit."""
    x, y = np.asarray(x_values, float), np.asarray(y_values, float)
    if len(x) != len(y) or len(x) < 2 or np.ptp(x) == 0 or np.ptp(y) == 0:
        raise ValueError("need matching x and y values that both vary")
    ax, ay = X0 + AXIS_W / 2, Y0 + AXIS_W / 2  # axes corner
    axes = [
        (_pt(ax, Y1 - AXIS_W / 2), _pt(ax, ay)),
        (_pt(ax, ay), _pt(X1 - AXIS_W / 2, ay)),
    ]

    lo, hi = y.min(), y.max()
    if trendline:
        ends = np.polyval(np.polyfit(x, y, 1), [x.min(), x.max()])
        lo, hi = min(lo, ends.min()), max(hi, ends.max())
    inset = AXIS_W + POINT_D  # points stay clear of the axes

    def card(u, v):
        return np.column_stack(
            [
                np.interp(u, [x.min(), x.max()], [ax + inset, X1 - inset]),
                np.interp(v, [lo, hi], [ay + inset, Y1 - inset]),
            ]
        )

    h = _ridges(xs, ys, axes, AXIS_W, AXIS_H)
    h = np.maximum(h, _ridges(xs, ys, [(p, p) for p in card(x, y)], POINT_D, POINT_H))
    if trendline:
        p, q = card([x.min(), x.max()], ends)
        length = np.linalg.norm(q - p)
        u = (q - p) / length
        dashes = [
            (p + s * u, p + min(s + DASH, length) * u)
            for s in np.arange(0, length, DASH + DASH_GAP)
        ]
        h = np.maximum(h, _ridges(xs, ys, dashes, TREND_W, TREND_H))
    return h


def chart_relief(kind, values, x_values=None, trendline=False):
    """Return grid xs, ys over the drawing area, relief heights h[y, x] and braille numbers."""
    xs = np.linspace(
        stl.MARGIN, stl.PLATE_W - stl.MARGIN, round(stl.USABLE_W / RES) + 1
    )
    ys = np.linspace(stl.DRAW_BOT, stl.DRAW_TOP, round(stl.DRAW_H / RES) + 1)

    if kind == "scatter":
        h, numbers = _scatter(xs, ys, x_values, values, trendline), []
    elif kind in ("donut", "bar"):
        if not 1 <= len(values) <= MAX_ITEMS or min(values) < 0 or sum(values) <= 0:
            raise ValueError(f"need 1 to {MAX_ITEMS} non-negative values, not all zero")
        h, numbers = (_donut if kind == "donut" else _bar)(xs, ys, values)
    else:
        raise ValueError(f"unknown chart kind {kind!r}")

    # Numbers must stay inside the drawing box and apart from each other
    for k, (_, x, y) in enumerate(numbers):
        inside = X0 <= x and x + NUM_W <= X1 and Y0 <= y and y + LINE_H <= Y1
        crowded = any(
            abs(x - bx) < NUM_W + LABEL_GAP and abs(y - by) < LINE_H + LABEL_GAP
            for _, bx, by in numbers[:k]
        )
        if not inside or crowded:
            raise ValueError("no room for the braille numbers (segments too small)")

    h[0, :] = h[-1, :] = h[:, 0] = h[:, -1] = 0.0
    return xs, ys, h, numbers


def _relief_shell(xs, ys, h):
    """Watertight solid: height-field top, flat bottom at z=0 (like the braille dots)."""
    nx, ny = len(xs), len(ys)
    gx, gy = np.meshgrid(xs, ys)
    top = np.column_stack([gx.ravel(), gy.ravel(), stl.BASE_T + h.ravel()])

    # Two triangles per cell, split along the flatter diagonal
    j, i = np.mgrid[0 : ny - 1, 0 : nx - 1]
    v00 = (j * nx + i).ravel()
    v10, v01, v11 = v00 + 1, v00 + nx, v00 + nx + 1
    hf = h.ravel()
    diag = np.abs(hf[v00] - hf[v11]) <= np.abs(hf[v10] - hf[v01])
    tris = [
        np.column_stack(c)[m]
        for c, m in (
            ((v00, v10, v11), diag),
            ((v00, v11, v01), diag),
            ((v00, v10, v01), ~diag),
            ((v10, v11, v01), ~diag),
        )
    ]

    # Walls and bottom fan around the boundary (counter-clockwise from above)
    ring = np.array(
        list(range(nx))
        + [j * nx + nx - 1 for j in range(1, ny)]
        + [(ny - 1) * nx + i for i in range(nx - 2, -1, -1)]
        + [j * nx for j in range(ny - 2, 0, -1)]
    )
    n, m = len(top), len(ring)
    bottom = top[ring] * [1, 1, 0]
    V = np.vstack([top, bottom, [[xs.mean(), ys.mean(), 0.0]]])
    a_top, b_top = ring, np.roll(ring, -1)
    a_bot = n + np.arange(m)
    b_bot = np.roll(a_bot, -1)
    tris += [
        np.column_stack([a_bot, b_bot, b_top]),
        np.column_stack([a_bot, b_top, a_top]),
        np.column_stack([np.full(m, n + m), b_bot, a_bot]),
    ]
    return V, np.concatenate(tris).astype(int)


def _dots_mesh(centres):
    """Braille dots, the same as the title's."""
    mesh = stl._MeshBuilder()
    for cx, cy in centres:
        stl._add_dot(mesh, cx, cy)
    return mesh.arrays()


def _combine(*meshes):
    """Stack (V, F) meshes into one, skipping empty ones."""
    meshes = [(V, F) for V, F in meshes if len(F)]
    offsets = np.cumsum([0] + [len(V) for V, _ in meshes])
    return np.vstack([V for V, _ in meshes]), np.vstack(
        [F + o for (_, F), o in zip(meshes, offsets)]
    )


def build_chart_mesh(kind, values, title="", x_values=None, trendline=False):
    """Card + braille title + chart relief + braille numbers, as (V, F) like stl.build_mesh."""
    xs, ys, h, numbers = chart_relief(kind, values, x_values, trendline)
    dots = [p for text, x, y in numbers for p in braille_dots(text, x, y)]
    return _combine(stl.build_mesh(title), _relief_shell(xs, ys, h), _dots_mesh(dots))


def build_key_mesh(lines, title=""):
    """Card + braille title + one braille line per entry, from the top of the drawing area."""
    if len(lines) > MAX_ITEMS or any(
        len(braille_cells(l)) > stl.CAPTION_CELLS for l in lines
    ):
        raise ValueError(f"key allows {MAX_ITEMS} lines of {stl.CAPTION_CELLS} cells")
    dots = []
    for k, line in enumerate(lines):
        dots += braille_dots(line, stl.MARGIN, stl.DRAW_TOP - LINE_H - k * stl.BR_LINE)
    return _combine(stl.build_mesh(title), _dots_mesh(dots))


def key_lines(labels, values):
    """Key text for donut and bar charts: "0 dogs 45"."""
    return [f"{i} {label} {v:g}" for i, (label, v) in enumerate(zip(labels, values))]


def read_csv(path):
    """Header row and the columns below it, as floats."""
    with open(path, newline="", encoding="utf-8") as f:
        header, *rows = list(csv.reader(f))
    return header, [[float(v) for v in col] for col in zip(*rows)]


def chart_card_stl(kind, values, title="", x_values=None, trendline=False):
    return stl.stl_bytes(
        *build_chart_mesh(kind, values, title, x_values, trendline),
        name=f"TactoRead {title or kind}"[:80],
    )


def key_card_stl(lines, title=""):
    return stl.stl_bytes(
        *build_key_mesh(lines, title), name=f"TactoRead key {title}"[:80]
    )


if __name__ == "__main__":
    pets, counts = ["Dogs", "Cats", "Fish", "Birds"], [45, 30, 15, 10]
    with open("api/donut.stl", "wb") as f:
        f.write(chart_card_stl("donut", counts, "Pets"))
    with open("api/donut_key.stl", "wb") as f:
        f.write(key_card_stl(key_lines(pets, counts), "Pets"))

    with open("api/bar.stl", "wb") as f:
        f.write(chart_card_stl("bar", [80, 65, 90, 40, 20], "Rain mm"))

    with open("api/scatter.stl", "wb") as f:
        f.write(
            chart_card_stl(
                "scatter",
                [52, 58, 61, 70, 74, 83, 88],
                "Study vs score",
                x_values=[1, 2, 3, 4, 5, 6, 7],
                trendline=True,
            )
        )

    # From a CSV (header = labels, one row of values):
    #   labels, cols = read_csv("test.csv")
    #   chart_card_stl("bar", [c[0] for c in cols], "My title")
