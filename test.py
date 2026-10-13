import urllib.parse
import urllib.request
import requests

import chemfunc

from pathlib import Path
from chemfunc import smiles_to_svg

from pathlib import Path

import numpy as np
import trimesh
from chemfunc.smiles_to_svg import smiles_to_svg
from rdkit import Chem
from rdkit.Chem import AllChem


def smiles_to_2d_svg(smiles: str, output_filename: str = "molecule.svg"):
    """Convert a SMILES string to a 2D SVG using chemfunc."""
    try:
        smiles_to_svg(smiles=smiles, save_path=Path(output_filename), width=400, height=400)
        print(f"Done SVG: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Failed to convert SMILES to SVG using chemfunc: {e}")
        return None


def smiles_to_3d_print_file(
    smiles: str,
    output_filename: str = "molecule.stl",
    scale: float = 10.0,          # mm per angstrom
    atom_scale: float = 0.3,      # fraction of van der Waals radius used for each ball
    bond_radius: float = 0.2,     # angstroms, before scaling
    include_hydrogens: bool = True,
    seed: int = 42,
):
    """Convert a SMILES string to a ball-and-stick STL for 3D printing."""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError(f"Invalid SMILES: {smiles}")

        # Hydrogens are needed for a sensible 3D embedding, even if not printed
        mol = Chem.AddHs(mol)
        params = AllChem.ETKDGv3()
        params.randomSeed = seed
        if AllChem.EmbedMolecule(mol, params) == -1:
            raise ValueError("3D embedding failed")
        AllChem.MMFFOptimizeMolecule(mol)  # best effort; skipped silently if no MMFF params

        conf = mol.GetConformer()
        pt = Chem.GetPeriodicTable()
        keep = {
            a.GetIdx() for a in mol.GetAtoms()
            if include_hydrogens or a.GetAtomicNum() != 1
        }
        pos = {i: np.array(conf.GetAtomPosition(i)) * scale for i in keep}

        parts = []

        # Atoms as spheres
        for i in keep:
            r = pt.GetRvdw(mol.GetAtomWithIdx(i).GetAtomicNum()) * atom_scale * scale
            ball = trimesh.creation.icosphere(subdivisions=3, radius=r)
            ball.apply_translation(pos[i])
            parts.append(ball)

        # Bonds as cylinders (multiple bonds are drawn as a single stick)
        for b in mol.GetBonds():
            i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
            if i in keep and j in keep:
                parts.append(
                    trimesh.creation.cylinder(
                        radius=bond_radius * scale, segment=[pos[i], pos[j]], sections=24
                    )
                )

        mesh = trimesh.util.concatenate(parts)

        # Center in XY and rest the lowest point on the build plate
        mesh.apply_translation(-np.array([
            mesh.bounds[:, 0].mean(), mesh.bounds[:, 1].mean(), mesh.bounds[0, 2]
        ]))

        mesh.export(output_filename)  # format inferred from extension (.stl, .obj, .ply, ...)
        print(f"Done 3D file: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Failed to convert SMILES to 3D print file: {e}")
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
    img_path = smiles_to_2d_svg(aspirin_smiles, "aspirin_2d.svg")
    smiles_to_3d_print_file(aspirin_smiles, "aspirin_2d.stl")
    print(f"[SMILES -> 2D Image] Saved structure rendering to: {img_path}")