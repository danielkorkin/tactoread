import os
import tempfile
import time
import uuid
from pathlib import Path

temp_path = Path(tempfile.gettempdir()) / "tactoread"


def sweep_temp(max_age=300) -> None:
    """Drop files leaked by failed requests so a warm instance's /tmp can't fill up."""
    cutoff = time.time() - max_age
    for f in temp_path.glob("*.stl"):
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
        except OSError:
            pass


def create_temp(file_in) -> Path:
    sweep_temp()
    gen_uuid = str(uuid.uuid4())
    file_path = temp_path / f"{gen_uuid}.stl"

    os.makedirs(file_path.parent, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(file_in)

    return file_path


def create_temp_name() -> Path:
    sweep_temp()
    gen_uuid = str(uuid.uuid4())
    file_path = temp_path / f"{gen_uuid}.stl"

    os.makedirs(file_path.parent, exist_ok=True)

    return file_path


def delete_temp(file_uuid: str) -> None:
    file_path = temp_path / f"{file_uuid}.stl"
    file_path.unlink(missing_ok=True)
