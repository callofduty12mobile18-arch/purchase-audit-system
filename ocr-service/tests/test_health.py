import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ocr_lang" in data
    assert data["max_file_size_mb"] > 0
    assert "application/pdf" in data["supported_formats"]


def test_invalid_file_type():
    response = client.post(
        "/ocr/invoice",
        files={"file": ("test.exe", b"invalid binary content", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_empty_file_upload():
    response = client.post(
        "/ocr/invoice",
        files={"file": ("test.png", b"", "image/png")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]
