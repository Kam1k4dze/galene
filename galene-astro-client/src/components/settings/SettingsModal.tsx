import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { galene } from "../../stores/galene";
import {
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  echoCancellation,
  noiseSuppression,
  autoGainControl,
  compressorEnabled,
  compressorThreshold,
  compressorRatio,
  compressorAttack,
  compressorRelease,
} from "../../stores/state";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import { X, Info } from "lucide-react";
import { CompressorVisualizer } from "./CompressorVisualizer";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const audioDevs = useStore(audioDevices);
  const videoDevs = useStore(videoDevices);
  const selAudio = useStore(selectedAudioDevice);
  const selVideo = useStore(selectedVideoDevice);
  const echo = useStore(echoCancellation);
  const noise = useStore(noiseSuppression);
  const agc = useStore(autoGainControl);
  const comp = useStore(compressorEnabled);
  const storeThresh = useStore(compressorThreshold);
  const storeRatio = useStore(compressorRatio);
  const storeAttack = useStore(compressorAttack);
  const storeRelease = useStore(compressorRelease);

  // Local state for sliders to allow smooth dragging
  const [localThresh, setLocalThresh] = useState(storeThresh);
  const [localRatio, setLocalRatio] = useState(storeRatio);
  const [localAttack, setLocalAttack] = useState(storeAttack);
  const [localRelease, setLocalRelease] = useState(storeRelease);

  // Sync local state when store changes externally (e.g. initial load)
  useEffect(() => {
    setLocalThresh(storeThresh);
  }, [storeThresh]);
  useEffect(() => {
    setLocalRatio(storeRatio);
  }, [storeRatio]);
  useEffect(() => {
    setLocalAttack(storeAttack);
  }, [storeAttack]);
  useEffect(() => {
    setLocalRelease(storeRelease);
  }, [storeRelease]);

  // Debounced updates to store
  const debouncedThresh = useDebounce(localThresh, 100);
  const debouncedRatio = useDebounce(localRatio, 100);
  const debouncedAttack = useDebounce(localAttack, 100);
  const debouncedRelease = useDebounce(localRelease, 100);

  useEffect(() => {
    compressorThreshold.set(debouncedThresh);
  }, [debouncedThresh]);
  useEffect(() => {
    compressorRatio.set(debouncedRatio);
  }, [debouncedRatio]);
  useEffect(() => {
    compressorAttack.set(debouncedAttack);
  }, [debouncedAttack]);
  useEffect(() => {
    compressorRelease.set(debouncedRelease);
  }, [debouncedRelease]);

  useEffect(() => {
    if (isOpen) {
      galene.getDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Tooltip content="Select the input device for your audio.">
              <label
                htmlFor="mic-select"
                className="text-sm font-medium text-zinc-300 cursor-help"
              >
                Microphone
              </label>
            </Tooltip>
            <select
              id="mic-select"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selAudio || ""}
              onChange={(e) => selectedAudioDevice.set(e.target.value)}
            >
              <option value="">Default</option>
              {audioDevs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Tooltip content="Select the input device for your video.">
              <label
                htmlFor="cam-select"
                className="text-sm font-medium text-zinc-300 cursor-help"
              >
                Camera
              </label>
            </Tooltip>
            <select
              id="cam-select"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selVideo || ""}
              onChange={(e) => selectedVideoDevice.set(e.target.value)}
            >
              <option value="">Default</option>
              {videoDevs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">
              Audio Processing
            </h3>

            <div className="flex items-center justify-between">
              <Tooltip content="Removes audio feedback from speakers.">
                <label
                  htmlFor="echo-check"
                  className="text-sm text-zinc-300 cursor-help"
                >
                  Echo Cancellation
                </label>
              </Tooltip>
              <input
                id="echo-check"
                type="checkbox"
                checked={echo}
                onChange={(e) => echoCancellation.set(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <Tooltip content="Filters out background noise.">
                <label
                  htmlFor="noise-check"
                  className="text-sm text-zinc-300 cursor-help"
                >
                  Noise Suppression
                </label>
              </Tooltip>
              <input
                id="noise-check"
                type="checkbox"
                checked={noise}
                onChange={(e) => noiseSuppression.set(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <Tooltip content="Automatically adjusts microphone volume.">
                <label
                  htmlFor="agc-check"
                  className="text-sm text-zinc-300 cursor-help"
                >
                  Auto Gain Control
                </label>
              </Tooltip>
              <input
                id="agc-check"
                type="checkbox"
                checked={agc}
                onChange={(e) => autoGainControl.set(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <Tooltip content="Reduces the dynamic range of audio.">
                <label
                  htmlFor="comp-check"
                  className="text-sm text-zinc-300 cursor-help"
                >
                  Audio Compressor
                </label>
              </Tooltip>
              <input
                id="comp-check"
                type="checkbox"
                checked={comp}
                onChange={(e) => compressorEnabled.set(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {comp && (
              <div className="space-y-3 pl-4 border-l-2 border-zinc-800 mt-2">
                <div className="mb-2">
                  <CompressorVisualizer />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Tooltip content="Level above which compression starts.">
                      <label
                        htmlFor="thresh-range"
                        className="text-xs text-zinc-400 cursor-help"
                      >
                        Threshold ({localThresh} dB)
                      </label>
                    </Tooltip>
                  </div>
                  <input
                    id="thresh-range"
                    type="range"
                    min="-100"
                    max="0"
                    step="1"
                    value={localThresh}
                    onChange={(e) => setLocalThresh(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Tooltip content="Amount of compression applied.">
                      <label
                        htmlFor="ratio-range"
                        className="text-xs text-zinc-400 cursor-help"
                      >
                        Ratio ({localRatio}:1)
                      </label>
                    </Tooltip>
                  </div>
                  <input
                    id="ratio-range"
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={localRatio}
                    onChange={(e) => setLocalRatio(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Tooltip content="How quickly compression starts.">
                      <label
                        htmlFor="attack-range"
                        className="text-xs text-zinc-400 cursor-help"
                      >
                        Attack ({localAttack}s)
                      </label>
                    </Tooltip>
                  </div>
                  <input
                    id="attack-range"
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={localAttack}
                    onChange={(e) => setLocalAttack(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Tooltip content="How quickly compression stops.">
                      <label
                        htmlFor="release-range"
                        className="text-xs text-zinc-400 cursor-help"
                      >
                        Release ({localRelease}s)
                      </label>
                    </Tooltip>
                  </div>
                  <input
                    id="release-range"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={localRelease}
                    onChange={(e) => setLocalRelease(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 rounded bg-zinc-800/50 p-3 text-xs text-zinc-400 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Echo Cancellation, Noise Suppression, and AGC are
                hardware/browser-level filters. They are either On or Off and
                cannot be fine-tuned. The Compressor is a software effect
                applied after these filters.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          {/* Done button removed as requested */}
        </div>
      </div>
    </div>
  );
}
