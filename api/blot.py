#!/usr/bin/env python3
"""Western blot image -> tactile lithophane cards (STL) on the stl.py base card.

One card, <image>_blot.stl: the title in the caption, then in the drawing area a Braille
letter over each lane, the blot as relief (band height follows band intensity, Alonzo et
al. 2024) and, under it, a key with lane names, ladder sizes, panel names and the full
title, as many lines as fit while the blot keeps at least MIN_BLOT mm.

Usage: python api/blot_card.py figure.png [--label "tubulin blot"] [--lanes "A-431, Raji"]
           [--ladder "250, 150, 100"] [--panels "Tubulin, GAPDH"] [--auto]
--auto reads any missing labels from the figure with OpenAI (pip install openai and set
OPENAI_API_KEY). It uploads the figure to OpenAI.
"""

import argparse
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from PIL import Image, ImageOps

try:  # works as api.blot_card and as "python api/blot_card.py"
    from . import stl
except ImportError:
    import stl

RES = 0.1  # mm per relief sample (paper: ~100 um)
MIN_BLOT = 15.0  # mm of blot height kept free of key lines
MODEL = "gpt-6-luna"
PROMPT = """Read the printed labels of this western blot figure. Only report text that is
printed in the image; use an empty string or list for anything that isn't there.
title: the figure title, or the main protein probed. lanes: lane names, left to right.
ladder_kda: marker sizes in kDa, top to bottom, numbers only.
panels: panel names, top to bottom, with sizes if printed (e.g. "Tubulin ~52 kDa")."""

# Braille cells are dot strings, as in stl.BRAILLE
PUNCT = {"-": "36", ".": "256", ",": "2", ":": "25", "/": "34", "~": "4"}
NUMBER_SIGN, LETTER_SIGN = "3456", "56"

load_dotenv()


def to_cells(text):
    """Uncontracted Braille cells for text (lowercase; unknown characters are skipped)."""
    cells, number = [], False
    for ch in text.lower():
        if ch.isdigit():
            cells += [] if number else [NUMBER_SIGN]
            cells.append(stl.BRAILLE["jabcdefghi"[int(ch)]])
        elif ch in stl.BRAILLE or ch in PUNCT:
            if number and ch in "abcdefghij":
                cells.append(LETTER_SIGN)  # so it isn't read as a digit
            cells.append(stl.BRAILLE.get(ch, PUNCT.get(ch)))
        number = ch.isdigit()
    return cells


def wrap(text, width=stl.CAPTION_CELLS):
    """Text -> lines of at most `width` Braille cells, broken between words."""
    lines = [[]]
    for word in text.split():
        cells = to_cells(word)
        if lines[-1] and len(lines[-1]) + 1 + len(cells) > width:
            lines.append([])
        lines[-1] += ([""] if lines[-1] else []) + cells
        while len(lines[-1]) > width:  # a word longer than a line
            lines[-1:] = [lines[-1][:width], lines[-1][width:]]
    return [line for line in lines if line]


def dots(lines, x, y):
    """Dot centres for lines of cells; (x, y) is dot 1 of the first cell."""
    return [
        (x + i * stl.BR_CELL + col * stl.DOT_SP, y - n * stl.BR_LINE - row * stl.DOT_SP)
        for n, line in enumerate(lines)
        for i, cell in enumerate(line)
        for col, row in (divmod(int(d) - 1, 3) for d in cell)
    ]


def caption(text):
    """Fit text to stl.add_title: whole words, letters and spaces, at most 14 cells."""
    out = ""
    for word in re.sub("[^a-z]+", " ", text.lower()).split():
        if len(out) + bool(out) + len(word) > stl.CAPTION_CELLS:
            break
        out = f"{out} {word}".strip()
    return out


def runs(mask):
    """(start, end) of every run of True values."""
    d = np.diff(np.concatenate([[0], mask.astype(int), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]))


