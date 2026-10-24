import base64
import io
import json
import urllib.parse
import urllib.request
import uuid

import requests
import stl
from blot import (
    caption,
    dots,
    fit_blot,
    key_lines,
    lane_letters,
    load_blot,
    read_labels,
    relief_mesh,
    save_card,
)
from data_science import chart_card_stl, key_card_stl, key_lines
from flask import Flask, after_this_request, jsonify, request, send_file
from molec import molecule_card_stl
from PIL import Image
from protein import build_model, build_tag, parse
from rcsbapi.search import TextQuery
from util import create_temp, create_temp_name, delete_temp

app = Flask(__name__)


@app.route("/api/smiles-to-image/<path:smiles>", methods=["GET"])
def route_smiles_to_image(smiles):
    # smiles = request.args.get("smiles") or (
    #     request.json.get("smiles") if request.is_json else None
    # )
    # if not smiles:
    #     return jsonify({"error": "Missing 'smiles' parameter"}), 400
    # encoded_smiles = urllib.parse.quote(smiles)
    url = f"https://cactus.nci.nih.gov/chemical/structure/{smiles}/image"
    response = requests.get(url)
    if response.status_code == 200:
        return send_file(io.BytesIO(response.content), mimetype="image/png")
    return jsonify({"error": "Failed to fetch image"}), response.status_code


@app.route("/api/3-letter-to-smiles/<path:letters>", methods=["GET"])
def route_three_letter_to_smiles(letters):
    # symbol = request.args.get("symbol") or (
    #     request.json.get("symbol") if request.is_json else None
    # )
    # if not symbol:
    #     return jsonify({"error": "Missing 'symbol' parameter"}), 400
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{letters}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
        smiles = props.get("ConnectivitySMILES") or props.get("CanonicalSMILES")
        return jsonify({"smiles": smiles})
    return jsonify({"error": "Symbol not found"}), response.status_code


@app.route("/api/name-to-smiles/<name>", methods=["GET"])
def route_name_to_smiles(name):
    # name = request.args.get("name") or (
    #     request.json.get("name") if request.is_json else None
    # )
    # if not name:
    #     return jsonify({"error": "Missing 'name' parameter"}), 400
    # encoded_name = urllib.parse.quote(name)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
        smiles = props.get("ConnectivitySMILES") or props.get("CanonicalSMILES")
        return jsonify({"smiles": smiles})
    return jsonify({"error": "Name not found"}), response.status_code


@app.route("/api/chebi-to-smiles/<path:chebi>", methods=["GET"])
def route_chebi_to_smiles(chebi):
    # chebi_id = request.args.get("chebi_id") or (
    #     request.json.get("chebi_id") if request.is_json else None
    # )
    # if not chebi_id:
    #     return jsonify({"error": "Missing 'chebi_id' parameter"}), 400
    # clean_id = (
    #     chebi_id.upper().replace("CHEBI:", "")
    #     if "CHEBI:" in chebi_id.upper()
    #     else chebi_id
    # )
    url = f"https://www.ebi.ac.uk/chebi/webServices/rest/getCompleteEntity?chebiId={chebi}"
    response = requests.get(url)
    if response.status_code == 200:
        text = response.text
        if "<smiles>" in text and "</smiles>" in text:
            smiles = text.split("<smiles>")[1].split("</smiles>")[0]
            return jsonify({"smiles": smiles})
    return jsonify({"error": "ChEBI ID not found"}), response.status_code


@app.route("/api/smiles-to-name/<path:smiles>", methods=["GET"])
def smiles_to_name_route(smiles):
    return jsonify(title=smiles_to_name(smiles))


@app.route("/api/molecule/<path:smiles>", methods=["GET"])
def molecule_3d(smiles):
    title = smiles_to_name(smiles)
    stl = molecule_card_stl(smiles, title=title)
    outpath = create_temp(stl)

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name="generated_model.stl",
    )


def smiles_to_name(smiles: str):
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/"
        f"{urllib.parse.quote(smiles, safe='')}/property/Title/JSON"
    )
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()["PropertyTable"]["Properties"][0]["Title"]
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return ""


@app.route("/api/data/donut", methods=["GET", "POST"])
def data_science_donut():
    # _TYPES = ["donut", "bar", "scatter"]
    data = request.get_json(silent=True) or {}

    title = data.get("title", "Donut Chart")

    values = data.get("values")
    # should just be a list of numbers
    if not isinstance(values, list):
        return jsonify({"error": "Values of a donut should be a list of numbers"})

    for value in values:
        if isinstance(value, int):
            pass
        elif isinstance(value, float):
            pass
        else:
            return jsonify({"error": "Values of a donut should be a list of numbers"})

    try:
        stl = chart_card_stl("donut", values, title)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400
    outpath = create_temp(stl)

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name="donut.stl",
    )


