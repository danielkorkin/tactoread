"""SMILES -> tactile bond-line lithophane on a TactoRead card."""

import math

import numpy as np
from rdkit import Chem
from rdkit.Chem import rdDepictor

try:
    from . import stl
except ImportError:  # run directly as a script
    import stl

# Sizes in mm
BOND_W = 1.6  # ridge width
BOND_H = 2.0  # ridge height above the floor
DOUBLE_W = 3.2  # double bond: one ridge, twice as wide
DOUBLE_H = 2.0  # raise (e.g. 2.6) to make double bonds taller as well
TRIPLE_W = 4.8  # triple bond: one ridge, three times as wide
TRIPLE_H = 2.0
RIB_W = 1.0  # small ridge along the top of a double bond (two on a triple bond)
RIB_H = 0.6  # how far a rib sticks up above its bond
TRIPLE_RIB_OFF = 1.0  # the two triple-bond ribs sit this far either side of centre
LABEL_W = 1.1  # letter stroke width
LABEL_H = 1.4  # letters sit lower than bonds so they feel different
LABEL_GAP = 1.2  # bare floor between a bond end and a letter
LABEL_CLEAR = BOND_W / 2 + LABEL_W / 2 + LABEL_GAP
DOUBLE_CLEAR = DOUBLE_W / 2 + LABEL_W / 2 + LABEL_GAP
TRIPLE_CLEAR = TRIPLE_W / 2 + LABEL_W / 2 + LABEL_GAP
CAP_MIN, CAP_MAX = 4.5, 6.5  # letter height (half the bond length, clamped)
BOND_MIN, BOND_MAX = 8.0, 14.0
PAD = 1.5  # keep-out from the drawing-area edge
POWER = 3.0  # ridge profile: flat crest, steep walls
RES = 0.2  # height-field grid spacing


# Stroke font: polylines in cap-height units, a single point is a round bump
def _arc(cx, cy, rx, ry, a0, a1, n=16):
    t = np.radians(np.linspace(a0, a1, n))
    return [(cx + rx * math.cos(a), cy + ry * math.sin(a)) for a in t]


def _scaled(glyph, sx, sy):
    width, polys = glyph
    return width * sx, [[(x * sx, y * sy) for x, y in p] for p in polys]


XH = 0.72  # lowercase x-height
_S = (
    0.66,
    [
        [
            (0.66, 0.86),
            (0.52, 0.98),
            (0.18, 0.98),
            (0.03, 0.84),
            (0.05, 0.64),
            (0.20, 0.54),
            (0.48, 0.46),
            (0.63, 0.36),
            (0.66, 0.17),
            (0.50, 0.02),
            (0.16, 0.02),
            (0.00, 0.14),
        ]
    ],
)