def load_blot(path):
    """Band signal 0..1 (linear in intensity), cropped to the blot. In a figure, the blot
    panels are wide boxes that are mostly not white; text and margins are left out."""
    img = Image.open(path)
    g = np.asarray(img if img.mode[0] in "IF" else img.convert("L"), dtype=float)
    ink = g < 0.95 * g.max()
    keep = np.zeros(g.shape, dtype=bool)
    for r0, r1 in runs(ink.mean(1) > 0.5):
        c0, c1 = max(
            runs(ink[r0:r1].mean(0) > 0.5), key=lambda c: c[1] - c[0], default=(0, 0)
        )
        if c1 - c0 > 0.4 * g.shape[1] and r1 - r0 >= 5:  # a panel, not a line of text
            keep[r0 + 2 : r1 - 2, c0 + 2 : c1 - 2] = True  # minus its border line
    if not keep.any():
        keep[:] = True
    if np.median(g[keep]) > (g[keep].min() + g[keep].max()) / 2:
        g = -g  # dark bands on a light background
    s = np.where(keep, np.clip(g - np.median(g[keep]), 0, None), 0)
    rows, cols = np.nonzero(keep.any(1))[0], np.nonzero(keep.any(0))[0]
    s = s[rows[0] : rows[-1] + 1, cols[0] : cols[-1] + 1]
    return s / (s.max() or 1)


def read_labels(path):
    """Ask OpenAI for the figure's printed labels: title, lanes, ladder_kda, panels."""
    from openai import OpenAI

    img = Image.open(path).convert("RGB")
    img.thumbnail((2048, 2048))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    strings = {"type": "array", "items": {"type": "string"}}
    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "lanes": strings,
            "ladder_kda": strings,
            "panels": strings,
        },
        "required": ["title", "lanes", "ladder_kda", "panels"],
        "additionalProperties": False,
    }
    response = OpenAI().responses.create(
        model=MODEL,
        instructions=PROMPT,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_image", "image_url": url, "detail": "high"}
                ],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "blot_labels",
                "schema": schema,
                "strict": True,
            }
        },
        store=False,
    )
    return json.loads(response.output_text)


def relief_mesh(Z, x0, y_top):
    """Closed solid under heights Z; Z[i, j] sits at (x0 + j*RES, y_top - i*RES)."""
    ny, nx = Z.shape
    n = ny * nx
    i, j = np.mgrid[0:ny, 0:nx]
    top = np.stack([x0 + j * RES, y_top - i * RES, Z], -1).reshape(-1, 3)
    idx = np.arange(n).reshape(ny, nx)
    a, b, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]
    faces = [
        np.stack([a, d, c], -1).reshape(-1, 3),
        np.stack([a, c, b], -1).reshape(-1, 3),
    ]
    # walls around the outline (counter-clockwise from above), bottom fanned from the centre
    edge = np.concatenate([idx[-1, :-1], idx[:0:-1, -1], idx[0, :0:-1], idx[:-1, 0]])
    bottom = n + np.arange(len(edge))
    centre = [[x0 + (nx - 1) * RES / 2, y_top - (ny - 1) * RES / 2, 0.0]]
    V = np.concatenate([top, top[edge] * [1, 1, 0], centre])
    p, q, bp, bq = edge, np.roll(edge, -1), bottom, np.roll(bottom, -1)
    faces += [np.stack([bp, bq, q], 1), np.stack([bp, q, p], 1)]
    faces += [np.stack([np.full(len(edge), n + len(edge)), bq, bp], 1)]
    return V, np.concatenate(faces)


def save_card(path, title, dot_list, relief=None):
    """Base card from stl.py plus Braille dots and an optional relief, as one STL."""
    parts = [stl.build_mesh(title)]
    if dot_list:
        extra = stl._MeshBuilder()
        for x, y in dot_list:
            stl._add_dot(extra, x, y)
        parts.append(extra.arrays())
    if relief:
        parts.append(relief)
    V, F, n = [], [], 0
    for v, f in parts:
        V.append(v)
        F.append(f + n)
        n += len(v)
    stl.write_stl(np.concatenate(V), np.concatenate(F), path)
    print("Saved", path)
    return path


