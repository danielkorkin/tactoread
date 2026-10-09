import io
import urllib.parse
from flask import Flask, jsonify, request, send_file
import requests

app = Flask(__name__)

@app.route("/api/python")
def hello_world():
    print("Got a hit")
    return jsonify({
        "status": 500,
        "statusText": "Hello from Flask serverless backend!"
    }), 500

@app.route("/cheese")
def cheese():
    print("cheese")
    return jsonify({
        "status": "cheese"
    })

@app.route("/api/smiles-to-2d", methods=["GET", "POST"])
def route_smiles_to_2d():
    smiles = request.args.get("smiles") or (request.json.get("smiles") if request.is_json else None)
    if not smiles:
        return jsonify({"error": "Missing 'smiles' parameter"}), 400
    encoded_smiles = urllib.parse.quote(smiles)
    url = f"https://cactus.nci.nih.gov/chemical/structure/{encoded_smiles}/image"
    response = requests.get(url)
    if response.status_code == 200:
        return send_file(io.BytesIO(response.content), mimetype="image/png")
    return jsonify({"error": "Failed to fetch image"}), response.status_code

@app.route("/api/3-letter-to-smiles", methods=["GET", "POST"])
def route_three_letter_to_smiles():
    symbol = request.args.get("symbol") or (request.json.get("symbol") if request.is_json else None)
    if not symbol:
        return jsonify({"error": "Missing 'symbol' parameter"}), 400
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{symbol}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
        smiles = props.get("ConnectivitySMILES") or props.get("CanonicalSMILES")
        return jsonify({"smiles": smiles})
    return jsonify({"error": "Symbol not found"}), response.status_code

@app.route("/api/name-to-smiles", methods=["GET", "POST"])
def route_name_to_smiles():
    name = request.args.get("name") or (request.json.get("name") if request.is_json else None)
    if not name:
        return jsonify({"error": "Missing 'name' parameter"}), 400
    encoded_name = urllib.parse.quote(name)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
        smiles = props.get("ConnectivitySMILES") or props.get("CanonicalSMILES")
        return jsonify({"smiles": smiles})
    return jsonify({"error": "Name not found"}), response.status_code

@app.route("/api/chebi-to-smiles", methods=["GET", "POST"])
def route_chebi_to_smiles():
    chebi_id = request.args.get("chebi_id") or (request.json.get("chebi_id") if request.is_json else None)
    if not chebi_id:
        return jsonify({"error": "Missing 'chebi_id' parameter"}), 400
    clean_id = chebi_id.upper().replace("CHEBI:", "") if "CHEBI:" in chebi_id.upper() else chebi_id
    url = f"https://www.ebi.ac.uk/chebi/webServices/rest/getCompleteEntity?chebiId={clean_id}"
    response = requests.get(url)
    if response.status_code == 200:
        text = response.text
        if "<smiles>" in text and "</smiles>" in text:
            smiles = text.split("<smiles>")[1].split("</smiles>")[0]
            return jsonify({"smiles": smiles})
    return jsonify({"error": "ChEBI ID not found"}), response.status_code

if __name__ == "__main__":
    app.run(port=5328)