GLYPHS = {
    "A": (0.74, [[(0, 0), (0.37, 1), (0.74, 0)], [(0.14, 0.36), (0.60, 0.36)]]),
    "B": (
        0.66,
        [
            [
                (0, 0),
                (0, 1),
                (0.38, 1),
                (0.56, 0.93),
                (0.60, 0.77),
                (0.55, 0.60),
                (0.38, 0.53),
                (0, 0.53),
            ],
            [(0.38, 0.53), (0.58, 0.46), (0.66, 0.28), (0.60, 0.08), (0.42, 0), (0, 0)],
        ],
    ),
    "C": (0.80, [_arc(0.40, 0.50, 0.40, 0.50, 45, 315, 18)]),
    "E": (0.62, [[(0.62, 1), (0, 1), (0, 0), (0.62, 0)], [(0, 0.52), (0.50, 0.52)]]),
    "F": (0.62, [[(0.62, 1), (0, 1), (0, 0)], [(0, 0.53), (0.48, 0.53)]]),
    "H": (0.70, [[(0, 0), (0, 1)], [(0.70, 0), (0.70, 1)], [(0, 0.5), (0.70, 0.5)]]),
    "I": (0.44, [[(0, 1), (0.44, 1)], [(0.22, 1), (0.22, 0)], [(0, 0), (0.44, 0)]]),
    "K": (0.68, [[(0, 0), (0, 1)], [(0.66, 1), (0, 0.38)], [(0.22, 0.58), (0.68, 0)]]),
    "L": (0.58, [[(0, 1), (0, 0), (0.58, 0)]]),
    "M": (0.84, [[(0, 0), (0, 1), (0.42, 0.38), (0.84, 1), (0.84, 0)]]),
    "N": (0.70, [[(0, 0), (0, 1), (0.70, 0), (0.70, 1)]]),
    "O": (0.80, [_arc(0.40, 0.50, 0.40, 0.50, 0, 360, 28)]),
    "P": (
        0.66,
        [
            [
                (0, 0),
                (0, 1),
                (0.42, 1),
                (0.60, 0.93),
                (0.66, 0.76),
                (0.60, 0.59),
                (0.42, 0.52),
                (0, 0.52),
            ]
        ],
    ),
    "S": _S,
    "Z": (0.70, [[(0, 1), (0.70, 1), (0, 0), (0.70, 0)]]),
    "a": _scaled(
        (0.66, [[(0.66, 1), (0.66, 0)], _arc(0.33, 0.5, 0.33, 0.5, 0, 360, 20)]), 1, XH
    ),
    "e": _scaled(
        (0.70, [[(0, 0.5), (0.70, 0.5)] + _arc(0.35, 0.5, 0.35, 0.5, 0, 320, 16)]),
        1,
        XH,
    ),
    "g": _scaled(
        (
            0.66,
            [
                [(0.66, 1), (0.66, -0.15)] + _arc(0.33, -0.15, 0.33, 0.3, 0, -170, 10),
                _arc(0.33, 0.52, 0.33, 0.48, 0, 360, 20),
            ],
        ),
        1,
        XH,
    ),
    "i": (0.05, [[(0, 0), (0, XH)], [(0, XH + 0.3)]]),
    "l": (0.05, [[(0, 0), (0, 1)]]),
    "n": _scaled(
        (
            0.66,
            [
                [(0, 0), (0, 1)],
                [(0, 0.6)] + _arc(0.33, 0.6, 0.33, 0.4, 180, 0, 10) + [(0.66, 0)],
            ],
        ),
        1,
        XH,
    ),
    "r": _scaled(
        (0.55, [[(0, 0), (0, 1)], [(0, 0.6)] + _arc(0.4, 0.6, 0.4, 0.4, 180, 70, 7)]),
        1,
        XH,
    ),
    "s": _scaled(_S, XH, XH),
    "u": _scaled(
        (
            0.66,
            [
                [(0, 1), (0, 0.4)] + _arc(0.33, 0.4, 0.33, 0.4, 180, 360, 10),
                [(0.66, 1), (0.66, 0)],
            ],
        ),
        1,
        XH,
    ),
    "1": (0.48, [[(0.04, 0.8), (0.26, 1), (0.26, 0)], [(0.04, 0), (0.48, 0)]]),
    "2": (
        0.60,
        [
            [
                (0, 0.78),
                (0.12, 0.95),
                (0.32, 1.0),
                (0.52, 0.92),
                (0.60, 0.74),
                (0.52, 0.55),
                (0, 0),
                (0.60, 0),
            ]
        ],
    ),
    "3": (
        0.60,
        [
            [
                (0.02, 0.9),
                (0.20, 1.0),
                (0.45, 0.98),
                (0.58, 0.86),
                (0.56, 0.66),
                (0.40, 0.55),
                (0.22, 0.55),
            ],
            [
                (0.40, 0.55),
                (0.58, 0.44),
                (0.60, 0.20),
                (0.46, 0.03),
                (0.22, 0),
                (0, 0.10),
            ],
        ],
    ),
    "4": (0.62, [[(0.46, 0), (0.46, 1), (0, 0.32), (0.62, 0.32)]]),
    "+": (0.60, [[(0, 0.5), (0.60, 0.5)], [(0.30, 0.2), (0.30, 0.8)]]),
    "-": (0.60, [[(0, 0.5), (0.60, 0.5)]]),
}


def _seg_dist(px, py, a, b):
    """Distance from points (px, py) to segment a-b."""
    abx, aby = b[0] - a[0], b[1] - a[1]
    denom = abx * abx + aby * aby
    if denom < 1e-12:
        return np.hypot(px - a[0], py - a[1])
    t = np.clip(((px - a[0]) * abx + (py - a[1]) * aby) / denom, 0.0, 1.0)
    return np.hypot(px - (a[0] + t * abx), py - (a[1] + t * aby))


def _min_dist(points, segs):
    d = np.full(len(points), np.inf)
    for a, b in segs:
        d = np.minimum(d, _seg_dist(points[:, 0], points[:, 1], a, b))
    return d


def _trim(p, q, constraints):
    """Longest part of p-q that stays `required` away from each set of segments.
    (Not just trimming the ends: the hollow inside of an O counts as clear.)"""
    pts = p + np.linspace(0, 1, max(2, int(np.linalg.norm(q - p) / 0.05) + 1))[
        :, None
    ] * (q - p)
    ok = np.ones(len(pts), bool)
    for segs, required in constraints:
        if segs:
            ok &= _min_dist(pts, segs) >= required
    edges = np.diff(np.concatenate([[0], ok.astype(int), [0]]))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1) - 1
    if len(starts) == 0:
        return None
    k = np.argmax(ends - starts)
    return (pts[starts[k]], pts[ends[k]]) if ends[k] > starts[k] else None


