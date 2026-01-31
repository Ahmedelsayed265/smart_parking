import requests
import json
import os

def test_predict_path():
    url = "http://127.0.0.1:8000/predict/path"
    image_path = r"C:\Users\Nour Soft\Downloads\WhatsApp Image 2026-01-30 at 4.56.31 PM.jpeg"
    
    payload = {
        "image_path": image_path
    }
    
    print(f"Testing /predict/path with: {image_path}")
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("✅ Success!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")

def test_predict_file():
    url = "http://127.0.0.1:8000/predict/file"
    image_path = r"C:\Users\Nour Soft\Downloads\WhatsApp Image 2026-01-30 at 4.56.31 PM.jpeg"
    
    if not os.path.exists(image_path):
        print(f"⚠️ Local file not found at {image_path}, skipping file upload test.")
        return

    print(f"Testing /predict/file (upload) with: {image_path}")
    try:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = requests.post(url, files=files)
            
        if response.status_code == 200:
            print("✅ Success (Upload)!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    # You can choose which one to run
    print("--- Running Path Test ---")
    test_predict_path()
    print("\n--- Running File Upload Test ---")
    test_predict_file()
