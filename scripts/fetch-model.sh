#!/usr/bin/env bash
set -e

# Fetch script for Acoustic Atlas model dependencies
# Downloads TensorFlow.js library, YAMNet model weights, and AudioSet class map CSV

echo "==> Preparing target directories..."
mkdir -p lib models/yamnet data

echo "==> Downloading TensorFlow.js library vendor bundle..."
curl -sSL "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js" -o lib/tf.min.js

echo "==> Downloading AudioSet YAMNet Class Map CSV..."
curl -sSL "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv" -o data/yamnet_class_map.csv

echo "==> Downloading and extracting YAMNet TF.js model bundle from Kaggle Models..."
curl -sSL "https://www.kaggle.com/api/v1/models/google/yamnet/tfJs/tfjs/1/download" | tar -xz -C models/yamnet/

echo "==> Verification:"
ls -lh lib/tf.min.js data/yamnet_class_map.csv models/yamnet/

echo "==> Model fetch complete! App is ready for 100% offline local usage."
