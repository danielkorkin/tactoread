"""
PDB ID -> 3D-printable protein micro-model + Braille tag (STL files)
Parameters from Alonzo et al., Sci. Adv. 10, eadj8099 (2024): ~20 mm models,
~100 um print resolution, space-filling or cartoon, eyelet for a lanyard.

pip install numpy scipy scikit-image trimesh
"""

import urllib.request

import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes

SIZE_MM, VOX = 20.0, 0.1  # model size, 100 um voxels
VDW = {"C": 1.7, "N": 1.55, "O": 1.52, "S": 1.8}  # van der Waals radii (A)
EYE_R, EYE_T = 2.0, 0.8  # eyelet ring radius, thickness (mm)
# cartoon tube radius: (Angstrom, minimum mm) for helix, strand, arrowhead, coil
TUBE = {"H": (1.2, 0.5), "E": (1.0, 0.5), "A": (2.2, 0.9), "C": (0.7, 0.4)}
DOT_D, DOT_H, DOT_P, CELL_P, LINE_P, TAG_T = (
    1.5,
    0.6,
    2.5,
    6.2,
    10.0,
    1.6,
)  # Braille (mm)


def parse(text, chain):
    """Heavy atoms (name, chain, residue, element, xyz) and helix/sheet ranges."""
    atoms, ss = [], []
    for l in text.splitlines():
        if l.startswith("ENDMDL"):
            break
        if l.startswith("HELIX"):
            ss.append(("H", l[19], int(l[21:25]), int(l[33:37])))
        if l.startswith("SHEET"):
            ss.append(("E", l[21], int(l[22:26]), int(l[33:37])))
        if l.startswith("ATOM") and l[16] in " A" and (not chain or l[21] == chain):
            el = (l[76:78].strip() or l[12:16].strip()[0]).upper()
            if el not in ("H", "D"):
                xyz = np.array([float(l[30:38]), float(l[38:46]), float(l[46:54])])
                atoms.append((l[12:16].strip(), l[21], int(l[22:26]), el, xyz))
    return atoms, ss


def voxel_mesh(caps, lo=None, hi=None, extra=None):
    """Fill tapered tubes (a, b, ra, rb) into a 0.1 mm grid and mesh it."""
    if lo is None:
        lo = np.min([np.minimum(a, b) - max(ra, rb) for a, b, ra, rb in caps], 0)
        hi = np.max([np.maximum(a, b) + max(ra, rb) for a, b, ra, rb in caps], 0)
    lo = np.asarray(lo, float) - 3 * VOX
    shape = np.ceil((np.asarray(hi) - lo) / VOX).astype(int) + 4
    g = np.zeros(shape, bool)
    axes = [lo[k] + np.arange(shape[k]) * VOX for k in range(3)]
    if extra:
        extra(g, axes)
    for a, b, ra, rb in caps:
        r = max(ra, rb)
        i0 = np.maximum(((np.minimum(a, b) - r - lo) / VOX).astype(int), 0)
        i1 = np.minimum(((np.maximum(a, b) + r - lo) / VOX).astype(int) + 2, shape)
        P = np.stack(
            np.meshgrid(*[axes[k][i0[k] : i1[k]] for k in range(3)], indexing="ij"), -1
        )
        d = b - a
        t = np.clip((P - a) @ d / max(d @ d, 1e-12), 0, 1)
        dist = np.linalg.norm(P - a - t[..., None] * d, axis=-1)
        g[tuple(slice(*s) for s in zip(i0, i1))] |= dist <= ra + (rb - ra) * t
    v, f, _, _ = marching_cubes(
        gaussian_filter(np.pad(g, 2).astype(np.float32), 0.8), 0.5, spacing=(VOX,) * 3
    )
    m = trimesh.Trimesh(v + lo - 2 * VOX, f)
    m.fix_normals()
    return m


