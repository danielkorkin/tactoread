import os
import tempfile
import uuid
from pathlib import Path

temp_path = Path(tempfile.gettempdir()) / "tactoread"


def create_temp(file_in) -> Path:
    gen_uuid = str(uuid.uuid4())
    file_path = temp_path / f"{gen_uuid}.stl"

    os.makedirs(file_path.parent, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(file_in)

    return file_path


def create_temp_name() -> Path:
    gen_uuid = str(uuid.uuid4())
    file_path = temp_path / f"{gen_uuid}.stl"

    os.makedirs(file_path.parent, exist_ok=True)

    return file_path


def delete_temp(file_uuid: str) -> None:
    file_path = temp_path / f"{file_uuid}.stl"
    file_path.unlink()
