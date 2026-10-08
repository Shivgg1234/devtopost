# Model & Assets Download Guide for Acoustic Atlas

Acoustic Atlas is designed to operate 100% offline in airplane mode. All Machine Learning models, libraries, and lookup data are bundled locally in the web root.

---

## Direct Fetch Command

To download all required assets automatically, run:

```bash
./scripts/fetch-model.sh
```

---

## Asset Breakdown & Manual Placement Instructions

If you prefer to download files manually, place them in the following local directory locations:

### 1. TensorFlow.js Library
- **Path**: `lib/tf.min.js`
- **URL**: `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js`
- **Purpose**: Vendor bundle for browser ML execution without external CDN dependency.

### 2. AudioSet YAMNet Class Map CSV
- **Path**: `data/yamnet_class_map.csv`
- **URL**: `https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv`
- **Purpose**: Maps YAMNet model output tensor indices (0..520) to human-readable sound class names (e.g. "Bird", "Wind", "Car").

### 3. YAMNet TensorFlow.js Model Files
- **Target Folder**: `models/yamnet/`
- **Files**:
  - `model.json` (Model architecture definition)
  - `group1-shard1of4.bin`
  - `group1-shard2of4.bin`
  - `group1-shard3of4.bin`
  - `group1-shard4of4.bin`
- **Download Link**: `https://www.kaggle.com/api/v1/models/google/yamnet/tfJs/tfjs/1/download`
- **Instructions**: Extract the downloaded `.tar.gz` directly into `models/yamnet/`.

---

## Fallback Engine

If model files are missing or fails to load, Acoustic Atlas gracefully switches to a built-in Spectrum Audio Feature Classifier fallback that calculates frequency energy distributions directly in JS.