def build_model(atoms, ss, mode, size):
    xyz = np.array([a[4] for a in atoms])
    center = (xyz.max(0) + xyz.min(0)) / 2
    s = size / (np.ptp(xyz, 0).max() + 3.6)  # mm per Angstrom
    caps = []
    if mode == "surface":  # one sphere per atom
        for name, ch, res, el, p in atoms:
            q, r = (p - center) * s, VDW.get(el, 1.7) * s
            caps.append((q, q, r, r))
    else:  # tubes along CA trace
        rad = {k: max(a * s, mn) for k, (a, mn) in TUBE.items()}
        ca = [
            (
                ch,
                (p - center) * s,
                next((t for t, c, i, j in ss if c == ch and i <= res <= j), "C"),
            )
            for name, ch, res, el, p in atoms
            if name == "CA"
        ]
        types = [c[2] for c in ca]
        for i in range(len(ca) - 1):
            (c1, p1, _), (c2, p2, _) = ca[i], ca[i + 1]
            r1, r2 = rad[types[i]], rad[types[i + 1]]
            if types[i] == types[i + 1] == "E" and (
                i + 2 == len(ca) or types[i + 2] != "E"
            ):
                r1, r2 = rad["A"], rad["C"]  # strand ends in an arrowhead
                types[i + 1] = "C"
            if c1 == c2:  # same chain (missing residues get bridged)
                caps.append((p1, p2, r1, r2))

    # eyelet: a ring of short tubes standing on the highest point
    p, r = max(
        ((c[k], c[2 + k]) for c in caps for k in (0, 1)), key=lambda x: x[0][2] + x[1]
    )
    eye = p + [0, 0, r + EYE_R - EYE_T]
    ang = np.linspace(0, 2 * np.pi, 33)
    ring = eye + EYE_R * np.stack([0 * ang, np.cos(ang), np.sin(ang)], 1)
    caps += [(ring[i], ring[i + 1], EYE_T, EYE_T) for i in range(32)]
    return voxel_mesh(caps), s


LETTERS = dict(
    zip(
        "abcdefghijklmnopqrstuvwxyz",
        "1 12 14 145 15 124 1245 125 24 245 13 123 134 "
        "1345 135 1234 12345 1235 234 2345 136 1236 2456 1346 13456 1356".split(),
    )
)


def to_braille(text):
    """Grade 1 Braille cells as dot strings, e.g. '145'."""
    cells, num = [], False
    for ch in text.lower():
        if ch.isdigit():
            if not num:
                cells.append("3456")  # number sign
                num = True
            cells.append(LETTERS["jabcdefghi"[int(ch)]])
        else:
            if num and ch in "abcdefghij":
                cells.append("56")  # letter sign
            num = False
            cells.append(LETTERS.get(ch, ""))
    return cells


def unicode_braille(text):
    return "".join(
        chr(0x2800 + sum(1 << int(d) - 1 for d in c)) for c in to_braille(text)
    )


def build_tag(lines):
    rows = [to_braille(l) for l in lines]
    W = 7.5 + (max(map(len, rows)) - 1) * CELL_P + DOT_P + 3
    H = 6 + 2 * DOT_P + (len(rows) - 1) * LINE_P
    R = ((DOT_D / 2) ** 2 + DOT_H**2) / (2 * DOT_H)  # dome-shaped dots
    caps = []
    for li, row in enumerate(rows):
        for ci, cell in enumerate(row):
            for d in map(int, cell):
                c = np.array(
                    [
                        7.5 + ci * CELL_P + (d - 1) // 3 * DOT_P,
                        H - 3 - li * LINE_P - (d - 1) % 3 * DOT_P,
                        TAG_T + DOT_H - R,
                    ]
                )
                caps.append((c, c, R, R))

    def plate(g, axes):  # plate with lanyard hole
        X, Y, Z = np.meshgrid(*axes, indexing="ij")
        g |= (
            (X >= 0)
            & (X <= W)
            & (Y >= 0)
            & (Y <= H)
            & (Z >= 0)
            & (Z <= TAG_T)
            & (np.hypot(X - 3.5, Y - H / 2) > 1.5)
        )

    return voxel_mesh(caps, [0, 0, 0], [W, H, TAG_T + DOT_H], plate)


def main():
    pdb_id = input("PDB ID (e.g. 1V4T): ").strip().upper()
    mode = (
        "cartoon"
        if input("Model type: [1] normal  [2] cartoon : ").strip() == "2"
        else "surface"
    )
    size = float(input(f"Size in mm [{SIZE_MM:g}]: ") or SIZE_MM)
    chain = input("Chain ID (blank = all): ").strip()

    url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    atoms, ss = parse(urllib.request.urlopen(url).read().decode(), chain)
    model, s = build_model(atoms, ss, mode, size)
    model.export(f"{pdb_id}_{mode}_micromodel.stl")
    build_tag([pdb_id, mode]).export(f"{pdb_id}_{mode}_braille_tag.stl")
    print(
        f"Saved {pdb_id}_{mode}_micromodel.stl ({s:.3f} mm/A, {np.round(model.extents, 1)} mm)"
    )
    print(
        f"Saved {pdb_id}_{mode}_braille_tag.stl: {unicode_braille(pdb_id)} / {unicode_braille(mode)}"
    )


if __name__ == "__main__":
    main()
