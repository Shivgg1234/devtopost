# Acoustic Atlas

An offline-first Progressive Web App that uses an open-weight audio model to score how alive a place sounds, then builds a personal atlas of the best-sounding spots and times of day.

Built for the Hacktoberfest Open-Source AI Challenge, Week 1: Touch Grass.

Live demo: [deployed link]

## What it does

Most outdoor apps tell you where to go. Acoustic Atlas measures what a place actually sounds like.

1. Tap Listen at a spot and choose a duration (3, 5, or 10 minutes).
2. Put your phone in your pocket and listen outdoors. The screen shows only a dark countdown card.
3. When the timer ends, the phone vibrates and shows a Nature Score from 0 to 100.
4. Over time, the Atlas ranks your spots and shows the best time of day for each one.

The screen is meant to be the shortest part of the experience. The app is used to start and stop a session, and the rest of the time is spent outside.

## Privacy model

- Audio is processed in memory in short windows and discarded immediately after classification.
- Raw audio is never written to disk, never stored in IndexedDB, and never sent over the network.
- Only numeric results are stored: spot name, coordinates, timestamp, time-of-day bucket, duration, scores, and top detected sound classes.
- All data stays on the device in IndexedDB. There is no backend and no account.
- The About tab includes a Delete all my data button and an Export my data as JSON button.

## Offline architecture

- Static site: plain HTML, CSS, and JavaScript modules. No framework and no build step.
- Model: YAMNet, bundled locally in `/models`. It is not fetched from a CDN or TF Hub at runtime.
- Inference: TensorFlow.js, vendored locally in `/vendor`, running in the browser.
- Service worker: precaches the app shell, TensorFlow.js, the model files, and the class map. After the first visit, the app works in airplane mode.
- Storage: IndexedDB.
- Map: an optional Leaflet layer loads only when online. The app is fully usable without it.

## How the score is computed

YAMNet classifies audio into 521 AudioSet classes. Audio is resampled to 16 kHz mono and processed in windows of about 0.96 seconds.

For each window, class probabilities are summed into two groups defined in `config/classes.json`:

- NATURE: bird, bird vocalization, chirp, owl, crow, rooster, wind, rustling leaves, water, stream, waves, rain, thunder, insect, cricket, frog, and related animal sounds.
- HUMAN_NOISE: vehicle, car, truck, bus, motorcycle, traffic noise, engine, horn, siren, train, aircraft, construction, drill, speech, crowd, music, and machinery.

For a session:

```
mean_nature = average of nature group probability over all windows
mean_noise  = average of human noise group probability over all windows

nature_score = 100 * mean_nature / (mean_nature + mean_noise)
```

The app also reports:

- Birdsong share: the portion of the soundscape classified as bird sounds.
- Human noise share: the portion classified as human noise.
- Top 5 detected sound classes with percentages.

Edge cases:

- Very low total energy is reported as "very quiet" rather than a misleading score.
- Wind-only clips are flagged, because wind noise on a phone microphone can inflate the nature group.

## Atlas

- Sessions within about 150 m of each other, or sharing the same name, are grouped into one spot.
- Spots are ranked by average Nature Score.
- Each spot shows a bar chart by time-of-day bucket: dawn, morning, midday, afternoon, dusk, night.
- The Best place right now button recommends the highest-scoring known spot for the current time-of-day bucket, with distance if location is available.
- Demo mode loads clearly labeled sample sessions so you can explore the Atlas without a real listening session.

## Project structure

```
acoustic-atlas/
  index.html
  manifest.webmanifest
  service-worker.js
  css/
  js/
    app.js
    audio.js
    model.js
    scoring.js
    atlas.js
    storage.js
  config/
    classes.json
  models/
    yamnet/            model files (see setup below)
  data/
    yamnet_class_map.csv
  vendor/
    tf.min.js
  tests/
    scoring.test.js
    grouping.test.js
    fixtures/
  scripts/
    fetch-model.md
  LICENSE
  README.md
```

## Setup

### 1. Get the model files

The model must be downloaded once and placed locally so the app works offline. Follow `scripts/fetch-model.md`, which explains how to download the YAMNet TensorFlow.js model and class map and where to place them:

- Model files in `models/yamnet/`
- Class map CSV at `data/yamnet_class_map.csv`

### 2. Run locally

Any static file server works. For example:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Microphone access requires either `localhost` or HTTPS.

### 3. Run tests

```
npm install
npm test
```

The tests cover the scoring function and the spot-grouping logic using sample class-probability fixtures.

### 4. Verify offline behavior

1. Load the app once while online and wait for the model to finish loading.
2. Turn on airplane mode or disable the network in browser dev tools.
3. Reload the page and run a listening session.

## Deploy

The app is a static site, so it can be deployed on Render as a Static Site:

1. Push the repository to GitHub.
2. In Render, create a new Static Site and connect the repository.
3. Leave the build command empty and set the publish directory to `.`
4. Deploy. Render serves over HTTPS, which the microphone API requires.

GitHub Pages also works.

## Customizing the scoring

Edit `config/classes.json` to change what counts as nature or human noise for your region. For example, you can add class names for local wildlife, or move a sound such as running water into or out of the nature group. No code changes are needed.

## Known limitations

- YAMNet is a general sound event classifier. It does not identify bird species.
- Wind on a phone microphone can inflate or distort scores. Sheltered spots give more reliable results.
- Phone microphone quality varies between devices, so scores are best compared between sessions on the same phone.
- The Nature Score is a relative measure of the soundscape, not a scientific ecological index.
- The wake lock and vibration APIs are not supported in every browser.

## Roadmap

- Swap in BirdNET for species-level bird identification.
- Fine-tune the classifier for regional soundscapes.
- Optional weather and season tagging for each session.

## Why open

- The audio never leaves the device, which matters because ambient recordings can capture private conversations.
- It works without a signal, which is where the best-sounding places usually are.
- It costs nothing to run, with no per-minute audio API fees.
- Anyone can read, audit, and change how a score is computed.
- The model and the class mapping can be swapped or fine-tuned for any region.

## Credits and license

- YAMNet by Google, released under the Apache License 2.0, trained on AudioSet.
- TensorFlow.js by Google, released under the Apache License 2.0.
- Leaflet, optional, released under the BSD 2-Clause License.

This project is released under the [Apache-2.0 / MIT] license. See `LICENSE`.
