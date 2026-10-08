/**
 * Acoustic Atlas - Web Audio Processor
 * Captures microphone stream, resamples PCM to 16 kHz mono in real time,
 * slices ~0.96s (15,360 sample) windows for YAMNet, and discards raw audio immediately.
 */

export class AudioProcessor {
  constructor() {
    this.audioCtx = null;
    this.stream = null;
    this.sourceNode = null;
    this.scriptNode = null;
    this.isRecording = false;

    this.TARGET_SAMPLE_RATE = 16000;
    this.WINDOW_SIZE = 15360; // 0.96 sec @ 16kHz

    this.sampleBuffer = new Float32Array(0);
    this.onWindowReady = null;
    this.onAudioLevel = null;
  }

  async startRecording(onWindowReadyCallback, onAudioLevelCallback) {
    if (this.isRecording) return;

    this.onWindowReady = onWindowReadyCallback;
    this.onAudioLevel = onAudioLevelCallback;
    this.sampleBuffer = new Float32Array(0);

    try {
      // 1. Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      });

      // 2. Initialize AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Ensure AudioContext is active (fix browser autoplay policies)
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const inputSampleRate = this.audioCtx.sampleRate;
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

      // Create ScriptProcessorNode for wide browser compatibility (4096 buffer size)
      this.scriptNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

      this.scriptNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const rawChannelData = event.inputBuffer.getChannelData(0);

        // Calculate live RMS energy for audio visualizer
        let sumSq = 0;
        for (let i = 0; i < rawChannelData.length; i++) {
          sumSq += rawChannelData[i] * rawChannelData[i];
        }
        const liveRms = Math.sqrt(sumSq / rawChannelData.length);

        if (this.onAudioLevel) {
          this.onAudioLevel(liveRms);
        }

        // Resample audio to 16,000 Hz if needed
        const resampled = this.resampleTo16k(rawChannelData, inputSampleRate);

        // Append to accumulation buffer
        this.appendSamples(resampled);

        // Slice full 15,360 sample windows (~0.96 sec)
        while (this.sampleBuffer.length >= this.WINDOW_SIZE) {
          const windowSamples = this.sampleBuffer.slice(0, this.WINDOW_SIZE);
          this.sampleBuffer = this.sampleBuffer.slice(this.WINDOW_SIZE);

          // Calculate window RMS
          let windowSumSq = 0;
          for (let i = 0; i < windowSamples.length; i++) {
            windowSumSq += windowSamples[i] * windowSamples[i];
          }
          const windowRms = Math.sqrt(windowSumSq / windowSamples.length);

          if (this.onWindowReady) {
            this.onWindowReady(windowSamples, windowRms);
          }

          // Discard memory: buffer is sliced out and original windowSamples will be garbage collected!
        }
      };

      this.sourceNode.connect(this.scriptNode);
      this.scriptNode.connect(this.audioCtx.destination);
      this.isRecording = true;

    } catch (err) {
      this.stopRecording();
      throw new Error(`Microphone access error: ${err.message}`);
    }
  }

  resampleTo16k(samples, fromSampleRate) {
    if (fromSampleRate === this.TARGET_SAMPLE_RATE) {
      return samples;
    }

    const ratio = fromSampleRate / this.TARGET_SAMPLE_RATE;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originIdx = i * ratio;
      const index1 = Math.floor(originIdx);
      const index2 = Math.min(index1 + 1, samples.length - 1);
      const interpolationFactor = originIdx - index1;

      result[i] = samples[index1] * (1 - interpolationFactor) + samples[index2] * interpolationFactor;
    }

    return result;
  }

  appendSamples(newSamples) {
    const combined = new Float32Array(this.sampleBuffer.length + newSamples.length);
    combined.set(this.sampleBuffer, 0);
    combined.set(newSamples, this.sampleBuffer.length);
    this.sampleBuffer = combined;
  }

  stopRecording() {
    this.isRecording = false;

    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    // Explicitly wipe buffer memory
    this.sampleBuffer = new Float32Array(0);
  }
}

export const audioProcessor = new AudioProcessor();
