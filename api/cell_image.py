"""Micrograph -> tactile lithophane relief on a TactoRead card.

Defaults follow Shaw et al., Sci. Adv. 10, eadj8099 (2024): features span
~0.5-2 mm, relief up to 1.8 mm, a raised reinforcement frame round the image.
"""

import io

import numpy as np
from PIL import Image
from scipy import ndimage

try:
    from . import stl
    from .molec import _relief_shell
except ImportError:  # run directly as a script
    import stl
    from molec import _relief_shell

# Sizes in mm
RELIEF_H = 1.8  # max relief above the floor (floor + relief stays under PLATE_T)
RES = 0.25  # height-field grid spacing, Nyquist for the 0.5 mm feature limit
ACUITY = 0.9  # fingertip two-point limit
MIN_STROKE = 1.2  # line art is widened to this
MEDIAN_R = 0.15  # speckle-removing median radius
SIGMA = {"tone": 0.25, "field": 0.6, "line": 0.3}  # low-pass per mode
FRAME_W = 10.0  # reinforcement frame width round the image
FRAME_H = 1.0  # frame height above the floor
PAD = 0.0  # keep-out from the drawing-area edge
CLIP = (1.0, 99.0)  # percentile contrast stretch


def _luminance(image):
    """Path, bytes, file object or PIL image -> float array in [0, 1]."""
    if isinstance(image, (bytes, bytearray)):
        image = io.BytesIO(image)
    im = image if isinstance(image, Image.Image) else Image.open(image)
    if im.mode in ("I;16", "I", "F"):
        a = np.asarray(im, float)
        return (a - a.min()) / max(float(np.ptp(a)), 1e-9)
    if im.mode in ("L", "LA"):
        return np.asarray(im.convert("L"), float) / 255.0
    rgb = np.asarray(im.convert("RGB"), float) / 255.0
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def _otsu(a):
    """Threshold in [0, 1] that best splits a into dark and bright."""
    h, e = np.histogram(a, 256, (0, 1))
    w = np.cumsum(h)
    m = np.cumsum(h * e[:-1])
    wb = w[:-1]
    wf = w[-1] - wb
    ok = (wb > 0) & (wf > 0)
    var = np.zeros(255)
    var[ok] = (
        (m[:-1][ok] / wb[ok] - (m[-1] - m[:-1][ok]) / wf[ok]) ** 2 * wb[ok] * wf[ok]
    )
    return float(e[:-1][np.argmax(var)])


def _disc(r):
    """Round structuring element of radius r pixels."""
    t = np.arange(-r, r + 1) ** 2
    return np.add.outer(t, t) <= r**2


def _resample(a, nx, ny):
    """Lanczos resize to nx x ny, flipped so row 0 is the bottom (y up)."""
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(img.resize((nx, ny), Image.LANCZOS), float)[::-1] / 255.0


def _mode(z):
    """'line', 'field' or 'tone', from structure size in mm (z is sampled at RES)."""
    fg = z > _otsu(z)
    if not fg.any():
        return "tone"
    widths = 2 * ndimage.distance_transform_edt(fg)[fg] * RES
    if np.percentile(widths, 50) >= ACUITY:
        return "tone"  # fingertip can resolve it: map tone directly
    return "line" if fg.mean() < 0.08 else "field"  # widen sparse, band-limit dense


def _height_field(z, mode, polarity):
    """Resampled luminance -> smooth relief in [0, RELIEF_H]."""
    if polarity not in ("optical", "touch"):
        raise ValueError("polarity must be 'optical' or 'touch'")

    if mode == "line":
        thr = _otsu(z)
        se = _disc(max(1, int(round(MIN_STROKE / 2 / RES))))
        grown = ndimage.binary_dilation(z > thr, structure=se)
        amp = np.clip((z - thr) / max(1 - thr, 1e-9), 0, 1)
        amp = ndimage.grey_dilation(amp, footprint=se)
        z = np.where(grown, 0.35 + 0.65 * amp, 0.0)
    else:
        lo, hi = np.percentile(z, CLIP)
        z = np.clip((z - lo) / max(hi - lo, 1e-9), 0, 1)
        counts, edges = np.histogram(z, 512, (0, 1))  # histogram equalise
        z = np.interp(z, edges[:-1], np.cumsum(counts) / z.size)
        if polarity == "optical":  # dark thick, as backlit lithophanes are
            z = 1.0 - z

    # median first: removes speckle without dragging edges like a Gaussian would
    r = max(1, int(round(MEDIAN_R / RES)))
    h = ndimage.median_filter(z * RELIEF_H, size=2 * r + 1, mode="nearest")
    h = ndimage.gaussian_filter(h, SIGMA[mode] / RES, mode="nearest")
    h = np.clip(h, 0, RELIEF_H)
    if np.ptp(h) > 1e-9:  # use the whole relief budget
        h = (h - h.min()) / np.ptp(h) * RELIEF_H
    return h


def image_relief(image, polarity="optical", mode=None):
    """Return grid xs, ys and relief heights h[y, x] above the floor.

    The image sits in the card's drawing area inside a raised frame. polarity
    'optical' makes dark thick; 'touch' makes bright stand proud. mode is
    'tone', 'field' or 'line', chosen from the image when None.
    """
    lum = _luminance(image)
    x0, x1 = stl.MARGIN + PAD, stl.PLATE_W - stl.MARGIN - PAD
    y0, y1 = stl.DRAW_BOT + PAD, stl.DRAW_TOP - PAD
    inner = np.array([x1 - x0, y1 - y0]) - 2 * FRAME_W

    # Largest size that keeps the aspect, snapped to the grid
    s = min(inner[0] / lum.shape[1], inner[1] / lum.shape[0])
    nx = max(3, int(lum.shape[1] * s / RES) + 1)
    ny = max(3, int(lum.shape[0] * s / RES) + 1)
    z = _resample(lum, nx, ny)
    mode = mode or _mode(z)
    if mode not in SIGMA:
        raise ValueError(f"mode must be one of {sorted(SIGMA)}")

    # Image block surrounded by frame cells, all one height field
    nf = int(round(FRAME_W / RES))
    h = np.full((ny + 2 * nf, nx + 2 * nf), FRAME_H)
    h[nf : nf + ny, nf : nf + nx] = _height_field(z, mode, polarity)

    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    xs = cx + (np.arange(nx + 2 * nf) - (nx + 2 * nf - 1) / 2) * RES
    ys = cy + (np.arange(ny + 2 * nf) - (ny + 2 * nf - 1) / 2) * RES
    return xs, ys, h


def build_cell_image_mesh(image, title="", **kwargs):
    """Card + braille title + image relief, as (V, F) like stl.build_mesh."""
    Vc, Fc = stl.build_mesh(title)
    Vm, Fm = _relief_shell(*image_relief(image, **kwargs))
    return np.vstack([Vc, Vm]), np.vstack([Fc, Fm + len(Vc)])


def cell_image_card_stl(image, title="", **kwargs):
    """Binary STL bytes for an image (path, bytes, file object or PIL image)."""
    return stl.stl_bytes(
        *build_cell_image_mesh(image, title, **kwargs),
        name=f"TactoRead {title or 'cell image'}"[:80],
    )


if __name__ == "__main__":
    import sys

    with open("api/cell_image.stl", "wb") as f:
        f.write(cell_image_card_stl(sys.argv[1], "cells"))
