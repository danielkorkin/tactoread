import io
import urllib.parse
import uuid

import requests
from data_science import chart_card_stl, key_card_stl, key_lines
from flask import Flask, after_this_request, jsonify, request, send_file
from molec import molecule_card_stl
from util import create_temp, delete_temp

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


if __name__ == "__main__":
    app.run(port=5328)
