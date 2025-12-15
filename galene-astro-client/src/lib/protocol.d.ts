export class ServerConnection {
  id: string;
  group: string | null;
  username: string | null;
  users: Record<string, User>;
  socket: WebSocket | null;

  constructor();

  connect(url: string): void;
  join(
    group: string,
    username: string,
    credentials?: string | { type: string; token?: string; password?: string }
  ): void;
  close(): void;
  request(constraints: any): void;
  chat(dest: string | null, id: string, message: string): void;
  userMessage(kind: string, dest: string, value?: any): void;
  userAction(action: string, id: string): void;
  groupAction(kind: string, data?: any): void;
  newUpStream(id?: string): StreamConnection;
  sendFile(id: string, file: File): void;

  up: Record<string, StreamConnection>;

  // Callbacks
  onconnected: () => void;
  onclose: (code: number, reason: string) => void;
  onjoined: (
    kind: string,
    group: string,
    perms: string[],
    status: any,
    data: any,
    error: any,
    message: any
  ) => void;
  onuser: (id: string, kind: string, status: any) => void;
  onchat: (
    id: string,
    source: string,
    dest: string,
    username: string,
    time: Date,
    privileged: boolean,
    history: boolean,
    kind: string,
    message: string
  ) => void;
  onclearchat: () => void;
  onfiletransfer: (file: any) => void;
  onusermessage: (
    id: string,
    dest: string,
    username: string,
    time: number,
    privileged: boolean,
    kind: string,
    error: string,
    value: any
  ) => void;
  ondownstream: (c: StreamConnection) => void;
}

export interface User {
  username: string;
  permissions: string[];
  data: any;
  streams: Record<string, any>;
}

export class StreamConnection {
  id: string;
  localId: string;
  stream: MediaStream;
  label: string;
  userdata: any;
  username: string;
  pc: RTCPeerConnection;

  close(): void;
  setStatsInterval(interval: number): void;
  setStream(stream: MediaStream): void;

  // Callbacks
  onerror: (e: any) => void;
  onclose: (replace: boolean) => void;
  onstatus: (status: string) => void;
  ondowntrack: (
    track: MediaStreamTrack,
    transceiver: RTCRtpTransceiver,
    stream: MediaStream
  ) => void;
  onstats: (stats: any) => void;
}
