import { getAudioContext } from "./audio";
import {
  localInputAnalyser,
  localOutputAnalyser,
  localAudioCompressor,
  localUserActive,
  echoCancellation,
  noiseSuppression,
  autoGainControl,
  compressorEnabled,
  compressorThreshold,
  compressorRatio,
  compressorAttack,
  compressorRelease,
  isMuted,
} from "../stores/state";

let processingNodes: {
  source: MediaStreamAudioSourceNode;
  compressor: DynamicsCompressorNode;
  inputAnalyser: AnalyserNode;
  outputAnalyser: AnalyserNode;
  destination: MediaStreamAudioDestinationNode;
} | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activityInterval: any = null;
let currentRawStream: MediaStream | null = null;

export const startLocalActivityDetection = () => {
  if (activityInterval) clearInterval(activityInterval);

  activityInterval = setInterval(() => {
    const analyser = localOutputAnalyser.get();
    const muted = isMuted.get();

    if (!analyser || muted) {
      if (localUserActive.get()) localUserActive.set(false);
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const db = 20 * Math.log10(rms || 0.00001);

    // Threshold for voice activity (e.g. -50dB)
    const isActive = db > -50;

    if (localUserActive.get() !== isActive) {
      localUserActive.set(isActive);
    }
  }, 100); // Check every 100ms
};

export const stopLocalActivityDetection = () => {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
  localUserActive.set(false);
};

export const resetAudioProcessor = () => {
  stopLocalActivityDetection();
  processingNodes = null;
  localInputAnalyser.set(null);
  localOutputAnalyser.set(null);
  localAudioCompressor.set(null);
  currentRawStream = null;
};

export const updateAudioProcessing = async (
  rawStream: MediaStream | null
): Promise<MediaStreamTrack | null> => {
  currentRawStream = rawStream;
  if (!rawStream) return null;

  const audioTrack = rawStream.getAudioTracks()[0];
  if (!audioTrack) return null;

  // Ensure raw track is enabled so it feeds the graph
  audioTrack.enabled = true;

  console.log("[AudioProcessing] Updating filters...");

  // 1. Apply constraints (Echo, Noise, AGC)
  try {
    await audioTrack.applyConstraints({
      echoCancellation: echoCancellation.get(),
      noiseSuppression: noiseSuppression.get(),
      autoGainControl: autoGainControl.get(),
    });
  } catch (e) {
    console.warn("Failed to apply audio constraints:", e);
  }

  // 2. Handle Compressor (Web Audio API)
  const useCompressor = compressorEnabled.get();
  let finalTrack = audioTrack;

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (!processingNodes) {
      console.log("[AudioProcessing] Creating audio nodes");
      const source = ctx.createMediaStreamSource(rawStream);
      const inputAnalyser = ctx.createAnalyser();
      const compressor = ctx.createDynamicsCompressor();
      const outputAnalyser = ctx.createAnalyser();
      const destination = ctx.createMediaStreamDestination();

      // Configure analysers
      inputAnalyser.fftSize = 2048;
      inputAnalyser.smoothingTimeConstant = 0.8;
      outputAnalyser.fftSize = 2048;
      outputAnalyser.smoothingTimeConstant = 0.8;

      // Chain: Source -> InputAnalyser -> Compressor -> OutputAnalyser -> Destination
      source.connect(inputAnalyser);
      inputAnalyser.connect(compressor);
      compressor.connect(outputAnalyser);
      outputAnalyser.connect(destination);

      processingNodes = {
        source,
        inputAnalyser,
        compressor,
        outputAnalyser,
        destination,
      };
      localInputAnalyser.set(inputAnalyser);
      localOutputAnalyser.set(outputAnalyser);
      localAudioCompressor.set(compressor);

      // Start local activity detection
      startLocalActivityDetection();
    }

    const { compressor, destination } = processingNodes;

    if (useCompressor) {
      // Update compressor settings
      const thresh = compressorThreshold.get();
      const ratio = compressorRatio.get();
      const attack = compressorAttack.get();
      const release = compressorRelease.get();

      const now = ctx.currentTime;
      compressor.threshold.setTargetAtTime(thresh, now, 0.1);
      compressor.ratio.setTargetAtTime(ratio, now, 0.1);
      compressor.attack.setTargetAtTime(attack, now, 0.1);
      compressor.release.setTargetAtTime(release, now, 0.1);
      compressor.knee.value = 30;
    } else {
      // Disable compression (1:1 ratio)
      const now = ctx.currentTime;
      compressor.threshold.setTargetAtTime(0, now, 0.1);
      compressor.ratio.setTargetAtTime(1, now, 0.1);
    }

    const destTrack = destination.stream.getAudioTracks()[0];
    if (destTrack) {
      finalTrack = destTrack;
    }
  }

  return finalTrack;
};

// Subscribe to settings changes
const handleSettingsChange = () => {
  if (currentRawStream) {
    updateAudioProcessing(currentRawStream);
  }
};

echoCancellation.subscribe(handleSettingsChange);
noiseSuppression.subscribe(handleSettingsChange);
autoGainControl.subscribe(handleSettingsChange);
compressorEnabled.subscribe(handleSettingsChange);
compressorThreshold.subscribe(handleSettingsChange);
compressorRatio.subscribe(handleSettingsChange);
compressorAttack.subscribe(handleSettingsChange);
compressorRelease.subscribe(handleSettingsChange);
