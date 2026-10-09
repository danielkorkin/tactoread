from collections import Counter

import numpy as np

# Dimensions/layout in mm
PLATE_W = 100.0
PLATE_H = 74.5
PLATE_T = 3.0  # max total thickness
BASE_T = 0.8  # solid floor under all points
RELIEF_T = PLATE_T - BASE_T
MARGIN = 6.0
CAPTION_H = 12.0  # 14 braille cells at 6.2mm pitch
RULE_W = 1.5  # seperator ridge, full usable width
RULE_T = 2.0  # total height above build plate
RULE_GAP = 2.0  # clear space between ridge and drawing area
CHAMFER = 8.0  # orientation cue, top-left corner

# Brail variables
BR_CELL = 6.2
BR_LINE = 10.0
DOT_D = 1.5
DOT_SP = 2.5

USABLE_W = PLATE_W - 2 * MARGIN
CAPTION_CELLS = int(USABLE_W / BR_CELL)  # how many cells in caption

# vertical stack measured from bottom edge of plate
CAPTION_TOP = PLATE_H - MARGIN
CAPTION_BOT = CAPTION_TOP - CAPTION_H
RULE_TOP_Y = CAPTION_BOT
RULE_BOT_Y = RULE_TOP_Y - RULE_W
DRAW_TOP = RULE_BOT_Y - RULE_GAP
DRAW_BOT = MARGIN
DRAW_H = DRAW_TOP - DRAW_BOT

# Break grid: every cell edge lies on one of these lines
X_BREAKS = [0.0, MARGIN, CHAMFER, PLATE_W - MARGIN, PLATE_W]
Y_BREAKS = [0.0, RULE_BOT_Y, RULE_TOP_Y, PLATE_H]

EPS = 1e-9  # tolerance for float comparisons


#  helpers
def _edges(poly):
    """Yield each directed edge (a, b) of a polygon, wrapping around."""
    return zip(poly, poly[1:] + poly[:1])


def _key(*coords):
    """Round coordinates so equal points hash equally."""
    return tuple(round(c, 6) for c in coords)


def _same_point(p, q):
    """Same points based on error tolerance"""
    return abs(p[0] - q[0]) <= EPS and abs(p[1] - q[1]) <= EPS


def _chamfer_side(p):
    """Signed distance-like value: >= 0 means kept, < 0 means cut off.

    The chamfer line runs (0, H - c) -> (c, H), i.e. x - y + (H - c) = 0.
    """
    return p[0] - p[1] + (PLATE_H - CHAMFER)


def _chamfer_clip(poly):
    """Remove the top-left corner of a polygon (Sutherland-Hodgman, one line)."""
    clipped = []
    for a, b in _edges(poly):
        side_a, side_b = _chamfer_side(a), _chamfer_side(b)
        a_kept, b_kept = side_a >= -EPS, side_b >= -EPS

        if a_kept:
            clipped.append(a)
        if a_kept != b_kept:  # edge crosses the cut: add the crossing point
            t = side_a / (side_a - side_b)
            clipped.append((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])))

    # Remove repeated points (including first == last)
    unique = []
    for p in clipped:
        if not unique or not _same_point(p, unique[-1]):
            unique.append(p)
    if len(unique) > 1 and _same_point(unique[0], unique[-1]):
        unique.pop()
    return unique


def cells():
    """Return [(polygon, top_height)] over the break grid, chamfer applied."""
    result = []
    for y0, y1 in zip(Y_BREAKS, Y_BREAKS[1:]):
        for x0, x1 in zip(X_BREAKS, X_BREAKS[1:]):
            poly = _chamfer_clip([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            if len(poly) < 3:  # fully removed by the chamfer
                continue

            on_rule = (
                RULE_BOT_Y - EPS <= y0
                and y1 <= RULE_TOP_Y + EPS
                and MARGIN - EPS <= x0
                and x1 <= PLATE_W - MARGIN + EPS
            )
            result.append((poly, RULE_T if on_rule else BASE_T))
    return result


class _MeshBuilder:
    """Collects de-duplicated vertices and triangles."""

    def __init__(self):
        self.vertices = []
        self.triangles = []
        self._index = {}

    def vertex(self, x, y, z):
        key = _key(x, y, z)
        if key not in self._index:
            self._index[key] = len(self.vertices)
            self.vertices.append(key)
        return self._index[key]

    def triangle(self, a, b, c):
        self.triangles.append((a, b, c))

    def quad(self, p0, p1, p2, p3):
        self.triangle(p0, p1, p2)
        self.triangle(p0, p2, p3)

    def arrays(self):
        return np.array(self.vertices, float), np.array(self.triangles, int)


def build_mesh():
    """Return (V, F): float (n, 3) vertices and int (m, 3) triangles, watertight."""
    mesh = _MeshBuilder()
    all_cells = cells()

    # Height of the cell that owns each directed edge (used to find step walls)
    edge_height = {_key(*a, *b): h for poly, h in all_cells for a, b in _edges(poly)}

    for poly, h in all_cells:
        top = [mesh.vertex(x, y, h) for x, y in poly]
        bottom = [mesh.vertex(x, y, 0.0) for x, y in poly]

        # Top and bottom faces: triangle fan, bottom wound the other way
        for k in range(1, len(poly) - 1):
            mesh.triangle(top[0], top[k], top[k + 1])
            mesh.triangle(bottom[k + 1], bottom[k], bottom[0])

        # Side walls: only where the neighbour across the edge is lower
        for a, b in _edges(poly):
            neighbour_h = edge_height.get(_key(*b, *a), 0.0)  # 0 = plate edge
            if neighbour_h >= h - EPS:
                continue
            mesh.quad(
                mesh.vertex(*a, neighbour_h),
                mesh.vertex(*b, neighbour_h),
                mesh.vertex(*b, h),
                mesh.vertex(*a, h),
            )

    return mesh.arrays()


def check_watertight(V, F):
    """Report whether every edge is used exactly twice, once in each direction."""
    directed, undirected = Counter(), Counter()
    for a, b, c in F:
        for edge in ((a, b), (b, c), (c, a)):
            directed[edge] += 1
            undirected[tuple(sorted(edge))] += 1

    return dict(
        n_vertices=len(V),
        n_triangles=len(F),
        every_edge_twice=all(n == 2 for n in undirected.values()),
        consistent_winding=all(n == 1 for n in directed.values()),
        bad_edges=[e for e, n in undirected.items() if n != 2][:5],
    )


# --------------------------------------------------------------------- STL
# One binary-STL record: normal, 3 vertices, 2-byte attribute (50 bytes)
_STL_RECORD = np.dtype(
    [("normal", "<f4", 3), ("verts", "<f4", (3, 3)), ("attr", "<u2")]
)


def stl_bytes(V, F, name="TactoRead blank card"):
    """Return the binary STL as bytes (nothing is written to disk)."""
    corners = V[F]  # (m, 3 corners, 3 coords)
    normals = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals = normals / np.where(lengths == 0, 1, lengths)

    records = np.zeros(len(F), dtype=_STL_RECORD)
    records["normal"] = normals
    records["verts"] = corners

    header = name.encode()[:80].ljust(80, b"\0")
    count = np.array([len(F)], dtype="<u4").tobytes()
    return header + count + records.tobytes()


def write_stl(V, F, path, name="TactoRead blank card"):
    with open(path, "wb") as f:
        f.write(stl_bytes(V, F, name))
    return path


def blank_card_stl():
    """Build the plate and return its STL bytes."""
    return stl_bytes(*build_mesh())


if __name__ == "__main__":
    write_stl(*build_mesh(), "api/test.stl")