@app.route("/api/data/donut/key", methods=["GET", "POST"])
def data_science_donut_key():
    # _TYPES = ["donut", "bar", "scatter"]
    data = request.get_json(silent=True) or {}
    title = data.get("title", "Donut Key Chart")
    keys = data.get("keys")

    # should just be a list of strings
    if not isinstance(keys, list):
        return jsonify({"error": "Keys of a donut should be a list of strings"})

    for key in keys:
        if isinstance(key, str):
            pass
        else:
            return jsonify({"error": "Keys of a donut should be a list of strings"})

    values = data.get("values")

    # should be a list of numbers
    if not isinstance(values, list):
        return jsonify({"error": "Values of a donut should be a list of numbers"})

    for value in values:
        if isinstance(value, int):
            pass
        elif isinstance(value, float):
            pass
        else:
            return jsonify({"error": "Values of a donut should be a list of numbers"})

    try:
        stl = key_card_stl(key_lines(keys, values), title)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400
    outpath = create_temp(stl)

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name="donut_key.stl",
    )


@app.route("/api/data/bar", methods=["GET", "POST"])
def data_science_bar():
    # _TYPES = ["donut", "bar", "scatter"]
    data = request.get_json(silent=True) or {}

    title = data.get("title", "Bar Chart")

    values = data.get("values")
    # should just be a list of numbers
    if not isinstance(values, list):
        return jsonify({"error": "Values of a bar chart should be a list of numbers"})

    for value in values:
        if isinstance(value, int):
            pass
        elif isinstance(value, float):
            pass
        else:
            return jsonify({"error": "Values of a donut should be a list of numbers"})

    try:
        stl = chart_card_stl("bar", values, title)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400
    outpath = create_temp(stl)

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name="bar_chart.stl",
    )


@app.route("/api/data/scatter", methods=["GET", "POST"])
def data_science_scatter():
    # _TYPES = ["donut", "bar", "scatter"]
    data = request.get_json(silent=True) or {}

    title = data.get("title", "Scatter Plot")

    values = data.get("values")
    # should just be a list of numbers
    if not isinstance(values, list):
        return jsonify({"error": "Values of a bar chart should be a list of numbers"})

    for value in values:
        if isinstance(value, int):
            pass
        elif isinstance(value, float):
            pass
        else:
            return jsonify({"error": "Values of a donut should be a list of numbers"})

    trendline = data.get("trendline", True)
    if not isinstance(trendline, bool):
        return jsonify({"error": "Trendline either true or false"})

    x_values = data.get("x_values")
    if x_values is None:
        x_values = list(range(1, len(values) + 1))
    elif not isinstance(x_values, list) or not all(
        isinstance(v, (int, float)) and not isinstance(v, bool) for v in x_values
    ):
        return jsonify({"error": "x_values should be a list of numbers"}), 400

    try:
        stl = chart_card_stl("scatter", values, title, x_values, trendline)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400
    outpath = create_temp(stl)

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name="scatter_plot.stl",
    )


@app.route("/api/protein/micromodel", methods=["GET", "POST"])
def protein_micromodel():
    data = request.get_json() or {}

    pdb_id = data.get("pdb_id")
    if not isinstance(pdb_id, str):
        return jsonify({"error": "PDB ID must be a string"})

    # mode is either cartoon or surface
    mode = data.get("mode", "surface")
    _VALID_MODES = ["cartoon", "surface"]
    if mode not in _VALID_MODES:
        return jsonify(
            {"error": "Valid modes are cartoon or surface, defaults to normal"}
        )

    size = data.get("size", 20.0)
    # size in mm
    if not isinstance(size, (float, int)):
        return jsonify(
            {
                "error": "Size (mm) must be a number greater than 0 and must be int or float"
            }
        )

    if size <= 0:
        return jsonify(
            {
                "error": "Size (mm) must be a number greater than 0 and must be int or float"
            }
        )

    chain = data.get("chain", "")
    possible_chains = get_chains(pdb_id)
    if not isinstance(chain, str):
        return jsonify({"error": "Chain must be a string"})

    if chain == "":
        pass
    elif chain in possible_chains:
        pass
    else:
        return jsonify({"error": "Chain must be valid or blank (for all)"})

    _URL = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    atoms, ss = parse(urllib.request.urlopen(_URL).read().decode(), chain)
    model, s = build_model(atoms, ss, mode, size)
    outpath = create_temp(model.export(file_type="stl"))

    # build_tag([pdb_id, mode])
    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name=f"{pdb_id}_model.stl",
    )


