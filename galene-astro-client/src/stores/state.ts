import { map, atom } from "nanostores";

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
export const selectedAudioDevice = atom<string | undefined>(undefined);
export const selectedVideoDevice = atom<string | undefined>(undefined);
export const globalError = atom<string | null>(null);
export const userVolumes = map<Record<string, number>>({});
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
export const echoCancellation = atom<boolean>(true);
export const noiseSuppression = atom<boolean>(true);
export const autoGainControl = atom<boolean>(true);
export const compressorEnabled = atom<boolean>(true);

// Compressor Parameters
export const compressorThreshold = atom<number>(-24); // dB
export const compressorRatio = atom<number>(12);
export const compressorAttack = atom<number>(0.003); // seconds
export const compressorRelease = atom<number>(0.25); // seconds