def _needs_label(atom):
    return (
        atom.GetSymbol() != "C" or atom.GetFormalCharge() != 0 or atom.GetDegree() == 0
    )


def _label(atom, pos, neighbours, cap):
    """Label segments: element centred on the atom, H on the side away from bonds."""
    symbol, n_h, charge = atom.GetSymbol(), atom.GetTotalNumHs(), atom.GetFormalCharge()
    if neighbours:
        h_left = sum(n[0] - pos[0] for n in neighbours) > 1e-6
    else:
        h_left = symbol in {"O", "S", "Se", "F", "Cl", "Br", "I"}  # H2O, HCl but NH3

    elem = [(c, 1.0, 0.0) for c in symbol]
    hyd = (
        [("H", 1.0, 0.0)] + ([(str(n_h), 0.65, -0.3)] if n_h > 1 else []) if n_h else []
    )
    chg = []
    if charge:
        chg = ([(str(abs(charge)), 0.6, 0.6)] if abs(charge) > 1 else []) + [
            ("+" if charge > 0 else "-", 0.6, 0.6)
        ]
    gap = max(0.3 * cap, LABEL_W + 1.0)

    def width(run):
        return (
            sum(GLYPHS[c][0] * cap * s for c, s, _ in run) + gap * (len(run) - 1)
            if run
            else 0.0
        )

    segs = []

    def place(run, x):
        for c, s, dy in run:
            w, polys = GLYPHS[c]
            for poly in polys:
                pts = [
                    np.array(
                        [
                            pos[0] + x + px * cap * s,
                            pos[1] - cap / 2 + dy * cap + py * cap * s,
                        ]
                    )
                    for px, py in poly
                ]
                segs.extend([(pts[0], pts[0])] if len(pts) == 1 else zip(pts, pts[1:]))
            x += w * cap * s + gap

    left = -width(elem) / 2
    right = left + width(elem)
    place(elem, left)
    if hyd and h_left:
        place(hyd, left - gap - width(hyd))
    elif hyd:
        place(hyd, right + gap)
        right += gap + width(hyd)
    if chg:
        place(chg, right + 0.6 * gap)
    return segs


def _geometry(mol, pos, bond_len):
    """Ridge centre-lines for single, double and triple bonds and letters."""
    cap = float(np.clip(0.5 * bond_len, CAP_MIN, CAP_MAX))
    labels = []
    for atom in mol.GetAtoms():
        if _needs_label(atom):
            nbs = [pos[n.GetIdx()] for n in atom.GetNeighbors()]
            labels += _label(atom, pos[atom.GetIdx()], nbs, cap)

    singles, doubles, triples = [], [], []
    for bond in mol.GetBonds():
        p, q = pos[bond.GetBeginAtomIdx()], pos[bond.GetEndAtomIdx()]
        order = int(round(bond.GetBondTypeAsDouble()))
        (triples if order == 3 else doubles if order == 2 else singles).append((p, q))

    # bonds stop short of letters
    singles = [seg for p, q in singles if (seg := _trim(p, q, [(labels, LABEL_CLEAR)]))]
    doubles = [
        seg for p, q in doubles if (seg := _trim(p, q, [(labels, DOUBLE_CLEAR)]))
    ]
    triples = [
        seg for p, q in triples if (seg := _trim(p, q, [(labels, TRIPLE_CLEAR)]))
    ]
    return singles, doubles, triples, labels


def _extent(*groups):
    """Bounding box of (segments, ridge_width) groups."""
    pts = np.array([pt for segs, _ in groups for seg in segs for pt in seg])
    pad = np.array([w / 2 for segs, w in groups for _ in segs for _ in (0, 1)])[:, None]
    return (pts - pad).min(axis=0), (pts + pad).max(axis=0)


def _shifted(segs, d):
    """Segments moved sideways by d."""
    out = []
    for a, b in segs:
        u = (b - a) / np.linalg.norm(b - a)
        n = d * np.array([-u[1], u[0]])
        out.append((a + n, b + n))
    return out


