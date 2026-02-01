from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from ultralytics import YOLO
from typing import List, Optional
import requests, io, os
from PIL import Image

# CONFIG
MODEL_PATH = r"D:\smart_parking\py\best.pt"  # change if needed
IMGSZ = 640
CONF = 0.25

app = FastAPI(title="YOLO Inference API")
model = YOLO(MODEL_PATH)  # load once at startup
CLASS_NAMES = model.names  # {0: "class0", ...}

class URLItem(BaseModel):
    image_url: str

class PathItem(BaseModel):
    image_path: str  # local path (e.g., C:/Users/farou/Pictures/img.jpg)

def run_predict(pil_img: Image.Image):
    results = model(pil_img, imgsz=IMGSZ, conf=CONF)
    dets = results[0].boxes
    out = []
    for i in range(len(dets)):
        xyxy = dets.xyxy[i].tolist()       # [x1,y1,x2,y2]
        conf = float(dets.conf[i].item())
        cls  = int(dets.cls[i].item())
        out.append({
            "x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3],
            "confidence": conf,
            "class_id": cls,
            "class_name": CLASS_NAMES.get(cls, str(cls))
        })
    return {"detections": out}

@app.post("/predict/url")
def predict_url(item: URLItem):
    try:
        r = requests.get(item.image_url, timeout=15)
        r.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")
    try:
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    return run_predict(img)

@app.post("/predict/path")
def predict_path(item: PathItem):
    if not os.path.exists(item.image_path):
        raise HTTPException(status_code=404, detail=f"File not found: {item.image_path}")
    try:
        img = Image.open(item.image_path).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to open image: {e}")
    return run_predict(img)

@app.post("/predict/file")
def predict_file(file: UploadFile = File(...)):
    try:
        img = Image.open(file.file).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid uploaded image: {e}")
    return run_predict(img)
