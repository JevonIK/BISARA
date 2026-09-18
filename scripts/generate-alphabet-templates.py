"""Generate A-Z MediaPipe hand landmarks from the selected local MP4 clips.

Run with a Python environment containing mediapipe and opencv-python. The
generated JSON is committed so learners do not wait for video frame extraction.
"""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
import zipfile
from pathlib import Path

import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[1]
VIDEOS = ROOT / "public/media/bisindo-alphabet"
OUTPUT = ROOT / "public/data/alphabet-templates-v1.json"
VERSION = "alphabet-2026-09-18-2"
ARCHIVE = ROOT.parent.parent / "alfabet-bisindo" / "Indonesian Sign Language Dataset Alphabet  Video"
SOURCE_FILES = dict(re.findall(r"([A-Z]): '([^']+)'", (ROOT / "lib/alphabet-data.ts").read_text()))


def points(items):
    return [{"x": round(point.x, 5), "y": round(point.y, 5), "z": round(point.z, 5)} for point in items.landmark]


def extract(path, hands):
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open {path}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    frame_number = 0
    next_sample_ms = 0.0
    frames = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        time_ms = frame_number * 1000 / fps
        frame_number += 1
        if time_ms + 1 < next_sample_ms:
            continue
        next_sample_ms = time_ms + 90
        detected = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        observed = []
        for index, landmarks in enumerate(detected.multi_hand_landmarks or []):
            classification = detected.multi_handedness[index].classification[0]
            observed.append({
                "landmarks": points(landmarks),
                "handedness": classification.label,
                "confidence": round(classification.score, 5),
            })
        frames.append({"timeMs": round(time_ms), "hands": observed})
    capture.release()
    return frames


def main():
    frames_by_video = {}
    variants = {}
    variant_sources = {}
    sha_by_video = {}
    with mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.35,
        min_tracking_confidence=0.35,
    ) as hands:
        for letter in "abcdefghijklmnopqrstuvwxyz":
            filename = f"{letter}.mp4"
            path = VIDEOS / filename
            sha_by_video[filename] = hashlib.sha256(path.read_bytes()).hexdigest()
            frames = extract(path, hands)
            frames_by_video[filename] = frames
            if ARCHIVE.is_dir():
                with zipfile.ZipFile(ARCHIVE / f"{letter.upper()}.zip") as archive:
                    candidates = sorted(name for name in archive.namelist()
                                        if name.lower().endswith((".mov", ".mp4"))
                                        and Path(name).name != SOURCE_FILES[letter.upper()])
                    chosen = [candidates[len(candidates) // 3], candidates[2 * len(candidates) // 3]]
                    variants[filename] = []
                    variant_sources[filename] = chosen
                    with tempfile.TemporaryDirectory() as temporary:
                        for name in chosen:
                            variant_path = Path(temporary) / Path(name).name
                            variant_path.write_bytes(archive.read(name))
                            variants[filename].append(extract(variant_path, hands))
            print(f"{letter.upper()}: {sum(bool(frame['hands']) for frame in frames)}/{len(frames)} visible frames; {len(variants.get(filename, []))} variants", flush=True)
    OUTPUT.write_text(
        json.dumps({"version": VERSION, "frames": frames_by_video, "variants": variants,
                    "variantSources": variant_sources, "sourceSha256": sha_by_video}, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
