"""
Face match for the SIM swap identity step.

Gemini looks at the ID photo and the live face. If it does not answer,
the OpenCV crop comparison is the backup. Photos are not written to disk.
This is not a certified identity check.
"""

import base64
import binascii
import json
import logging
import os
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
from dotenv import load_dotenv

logger = logging.getLogger("chapaa.face_match")

FACE_PASS_SCORE = 50


class FaceMatchError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _decode_image(payload: str):
    import cv2

    raw = payload.strip()
    if "," in raw and raw.startswith("data:"):
        raw = raw.split(",", 1)[1]
    try:
        data = base64.b64decode(raw, validate=True)
    except binascii.Error as exc:
        raise FaceMatchError("One of the photos is not valid image data.") from exc
    if len(data) > 2_000_000:
        raise FaceMatchError("Photo is too large. Use a smaller capture.")
    if len(data) < 500:
        raise FaceMatchError("Photo is empty.")
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise FaceMatchError("Could not read that photo. Capture it again.")
    return data, image


def _largest_face(image):
    import cv2

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
    pad = int(0.15 * max(w, h))
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(image.shape[1], x + w + pad)
    y1 = min(image.shape[0], y + h + pad)
    crop = image[y0:y1, x0:x1]
    if crop.size == 0:
        return None
    return cv2.resize(crop, (128, 128))


async def judge_faces(id_photo: str, selfie: str) -> Tuple[int, str]:
    """Prefer a model judgement. Fall back to the crop comparison."""
    id_bytes, _id_image = _decode_image(id_photo)
    selfie_bytes, _selfie_image = _decode_image(selfie)
    if id_bytes == selfie_bytes:
        raise FaceMatchError("The selfie is the same file as the ID photo. Capture a live selfie.")

    judged = await _gemini_faces(id_bytes, selfie_bytes)
    if judged is not None:
        return judged
    return compare_faces(id_photo, selfie)


async def _gemini_faces(id_bytes: bytes, selfie_bytes: bytes) -> Optional[Tuple[int, str]]:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip().strip('"').strip("'")
    if not api_key:
        return None
    model = (os.getenv("LLM_MODEL") or "gemini-3.8-flash").strip().strip('"').strip("'")
    if "tts" in model:
        model = "gemini-3.8-flash"
    prompt = (
        "Image 1 is an identity document. Image 2 is a live camera photo. "
        "Decide whether the face on the document and the face in the live photo are the same person. "
        "Reply with JSON only. "
        'Schema: {"same_person":false,"score":0,"no_face":"id|selfie|none","reason":"short"}. '
        "score is 0 to 100. Use no_face id or selfie when that photo has no face. "
        "If you are not sure they are the same person, same_person must be false."
    )
    request = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(id_bytes).decode("ascii")}},
                {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(selfie_bytes).decode("ascii")}},
            ]
        }],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json",
        },
    }
    models = [model] if model == "gemini-flash-latest" else [model, "gemini-flash-latest"]
    payload = None
    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            for chosen in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen}:generateContent"
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                    json=request,
                )
                if response.status_code in {429, 503}:
                    continue
                response.raise_for_status()
                payload = response.json()
                break
    except Exception as exc:
        logger.warning("Face model skipped: %s", exc)
        return None
    if not payload:
        return None

    parts = ((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    raw = " ".join(str(part.get("text") or "") for part in parts if not part.get("thought"))
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        logger.warning("Face model skipped: response was not JSON")
        return None
    try:
        parsed = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None

    missing = str(parsed.get("no_face") or "none").lower()
    if missing == "id":
        raise FaceMatchError("No face found on the ID photo. Hold the photo closer to the camera.")
    if missing == "selfie":
        raise FaceMatchError("No face found in the selfie. Look at the camera and try again.")

    try:
        score = int(parsed.get("score") or 0)
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))
    same = bool(parsed.get("same_person"))
    if same and score >= 60:
        return score, "The ID face and the live face match."
    if same:
        return min(score, 49), "The match is not confident enough."
    return min(score, 40), "The ID face and the live face are different."


def compare_faces(id_photo: str, selfie: str) -> Tuple[int, str]:
    """
    Return a 0-100 similarity score and a short reason.
    Raises FaceMatchError when a photo cannot be used.
    """
    try:
        import cv2
    except ImportError as exc:
        raise FaceMatchError(
            "Face matching is unavailable. Install opencv-python-headless in the API environment."
        ) from exc

    id_bytes, id_image = _decode_image(id_photo)
    selfie_bytes, selfie_image = _decode_image(selfie)
    if id_bytes == selfie_bytes:
        raise FaceMatchError("The selfie is the same file as the ID photo. Capture a live selfie.")

    id_face = _largest_face(id_image)
    selfie_face = _largest_face(selfie_image)
    del id_bytes, selfie_bytes, id_image, selfie_image

    if id_face is None:
        raise FaceMatchError("No face found on the ID photo. Hold the photo closer to the camera.")
    if selfie_face is None:
        raise FaceMatchError("No face found in the selfie. Look at the camera and try again.")

    score = _lighting_stable_score(id_face, selfie_face)
    del id_face, selfie_face

    if score >= FACE_PASS_SCORE:
        return score, "Faces are similar enough for this demo check."
    return score, "Faces do not match closely enough."


def _lighting_stable_score(id_face, selfie_face) -> int:
    """
    Compare equalized grayscale crops. Color histograms fail when an ID photo
    and a live selfie are lit differently; structure still lines up.
    """
    import cv2

    id_eq = _equalize(id_face)
    selfie_eq = _equalize(selfie_face)
    id_hist = cv2.calcHist([id_eq], [0], None, [32], [0, 256])
    selfie_hist = cv2.calcHist([selfie_eq], [0], None, [32], [0, 256])
    cv2.normalize(id_hist, id_hist)
    cv2.normalize(selfie_hist, selfie_hist)
    correl = float(cv2.compareHist(id_hist, selfie_hist, cv2.HISTCMP_CORREL))
    hist_score = (correl + 1.0) / 2.0 * 100.0
    ncc = float(cv2.matchTemplate(id_eq, selfie_eq, cv2.TM_CCOEFF_NORMED)[0, 0])
    struct_score = (ncc + 1.0) / 2.0 * 100.0
    blended = 0.25 * hist_score + 0.75 * struct_score
    return int(round(max(0.0, min(100.0, blended))))


def _equalize(face_bgr):
    import cv2

    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)
