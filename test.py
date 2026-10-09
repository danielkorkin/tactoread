import urllib.parse
import urllib.request
import requests


# SMILES to 2D Image NCI/CADD API
def smiles_to_2d_image(smiles: str, output_filename: str = "molecule.png"):
    """Fetch 2D structure rendering from NCI/CADD Chemical Identifier Resolver."""
    encoded_smiles = urllib.parse.quote(smiles)
    url = f"https://cactus.nci.nih.gov/chemical/structure/{encoded_smiles}/image"

    response = requests.get(url)
    if response.status_code == 200:
        with open(output_filename, "wb") as f:
            f.write(response.content)
        return output_filename
    return None


# 3-Letter Amino Acid Symbol to SMILES PubChem 
def three_letter_code_to_smiles(symbol: str) -> str:
    """Convert 3-letter amino acid code (e.g., 'Ala', 'Met') to SMILES."""
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{symbol}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data["PropertyTable"]["Properties"][0]["ConnectivitySMILES"]
    return None


# chemical Name to SMILES PubChem 
def name_to_smiles(name: str) -> str:
    """Convert common or IUPAC chemical name to SMILES."""
    encoded_name = urllib.parse.quote(name)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/CanonicalSMILES/JSON"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        print(data["PropertyTable"]["Properties"][0])
        return data["PropertyTable"]["Properties"][0]["ConnectivitySMILES"]
    return None


# d) ChEBI ID to SMILES ChEBI 
def chebi_id_to_smiles(chebi_id: str) -> str:
    """Convert ChEBI ID (e.g., '15377' or 'CHEBI:15377') to SMILES."""
    clean_id = (
        chebi_id.upper().replace("CHEBI:", "")
        if "CHEBI:" in chebi_id.upper()
        else chebi_id
    )
    url = f"https://www.ebi.ac.uk/chebi/webServices/rest/getCompleteEntity?chebiId={clean_id}"

    response = requests.get(url)
    if response.status_code == 200:
        text = response.text
        if "<smiles>" in text and "</smiles>" in text:
            return text.split("<smiles>")[1].split("</smiles>")[0]
    return None


aspirin_smiles = name_to_smiles("aspirin")
print(f"[Name -> SMILES] 'aspirin': {aspirin_smiles}")

alanine_smiles = three_letter_code_to_smiles("Ala")
print(f"[3-Letter -> SMILES] 'Ala': {alanine_smiles}")

water_smiles = chebi_id_to_smiles("15377")
print(f"[ChEBI ID -> SMILES] 'CHEBI:15377': {water_smiles}")

if aspirin_smiles:
    img_path = smiles_to_2d_image(aspirin_smiles, "aspirin_2d.png")
    print(f"[SMILES -> 2D Image] Saved structure rendering to: {img_path}")