def main(image, title="", lanes=(), ladder=(), panels=(), auto=False):
    """Make <image>_blot.stl. Labels you pass win over ones read with auto=True."""
    lanes, ladder, panels = list(lanes), list(ladder), list(panels)
    if auto:
        try:
            found = read_labels(image)
            print("Read from the figure:", found)
        except Exception as err:
            print("Couldn't read the labels automatically:", err)
        else:
            title = title or found["title"]
            lanes = lanes or found["lanes"]
            ladder = ladder or found["ladder_kda"]
            panels = panels or found["panels"]

    # Layout, top to bottom: lane letters, blot, key
    blot_top = stl.DRAW_TOP - (stl.BR_LINE if lanes else 0)
    lines = key_lines(title, lanes, ladder, panels, blot_top)
    key_top = stl.DRAW_BOT + len(lines) * stl.BR_LINE
    braille = dots(lines, stl.MARGIN + stl.DOT_D / 2, key_top - 2 - stl.DOT_D / 2)

    signal = load_blot(image)
    heights, x0 = fit_blot(signal, blot_top - key_top)
    relief = relief_mesh(stl.BASE_T + stl.RELIEF_T * heights, x0, blot_top)
    if lanes:
        braille += lane_letters(signal, heights, x0, len(lanes))

    path = Path(image).with_suffix("").as_posix() + "_blot.stl"
    save_card(path, caption(title), braille, relief)


def key_lines(title, lanes, ladder, panels, blot_top):
    """Braille lines for the key under the blot, as many as leave MIN_BLOT mm of blot."""
    groups = [
        ", ".join(f"{chr(97 + k)} {name}" for k, name in enumerate(lanes)),
        "ladder kDa: " + " ".join(ladder) if ladder else "",
        "panels: " + ", ".join(panels) if panels else "",
        title if caption(title) != title.lower() else "",  # caption had to shorten it
    ]
    lines = [line for group in groups for line in wrap(group)]
    room = int((blot_top - stl.DRAW_BOT - MIN_BLOT) // stl.BR_LINE)
    if len(lines) > room:
        print(f"Only {room} of {len(lines)} key lines fit; the rest are left out")
    return lines[:room]


def fit_blot(signal, height):
    """Scale the blot to the drawing width and `height` mm.
    Returns relief heights 0..1 and the x of its left edge (centred)."""
    size = int(stl.USABLE_W / RES), int(height / RES)
    small = ImageOps.contain(Image.fromarray(signal.astype(np.float32)), size)
    small = np.clip(np.asarray(small), 0, 1)
    x0 = stl.MARGIN + (size[0] - small.shape[1]) // 2 * RES
    return small, x0


def lane_letters(signal, heights, x0, n):
    """Dots for a Braille letter centred over each of n lanes;
    the lanes split the span of the bands evenly."""
    mm = heights.shape[1] * RES / signal.shape[1]  # mm per image pixel
    profile = signal.sum(0)
    band = np.nonzero(profile >= 0.25 * profile.max())[0]
    pitch = (band[-1] + 1 - band[0]) / n
    if n > 26 or pitch * mm < stl.BR_CELL:  # letters must sit a full cell apart
        print("Lanes too narrow for Braille letters; the key lists them in order")
        return []

    y = stl.DRAW_TOP - stl.BR_LINE / 2 + stl.DOT_SP
    letters = []
    for k in range(n):
        x = x0 + (band[0] + (k + 0.5) * pitch) * mm - stl.DOT_SP / 2
        letters += dots([[stl.BRAILLE[chr(97 + k)]]], x, y)
    return letters


if __name__ == "__main__":
    main(sys.argv[1])
