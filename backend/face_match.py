"""
Demo face match for the SIM swap KYC step.

Detects a face in the ID photo and the live selfie, then compares the crops.
Photos are not written to disk. This is not a certified identity check.
"""

import base64
import binascii
from typing import Tuple

import numpy as np

FACE_PASS_SCORE = 45


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

    id_hist = cv2.calcHist([id_face], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    selfie_hist = cv2.calcHist([selfie_face], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(id_hist, id_hist)
    cv2.normalize(selfie_hist, selfie_hist)
    correl = float(cv2.compareHist(id_hist, selfie_hist, cv2.HISTCMP_CORREL))
    score = int(round(max(0.0, min(1.0, (correl + 1.0) / 2.0)) * 100))
    del id_face, selfie_face, id_hist, selfie_hist

    if score >= FACE_PASS_SCORE:
        return score, "Faces are similar enough for this demo check."
    return score, "Faces do not match closely enough."
