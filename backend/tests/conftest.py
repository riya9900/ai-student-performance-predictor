import os
import tempfile
from pathlib import Path

# Use a throw-away DB so tests never touch real history. Must be set BEFORE importing the app.
os.environ["DATABASE_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:  # triggers lifespan: init DB + load model
        yield c
