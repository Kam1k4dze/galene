import { map, atom } from "nanostores";
import { persistentAtom, persistentMap } from "../lib/utils";

export type User = {
  username: string;
  permissions: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  streams: Record<string, boolean>;
};

export type Stream = {
  id: string;
  localId: string;
  stream: MediaStream;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userdata: any;
  active?: boolean;
  username?: string;
  _ts?: number;
};

export type ChatMessage = {
  id: string;
  username: string;
  time: Date;
  message: string;
  kind: string;
};

export const connectionState = atom<
  "disconnected" | "connecting" | "connected"
>("disconnected");
export const users = map<Record<string, User>>({});
export const streams = map<Record<string, Stream>>({});
export const chatMessages = atom<ChatMessage[]>([]);
export const localUser = atom<string | null>(null);
export const localPermissions = atom<string[]>([]);
export const localMediaStream = atom<MediaStream | null>(null);
export const localScreenshareStream = atom<MediaStream | null>(null);
export const isMuted = atom<boolean>(true);
export const isVideoOff = atom<boolean>(true);
export const audioDevices = atom<MediaDeviceInfo[]>([]);
export const videoDevices = atom<MediaDeviceInfo[]>([]);
export const selectedAudioDevice = persistentAtom<string | undefined>(
  "galene-audio-device",
  undefined
);
export const selectedVideoDevice = persistentAtom<string | undefined>(
  "galene-video-device",
  undefined
);
export const globalError = atom<string | null>(null);
export const userVolumes = persistentMap<Record<string, number>>(
  "galene-user-volumes",
  {}
);
export const localInputAnalyser = atom<AnalyserNode | null>(null);
export const localOutputAnalyser = atom<AnalyserNode | null>(null);
export const localAudioCompressor = atom<DynamicsCompressorNode | null>(null);
export const localUserActive = atom<boolean>(false);

export type FileTransferState = {
  id: string;
  sender: string;
  name: string;
  size: number;
  status: string;
  up: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any; // The protocol.js transfer object
};

export const fileTransfers = map<Record<string, FileTransferState>>({});

// Audio Settings
export const echoCancellation = persistentAtom<boolean>(
  "galene-echo-cancellation",
  true
);
export const noiseSuppression = persistentAtom<boolean>(
  "galene-noise-suppression",
  true
);
export const autoGainControl = persistentAtom<boolean>(
  "galene-auto-gain-control",
  true
);
export const compressorEnabled = persistentAtom<boolean>(
  "galene-compressor-enabled",
  false
); // Default to false for robustness

// Compressor Parameters
export const compressorThreshold = persistentAtom<number>(
  "galene-compressor-threshold",
  -24
); // dB
export const compressorRatio = persistentAtom<number>(
  "galene-compressor-ratio",
  4
); // Relaxed from 12
export const compressorAttack = persistentAtom<number>(
  "galene-compressor-attack",
  0.003
); // seconds
export const compressorRelease = persistentAtom<number>(
  "galene-compressor-release",
  0.25
); // seconds
