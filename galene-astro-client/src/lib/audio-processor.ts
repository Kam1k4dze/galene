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
    const constraints = {
      echoCancellation: echoCancellation.get(),
      noiseSuppression: noiseSuppression.get(),
      autoGainControl: autoGainControl.get(),
    };
    await audioTrack.applyConstraints(constraints);
  } catch (e) {
    console.warn("Failed to apply audio constraints:", e);
  }

  // 2. If no complex processing is needed, return the raw track.
  // This bypasses the WebAudio graph for better stability when constraints are enough.
  if (!compressorEnabled.get() && !localInputAnalyser.get()) {
    return audioTrack;
  }

  // If the compressor is disabled, avoid creating the audio graph to minimize processing
  // and potential audio artifacts. Note that this means visualizers won't work for the local user.
  if (!compressorEnabled.get()) {
    return audioTrack;
  }

  // Create WebAudio graph only if compressor is enabled.
  const ctx = getAudioContext();
  if (!ctx) return audioTrack;

  try {
    if (processingNodes) {
      // cleanup old nodes?
      // Reuse or recreate? Recreating is safer for parameter updates.
      try {
        processingNodes.source.disconnect();
        processingNodes.compressor.disconnect();
        processingNodes.inputAnalyser.disconnect();
        processingNodes.outputAnalyser.disconnect();
        // processingNodes.destination.disconnect(); // Don't disconnect dest or we lose the stream?
      } catch (e) {
        /**/
      }
    }

    const source = ctx.createMediaStreamSource(rawStream);
    const destination = ctx.createMediaStreamDestination();

    const inputAnalyser = ctx.createAnalyser();
    inputAnalyser.fftSize = 256;
    inputAnalyser.smoothingTimeConstant = 0.5;

    const outputAnalyser = ctx.createAnalyser();
    outputAnalyser.fftSize = 256;
    outputAnalyser.smoothingTimeConstant = 0.5;

    const compressor = ctx.createDynamicsCompressor();
    // Apply compressor settings
    compressor.threshold.value = compressorThreshold.get();
    compressor.knee.value = 10;
    compressor.ratio.value = compressorRatio.get();
    compressor.attack.value = compressorAttack.get();
    compressor.release.value = compressorRelease.get();

    // Connect graph: Source -> InputAnalyser -> Compressor -> OutputAnalyser -> Destination
    source.connect(inputAnalyser);
    inputAnalyser.connect(compressor);
    compressor.connect(outputAnalyser);
    outputAnalyser.connect(destination);

    processingNodes = {
      source,
      compressor,
      inputAnalyser,
      outputAnalyser,
      destination,
    };

    localInputAnalyser.set(inputAnalyser);
    localOutputAnalyser.set(outputAnalyser);
    localAudioCompressor.set(compressor);

    // Start activity detection
    startLocalActivityDetection();

    return destination.stream.getAudioTracks()[0];
  } catch (e) {
    console.error("Error setting up audio graph:", e);
    return audioTrack;
  }
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
