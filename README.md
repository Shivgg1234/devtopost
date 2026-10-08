# 🌿 Acoustic Atlas

**Acoustic Atlas** is a static, offline-first Progressive Web App (PWA) that uses an on-device TensorFlow.js Machine Learning model (**YAMNet**) to score how "alive" a natural location sounds, building a personal atlas of the best-sounding spots and times.

---

## 🎯 Core Philosophy & Privacy Model

The screen is designed to be the shortest part of the experience:
1. Tap **Start Listening** (pick 3, 5, or 10 minutes).
2. Put the phone in your pocket and listen outdoors.
3. Get a **Nature Score (0–100)**, top sound breakdown, birdsong share, and optimal time-of-day recommendation.

### Zero Audio Uploads & 100% On-Device
- **In-Memory Streaming**: Microphone audio is resampled to 16 kHz mono in RAM, sliced into ~0.96s windows (15,360 samples), evaluated by YAMNet, and **immediately discarded**.
- **No Audio Saved or Uploaded**: Raw audio is **NEVER** stored on disk or transmitted over any network. Only numeric score aggregates are stored locally.
- **No Accounts or Backend**: Data stays strictly inside your browser's IndexedDB.

---

## 🏗️ Offline Architecture

Acoustic Atlas runs 100% offline in airplane mode after initial page load:
- **No CDN or Runtime Network Requests**: TensorFlow.js (`lib/tf.min.js`), AudioSet label mappings (`data/yamnet_class_map.csv`), and YAMNet graph model weights (`models/yamnet/`) are bundled locally.
- **Service Worker (`sw.js`)**: Precaching strategy caches the app shell, vendored scripts, config files, and model shards.
- **IndexedDB (`js/db.js`)**: Persistent offline storage for listening sessions, spot rankings, and JSON export/import.
- **Graceful Map Degradation**: Features an offline HTML5 Canvas scatter plot for spot mapping, with an optional online Leaflet map layer that activates when connected.

---

## 🧮 How the Nature Score is Computed

Audio is processed in contiguous ~0.96-second windows. For each window, YAMNet predicts probabilities across 521 AudioSet classes.

Classes are categorized in `config/classes.json`:
- **NATURE**: Bird, bird call, chirp/tweet, owl, crow, wind, rustling leaves, water, stream, rain, insect, cricket, frog, etc.
- **HUMAN_NOISE**: Vehicle, car, truck, bus, traffic noise, engine, horn, siren, train, aircraft, construction, drill, speech, crowd, music, etc.

### Scoring Formula

$$\text{Nature Score} = \left( \frac{\text{mean}(P_{\text{nature}})}{\text{mean}(P_{\text{nature}}) + \text{mean}(P_{\text{human\_noise}})} \right) \times 100$$

- **Birdsong Share**: Fraction of nature sound probability attributed specifically to avian classes.
- **Human Noise Share**: Fraction of sound budget attributed to anthropogenic noise.
- **Silence & Wind Edge Case Handling**:
  - Audio windows with RMS energy $< 0.005$ are flagged as **Very Quiet** ambient areas to prevent noisy ratio skews.
  - Microphone wind noise ($> 35\%$ top class confidence) is flagged to distinguish microphone rustle from ambient breeze.

---

## 📦 Downloading & Placing Model Files

All model dependencies can be downloaded automatically using the bundled fetch script:

```bash
./scripts/fetch-model.sh
```

Or view detailed manual placement instructions in [`scripts/fetch-model.md`](file:///Users/tanishqgupta/project10/scripts/fetch-model.md):

- `lib/tf.min.js`: TensorFlow.js library vendor bundle.
- `data/yamnet_class_map.csv`: AudioSet 521 class label mapping CSV.
- `models/yamnet/model.json` + `group1-shard*.bin`: YAMNet TF.js Graph Model weights.

---

## 🚀 Running Locally

Because Acoustic Atlas uses standard ES modules and Service Workers, run it using any local static HTTP web server:

### Option 1: Python HTTP Server (Built-in)
```bash
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node `npx serve`
```bash
npx serve .
```

### Option 3: Run Unit Tests
```bash
node tests/run-tests.js
```

---

## 🌐 Deploying as a Static Site (Render / GitHub Pages)

Since there is no build step or backend required:

### Render
1. Create a new **Static Site** on Render.
2. Set Build Command to: `./scripts/fetch-model.sh` (or leave empty if repository already includes `/models` and `/lib`).
3. Set Publish Directory to: `./`

### GitHub Pages
1. Push the repository to GitHub.
2. Navigate to **Settings > Pages**.
3. Set Source to **Deploy from a branch** (`main` / root `/`).

---

## ⚙️ Customizing `config/classes.json`

You can tailor sound classifications directly in [`config/classes.json`](file:///Users/tanishqgupta/project10/config/classes.json):

```json
{
  "NATURE": [
    "Bird",
    "Chirp, tweet",
    "Wind",
    "Stream",
    "Cricket"
  ],
  "HUMAN_NOISE": [
    "Car",
    "Traffic noise",
    "Sirens",
    "Speech"
  ]
}
```

---

## ⚠️ Known Limitations

1. **YAMNet is a General Sound Classifier**: YAMNet is trained on AudioSet to identify broad sound categories (e.g. "Bird", "Wind", "Car passing by"). It is **not** a species-level bird identification model.
2. **Microphone Hardware Differences**: Phone microphone frequency responses and auto-gain control vary by device.
3. **Wind Noise on Microphone**: Physical wind blowing directly against unshielded phone microphones can generate low-frequency turbulence. The app flags wind noise, but shielding the mic in pockets helps.

---

## 🌟 Stretch Goal: BirdNET Integration

> **Planned Upgrade**: Swap or combine YAMNet with **BirdNET** (Cornell Lab of Ornithology) converted to ONNX / WebAssembly for on-device **species-level bird identification** (e.g. identifying *American Robin*, *Song Sparrow*, or *Eurasian Blackbird* alongside the Nature Score).

---

## 📄 License & Credits

- Acoustic Atlas is released under the [Apache-2.0 License](file:///Users/tanishqgupta/project10/LICENSE).
- Includes attributions to Google YAMNet, AudioSet dataset, and TensorFlow.js.