@app.route("/api/protein/micromodel/tag", methods=["GET", "POST"])
def protein_micromodel_tag():
    data = request.get_json() or {}

    pdb_id = data.get("pdb_id")
    if not isinstance(pdb_id, str):
        return jsonify({"error": "PDB ID must be a string"})

    # mode is either cartoon or surface
    mode = data.get("mode", "surface")
    _VALID_MODES = ["cartoon", "surface"]
    if mode not in _VALID_MODES:
        return jsonify(
            {"error": "Valid modes are cartoon or surface, defaults to normal"}
        )

    size = data.get("size", 20.0)
    # size in mm
    if not isinstance(size, (float, int)):
        return jsonify(
            {
                "error": "Size (mm) must be a number greater than 0 and must be int or float"
            }
        )

    if size <= 0:
        return jsonify(
            {
                "error": "Size (mm) must be a number greater than 0 and must be int or float"
            }
        )

    chain = data.get("chain", "")
    possible_chains = get_chains(pdb_id)
    if not isinstance(chain, str):
        return jsonify({"error": "Chain must be a string"})

    if chain == "":
        pass
    elif chain in possible_chains:
        pass
    else:
        return jsonify({"error": "Chain must be valid or blank (for all)"})

    _URL = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    atoms, ss = parse(urllib.request.urlopen(_URL).read().decode(), chain)
    model, s = build_model(atoms, ss, mode, size)

    tag = build_tag([pdb_id, mode])
    outpath = create_temp(tag.export(file_type="stl"))

    @after_this_request
    def remove_temp(response):
        delete_temp(outpath.stem)
        return response

    return send_file(
        outpath,
        mimetype="application/sla",
        as_attachment=True,
        download_name=f"{pdb_id}_key.stl",
    )


@app.route("/api/protein/chains/<pdb_id>", methods=["GET"])
def get_chains_route(pdb_id):
    chains = get_chains(pdb_id)
    return jsonify({"chains": chains})


@app.route("/api/protein/generic-to-pdb/<name>")
def generic_to_pdb(name):
    query = TextQuery(name)
    pdb_ids = list(query("entry"))  # type: ignore
    try:
        return jsonify({"results": pdb_ids[0:3]})
    except:
        return jsonify({"error": "None found"})


def get_chains(pdb_id):
    q = f'{{entry(entry_id:"{pdb_id}"){{polymer_entities{{rcsb_polymer_entity_container_identifiers{{auth_asym_ids}}}}}}}}'
    d = json.load(
        urllib.request.urlopen(
            "https://data.rcsb.org/graphql?query=" + urllib.parse.quote(q)
        )
    )
    return sorted(
        c
        for e in d["data"]["entry"]["polymer_entities"]
        for c in e["rcsb_polymer_entity_container_identifiers"]["auth_asym_ids"]
    )


@app.route("/api/blot/lithopane", methods=["POST"])
def western_blot_lithopane():
    data = request.get_json() or {}

    # lists
    auto = data.get("auto", False)
    lanes = data.get("lanes", [])
    ladder = data.get("ladder", [])
    panels = data.get("panels", [])
    title = data.get("title", "Western Blot")
    image_b64 = data.get("image")  # image in base 64

    image_obj = None
    if image_b64:
        try:
            image_bytes = base64.b64decode
            image_obj = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            return jsonify({"error": "Failed to decode the image"})
    else:
        return jsonify({"error": "Image is required for this api root in base 64"})

    temp_image_path = create_temp(image_obj)

    if isinstance(auto, bool):
        if auto:
            try:
                found = read_labels(temp_image_path)

                title = found["title"]
                lanes = found["lanes"]
                ladder = found["ladder_kda"]
                panels = found["panels"]

            except Exception as e:
                return jsonify(
                    {"error": "There was an error in the extraction of the labels"}
                )
    else:
        return jsonify(
            {"error": "Invalid format, auto is boolean either true or false"}
        )

    if not isinstance(lanes, list):
        return jsonify({"error": "Lanes must be a list"})
    if not isinstance(ladder, list):
        return jsonify({"error": "Ladder must be a list"})
    if not isinstance(panels, list):
        return jsonify({"error": "Panels must be a list"})
    if not isinstance(title, str):
        return jsonify({"error": "Title must be a string"})

    blot_top = stl.DRAW_TOP - (stl.BR_LINE if lanes else 0)
    lines = key_lines(title, lanes, ladder, panels, blot_top)
    key_top = stl.DRAW_BOT + len(lines) * stl.BR_LINE
    braille = dots(lines, stl.MARGIN + stl.DOT_D / 2, key_top - 2 - stl.DOT_D / 2)

    signal = load_blot(temp_image_path)
    heights, x0 = fit_blot(signal, blot_top - key_top)
    relief = relief_mesh(stl.BASE_T + stl.RELIEF_T * heights, x0, blot_top)

    if lanes:
        braille += lane_letters(signal, heights, x0, len(lanes))

    delete_temp(temp_image_path.stem)
    path = create_temp_name()
    file_stl_path = save_card(path, caption(title), braille, relief)

    @after_this_request
    def remove_temp(response):
        delete_temp(file_stl_path.stem)
        return response

    return send_file(
        file_stl_path,
        mimetype="application/sla",
        as_attachment=True,
        download_name=f"{title}_blot.stl",
    )


if __name__ == "__main__":
    app.run(port=5328)