def layout(smiles):
    """Single, double, triple bond and letter segments in card coordinates (mm), plus the bond length."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Could not parse SMILES: {smiles!r}")
    mol = Chem.RemoveHs(mol)
    Chem.Kekulize(mol, clearAromaticFlags=True)

    rdDepictor.SetPreferCoordGen(True)
    rdDepictor.Compute2DCoords(mol)
    xy = mol.GetConformer().GetPositions()[:, :2]
    lengths = [
        np.linalg.norm(xy[b.GetBeginAtomIdx()] - xy[b.GetEndAtomIdx()])
        for b in mol.GetBonds()
    ]
    if lengths:
        xy = xy / float(np.median(lengths))
    xy = xy - xy.mean(axis=0)

    x0, x1 = stl.MARGIN + PAD, stl.PLATE_W - stl.MARGIN - PAD
    y0, y1 = stl.DRAW_BOT + PAD, stl.DRAW_TOP - PAD
    box = np.array([x1 - x0, y1 - y0])

    # Rotation giving the longest bonds (slightly preferring RDKit's own)
    pad = 0.62 if any(_needs_label(a) for a in mol.GetAtoms()) else 0.1
    best = -1.0
    for deg in range(180):
        th = math.radians(deg)
        p = (
            xy
            @ np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]]).T
        )
        span = np.ptp(p, axis=0) if len(p) > 1 else np.zeros(2)
        fit = min((box - BOND_W) / (span + 2 * pad))
        if fit * (1 - 0.001 * min(deg, 180 - deg)) > best:
            best, bond_len, rotated = fit * (1 - 0.001 * min(deg, 180 - deg)), fit, p
    bond_len = min(bond_len, BOND_MAX)

    # Shrink until the real labels fit too
    for _ in range(12):
        bonds, thick, wide, labels = _geometry(mol, rotated * bond_len, bond_len)
        lo, hi = _extent(
            (bonds, BOND_W), (thick, DOUBLE_W), (wide, TRIPLE_W), (labels, LABEL_W)
        )
        f = min(box / (hi - lo))
        if f >= 1:
            break
        bond_len *= f * 0.995
    if f < 1 or bond_len < BOND_MIN:
        raise ValueError(
            f"{smiles!r} only fits with {bond_len:.1f} mm bonds (minimum {BOND_MIN})"
        )

    shift = np.array([(x0 + x1) / 2, (y0 + y1) / 2]) - (lo + hi) / 2
    move = lambda segs: [(a + shift, b + shift) for a, b in segs]
    return move(bonds), move(thick), move(wide), move(labels), bond_len


def _ridges(xs, ys, segs, width, height):
    """Height field of rounded ridges along segs."""
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
    u = np.clip(d / r, 0.0, 1.0)
    return height * (1.0 - u**POWER) ** (1.0 / POWER)


def molecule_relief(smiles):
    """Return grid xs, ys and relief heights h[y, x] above the floor."""
    bonds, thick, wide, labels, _ = layout(smiles)
    lo, hi = _extent(
        (bonds, BOND_W), (thick, DOUBLE_W), (wide, TRIPLE_W), (labels, LABEL_W)
    )
    gx0, gx1 = max(stl.MARGIN, lo[0] - 1.0), min(stl.PLATE_W - stl.MARGIN, hi[0] + 1.0)
    gy0, gy1 = max(stl.DRAW_BOT, lo[1] - 1.0), min(stl.DRAW_TOP, hi[1] + 1.0)
    xs = np.linspace(gx0, gx1, max(3, math.ceil((gx1 - gx0) / RES) + 1))
    ys = np.linspace(gy0, gy1, max(3, math.ceil((gy1 - gy0) / RES) + 1))

    h = _ridges(xs, ys, bonds, BOND_W, BOND_H)
    if thick:
        h = np.maximum(h, _ridges(xs, ys, thick, DOUBLE_W, DOUBLE_H))
        h = np.maximum(h, _ridges(xs, ys, thick, RIB_W, DOUBLE_H + RIB_H))
    if wide:
        h = np.maximum(h, _ridges(xs, ys, wide, TRIPLE_W, TRIPLE_H))
        for d in (-TRIPLE_RIB_OFF, TRIPLE_RIB_OFF):
            h = np.maximum(
                h, _ridges(xs, ys, _shifted(wide, d), RIB_W, TRIPLE_H + RIB_H)
            )
    if labels:
        h = np.maximum(h, _ridges(xs, ys, labels, LABEL_W, LABEL_H))
    h[0, :] = h[-1, :] = h[:, 0] = h[:, -1] = 0.0
    return xs, ys, h


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


def build_molecule_mesh(smiles, title=""):
    """Card + braille title + molecule relief, as (V, F) like stl.build_mesh."""
    Vc, Fc = stl.build_mesh(title)
    Vm, Fm = _relief_shell(*molecule_relief(smiles))
    return np.vstack([Vc, Vm]), np.vstack([Fc, Fm + len(Vc)])


def molecule_card_stl(smiles, title=""):
    return stl.stl_bytes(
        *build_molecule_mesh(smiles, title), name=f"TactoRead {title or smiles}"[:80]
    )


if __name__ == "__main__":
    with open("api/molecule.stl", "wb") as f:
        f.write(molecule_card_stl("COC(=O)c1ccccc1O", "wintergreen"))
