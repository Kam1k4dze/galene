import { ServerConnection } from "./protocol";
import type { StreamConnection } from "./protocol";
import {
  connectionState,
  users,
  streams,
  localUser,
  localPermissions,
  globalError,
  chatMessages,
  localMediaStream,
  localScreenshareStream,
  isMuted,
  isVideoOff,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  userVolumes,
  echoCancellation,
  noiseSuppression,
  autoGainControl,
  fileTransfers,
} from "../stores/state";
import { playDisconnectSound } from "./audio";
import { updateAudioProcessing, resetAudioProcessor } from "./audio-processor";

export class GaleneClient {
  private sc: ServerConnection | null = null;
  private localUpstreamConnection: StreamConnection | null = null;
  private rawMicStream: MediaStream | null = null;

  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private intentionalDisconnect = false;
  private fatalError = false;
  private lastConnectionParams: {
    url: string;
    group: string;
    username: string;
    credentials?: string | { type: string; token?: string; password?: string };
  } | null = null;

  private tokenPromise: {
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null = null;

  public get group(): string | undefined {
    return this.lastConnectionParams?.group;
  }

  public get username(): string | undefined {
    return this.lastConnectionParams?.username;
  }

  public get password(): string | undefined {
    const creds = this.lastConnectionParams?.credentials;
    if (typeof creds === "string") return creds;
    if (creds && typeof creds === "object" && creds.type === "password") {
      return creds.password;
    }
    return undefined;
  }

  constructor() {
    // Listen for device changes
    selectedAudioDevice.listen((deviceId) => {
      if (deviceId) this.handleAudioDeviceChange(deviceId);
    });
    selectedVideoDevice.listen((deviceId) => {
      if (deviceId) this.handleVideoDeviceChange(deviceId);
    });
  }

  public async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioDevices.set(devices.filter((d) => d.kind === "audioinput"));
      videoDevices.set(devices.filter((d) => d.kind === "videoinput"));
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }

  public async connect(
    group: string,
    username: string,
    credentials?: string | { type: string; token?: string; password?: string },
    isRetry = false
  ) {
    if (this.sc) {
      if (this.sc.socket && this.sc.socket.readyState === WebSocket.OPEN) {
        this.sc.close();
      }
    }

    if (!isRetry) {
      this.reconnectAttempts = 0;
    }

    this.intentionalDisconnect = false;
    this.fatalError = false;

    connectionState.set("connecting");
    globalError.set(null);

    let wsUrl = "";
    try {
      const statusUrl = `/group/${group}/.status`;
      const r = await fetch(statusUrl);
      if (r.ok) {
        const status = await r.json();
        if (status.endpoint) {
          wsUrl = status.endpoint;
        }
      }
    } catch (e) {
      console.warn(
        "Could not fetch group status, falling back to default URL",
        e
      );
    }

    if (!wsUrl) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    this.lastConnectionParams = { url: wsUrl, group, username, credentials };

    this.sc = new ServerConnection();
    this.setupCallbacks();
    try {
      this.sc.connect(wsUrl);
    } catch (e) {
      console.error("Connection failed", e);
      connectionState.set("disconnected");
      globalError.set(
        "Connection failed: " + (e instanceof Error ? e.message : String(e))
      );
    }
  }

  public disconnect() {
    this.intentionalDisconnect = true;
    if (this.sc) {
      this.sc.close();
    }
  }

  private setupCallbacks() {
    if (!this.sc) return;

    this.sc.onconnected = () => {
      console.log("Connected to server");
      if (this.lastConnectionParams) {
        this.sc!.join(
          this.lastConnectionParams.group,
          this.lastConnectionParams.username,
          this.lastConnectionParams.credentials || ""
        );
      }
    };

    this.sc.onjoined = this.handleJoined.bind(this);
    this.sc.ondownstream = this.handleDownstream.bind(this);
    this.sc.onuser = this.handleUser.bind(this);
    this.sc.onchat = (
      id,
      source,
      dest,
      username,
      time,
      privileged,
      history,
      kind,
      message
    ) => {
      this.handleChat(
        id,
        source,
        dest,
        username,
        time,
        privileged,
        history,
        kind,
        message
      );
    };
    this.sc.onclearchat = this.handleClearChat.bind(this);
    this.sc.onfiletransfer = this.handleFileTransfer.bind(this);
    this.sc.onusermessage = this.handleUserMessage.bind(this);
    this.sc.onclose = this.handleClose.bind(this);
  }

  private async handleJoined(
    kind: string,
    group: string,
    perms: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any
  ) {
    console.log("Joined:", kind, group);
    if (kind === "join" || kind === "change") {
      connectionState.set("connected");
      if (kind === "join") {
        this.reconnectAttempts = 0;
      }
      localUser.set(this.sc!.id);
      localPermissions.set(perms || []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentUsers: Record<string, any> = {};
      for (const id in this.sc!.users) {
        currentUsers[id] = this.sc!.users[id];
      }
      users.set(currentUsers);

      if (kind === "join") {
        // Republish camera if active, otherwise join
        const currentMedia = localMediaStream.get();
        if (
          currentMedia &&
          currentMedia.active &&
          this.rawMicStream &&
          this.rawMicStream.active
        ) {
          console.log("Republishing existing media...");
          this.publishStream(currentMedia, "camera");
        } else {
          try {
            await this.joinMedia();
          } catch (e) {
            console.error("Auto-join media failed:", e);
          }
        }

        // Republish screenshare if active
        const screenshare = localScreenshareStream.get();
        if (screenshare && screenshare.active) {
          try {
            console.log("Republishing screenshare...");
            this.publishStream(screenshare, "screenshare", (c) => {
              c.close();
              localScreenshareStream.set(null);
            });
          } catch (e) {
            console.error("Failed to republish screenshare:", e);
            localScreenshareStream.set(null);
          }
        }

        // Request streams immediately after joining
        console.log("Requesting remote streams...");
        this.sc!.request({
          "": ["audio", "video"],
          screenshare: ["audio", "video"],
        });
      }
    } else if (kind === "fail") {
      console.error("Join failed:", error);

      let errorMsg = "Join failed";
      if (message) {
        errorMsg = message;
      } else if (error) {
        errorMsg = error instanceof Error ? error.message : String(error);
      }

      globalError.set(errorMsg);
      connectionState.set("disconnected");
      this.fatalError = true;
      this.sc?.close();
    } else if (kind === "redirect") {
      console.log("Redirecting to:", message);
      this.disconnect();
      window.location.href = message;
    } else if (kind === "leave") {
      connectionState.set("disconnected");
      users.set({});
      streams.set({});
      localMediaStream.set(null);
      localPermissions.set([]);
    }
  }

  private handleDownstream(c: StreamConnection) {
    console.log("New downstream:", c);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.onerror = (e: any) => {
      console.error("Downstream error:", e);
      globalError.set(`Stream error: ${e.message || e}`);
    };
    c.onclose = (replace: boolean) => {
      if (!replace) {
        const currentStreams = streams.get();
        const newStreams = { ...currentStreams };
        delete newStreams[c.localId];
        streams.set(newStreams);
      }
    };
    c.onstatus = (status: string) => {
      console.log(`Stream ${c.localId} status: ${status}`);
      // We could update the stream state here to show connection quality/status in UI
    };
    c.ondowntrack = (
      track: MediaStreamTrack,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _transceiver: any,
      _stream: MediaStream
    ) => {
      console.log("Got track:", track.kind);
      streams.setKey(c.localId, {
        id: c.id,
        localId: c.localId,
        stream: c.stream,
        label: c.label,
        userdata: c.userdata,
        active: false,
        username: c.username,
        _ts: Date.now(),
      });
    };

    c.setStatsInterval(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.onstats = (stats: any) => {
      let maxEnergy = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.pc.getReceivers().forEach((r: any) => {
        const tid = r.track && r.track.id;
        const s = tid && stats[tid];
        const energy = s && s["inbound-rtp"] && s["inbound-rtp"].audioEnergy;
        if (typeof energy === "number") maxEnergy = Math.max(maxEnergy, energy);
      });

      const threshold = 0.01;
      const period = 1000;

      if (maxEnergy > threshold * threshold) {
        c.userdata.lastVoiceActivity = Date.now();
        if (!c.userdata.active) {
          c.userdata.active = true;
          const s = streams.get()[c.localId];
          if (s) streams.setKey(c.localId, { ...s, active: true });
        }
      } else {
        const last = c.userdata.lastVoiceActivity;
        if (!last || Date.now() - last > period) {
          if (c.userdata.active) {
            c.userdata.active = false;
            const s = streams.get()[c.localId];
            if (s) streams.setKey(c.localId, { ...s, active: false });
          }
        }
      }
    };
  }

  private handleUser(id: string, kind: string) {
    const currentUsers = users.get();
    if (kind === "add" || kind === "change") {
      users.setKey(id, { ...this.sc!.users[id] });
    } else if (kind === "delete") {
      const newUsers = { ...currentUsers };
      delete newUsers[id];
      users.set(newUsers);
    }
  }

  private handleChat(
    id: string,
    source: string,
    dest: string,
    username: string,
    time: Date | number,
    privileged: boolean,
    history: boolean,
    kind: string,
    message: string
  ) {
    const timestamp = time instanceof Date ? time : new Date(time);
    chatMessages.set([
      ...chatMessages.get(),
      { id, username, time: timestamp, message, kind },
    ]);
  }

  private handleClearChat() {
    chatMessages.set([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleFileTransfer(transfer: any) {
    const id = Math.random().toString(36).substring(7);

    const updateStatus = (status: string) => {
      const current = fileTransfers.get();
      if (current[id]) {
        fileTransfers.setKey(id, { ...current[id], status });
      }
    };

    if (transfer.up) {
      // We are sending
      transfer.onevent = (status: string) => {
        if (status === "done") {
          setTimeout(() => {
            const current = { ...fileTransfers.get() };
            delete current[id];
            fileTransfers.set(current);
          }, 5000);
        }
        updateStatus(status);
      };
    } else {
      // We are receiving
      const originalReceive = transfer.receive.bind(transfer);
      transfer.receive = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transfer.onevent = (status: string, data: any) => {
          updateStatus(status);
          if (status === "done") {
            if (data instanceof Blob) {
              const url = URL.createObjectURL(data);
              const a = document.createElement("a");
              a.href = url;
              a.download = transfer.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            setTimeout(() => {
              const current = { ...fileTransfers.get() };
              delete current[id];
              fileTransfers.set(current);
            }, 5000);
          }
        };
        originalReceive();
      };

      const originalCancel = transfer.cancel.bind(transfer);
      transfer.cancel = () => {
        originalCancel();
        const current = { ...fileTransfers.get() };
        delete current[id];
        fileTransfers.set(current);
      };
    }

    fileTransfers.setKey(id, {
      id,
      sender: transfer.sender,
      name: transfer.name,
      size: transfer.size,
      status: "pending",
      up: transfer.up,
      handle: transfer,
    });
  }

  private handleUserMessage(
    id: string,
    dest: string,
    username: string,
    time: number,
    privileged: boolean,
    kind: string,
    error: string,
    value: unknown
  ) {
    const from = id ? username || "Anonymous" : "The Server";
    const val = value as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    switch (kind) {
      case "error":
      case "warning":
      case "info":
        if (!privileged) {
          console.warn(`Got unprivileged message of kind ${kind}`);
          return;
        }
        globalError.set(`${from} said: ${val || error || "Unknown message"}`);
        break;

      case "mute":
        if (!privileged) return;
        const stream = localMediaStream.get();
        if (stream) {
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack && audioTrack.enabled) {
            audioTrack.enabled = false;
            isMuted.set(true);
          }
        }
        globalError.set(`You have been muted by ${from}`);
        break;

      case "kicked":
        this.fatalError = true;
        globalError.set(`You have been kicked by ${from}`);
        this.sc?.close();
        break;

      case "token":
        if (this.tokenPromise) {
          if (error) {
            this.tokenPromise.reject(new Error(val || error));
          } else {
            this.tokenPromise.resolve(val.token);
          }
          this.tokenPromise = null;
        }
        break;

      default:
        console.log("Unknown user message kind:", kind);
    }
  }

  public createToken(
    username: string | undefined,
    expires: number | undefined
  ): Promise<string> {
    if (!this.sc) throw new Error("Not connected");

    return new Promise((resolve, reject) => {
      this.tokenPromise = { resolve, reject };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v: any = { group: this.group };
      if (username) v.username = username;
      if (expires) v.expires = expires;

      // Default permissions
      v.permissions = [];
      const perms = localPermissions.get();
      if (perms.includes("present")) v.permissions.push("present");
      if (perms.includes("message")) v.permissions.push("message");

      try {
        this.sc!.groupAction("maketoken", v);
      } catch (e) {
        this.tokenPromise = null;
        reject(e);
      }
    });
  }

  private handleClose(code: number, reason: string) {
    console.log("Connection closed:", code, reason);

    if (
      !this.intentionalDisconnect &&
      !this.fatalError &&
      this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS
    ) {
      this.reconnectAttempts++;
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        10000
      );
      console.log(
        `Connection lost. Reconnecting (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`
      );
      connectionState.set("connecting");
      globalError.set(
        `Connection lost. Reconnecting... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
      );

      // Clear remote state, but keep local media active for seamless reconnection
      users.set({});
      streams.set({});

      this.sc = null; // Prevent use of dead connection

      setTimeout(() => {
        if (this.lastConnectionParams) {
          this.connect(
            this.lastConnectionParams.group,
            this.lastConnectionParams.username,
            this.lastConnectionParams.credentials,
            true
          );
        }
      }, delay);
      return;
    }

    playDisconnectSound();

    if (!this.intentionalDisconnect) {
      if (this.fatalError) {
        // Error is already set by onjoined("fail")
      } else {
        globalError.set("Connection lost. Failed to reconnect.");
      }
    }

    connectionState.set("disconnected");
    users.set({});
    streams.set({});
    localMediaStream.set(null);
    localPermissions.set([]);

    if (this.rawMicStream) {
      this.rawMicStream.getTracks().forEach((t) => t.stop());
      this.rawMicStream = null;
    }
    if (localScreenshareStream.get()) {
      localScreenshareStream
        .get()
        ?.getTracks()
        .forEach((t) => t.stop());
      localScreenshareStream.set(null);
    }

    this.sc = null;
    this.localUpstreamConnection = null;

    resetAudioProcessor();
  }

  public async joinMedia(audioOnly = true) {
    try {
      // Stop existing stream to prevent leaks
      if (this.rawMicStream) {
        this.rawMicStream.getTracks().forEach((t) => t.stop());
        this.rawMicStream = null;
      }

      const audioId = selectedAudioDevice.get();
      const videoId = selectedVideoDevice.get();
      const echo = echoCancellation.get();
      const noise = noiseSuppression.get();
      const agc = autoGainControl.get();

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: audioId ? { exact: audioId } : undefined,
          echoCancellation: echo,
          noiseSuppression: noise,
          autoGainControl: agc,
        },
        video: audioOnly
          ? false
          : videoId
          ? { deviceId: { exact: videoId } }
          : true,
      };

      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff.get();
      }

      this.rawMicStream = stream;

      const processedAudioTrack = await updateAudioProcessing(
        this.rawMicStream
      );

      const combinedStream = new MediaStream();
      if (processedAudioTrack) {
        processedAudioTrack.enabled = !isMuted.get();
        combinedStream.addTrack(processedAudioTrack);
      }
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
      }
      localMediaStream.set(combinedStream);

      // Reuse existing localId if available to trigger stream replacement
      const oldLocalId = this.localUpstreamConnection?.localId;
      this.publishStream(combinedStream, "camera", undefined, oldLocalId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Error getting user media:", e);
      globalError.set(`Failed to access media devices: ${e.message || e.name}`);
    }
  }

  private publishStream(
    stream: MediaStream,
    label: string,
    onTrackEnded?: (c: StreamConnection) => void,
    localId?: string
  ) {
    if (!this.sc) return null;

    // protocol.js handles closing the old stream if localId matches an existing one
    const c = this.sc.newUpStream(localId);
    c.label = label;
    c.setStream(stream);

    if (label === "camera") {
      this.localUpstreamConnection = c;
    }

    stream.getTracks().forEach((t) => {
      const encodings =
        t.kind === "video" && label !== "screenshare"
          ? [
              { rid: "h" },
              { rid: "l", scaleResolutionDownBy: 2.0, maxBitrate: 100000 },
            ]
          : undefined;

      c.pc.addTransceiver(t, {
        direction: "sendonly",
        streams: [stream],
        sendEncodings: encodings,
      });

      if (onTrackEnded) {
        const oldOnEnded = t.onended;
        t.onended = (e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (oldOnEnded) oldOnEnded.call(t, e as any);
          onTrackEnded(c);
        };
      }
    });
    return c;
  }

  public toggleAudio() {
    const stream = localMediaStream.get();
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        isMuted.set(!newState);

        if (this.localUpstreamConnection) {
          const senders = this.localUpstreamConnection.pc.getSenders();
          const audioSender = senders.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (s: any) => s.track?.kind === "audio"
          );
          if (audioSender && audioSender.track) {
            audioSender.track.enabled = newState;
          }
        }
      }
    }
  }

  public toggleVideo() {
    const stream = localMediaStream.get();
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isVideoOff.set(!videoTrack.enabled);
      }
    }
  }

  public async shareScreen() {
    try {
      if (localScreenshareStream.get()) {
        this.stopScreenshare();
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      localScreenshareStream.set(stream);

      this.publishStream(stream, "screenshare", (c) => {
        c.close();
        localScreenshareStream.set(null);
      });
    } catch (e) {
      console.error("Error sharing screen:", e);
    }
  }

  public stopScreenshare() {
    const stream = localScreenshareStream.get();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      localScreenshareStream.set(null);

      // Find and close the upstream connection for screenshare
      if (this.sc && this.sc.up) {
        for (const id in this.sc.up) {
          if (this.sc.up[id].label === "screenshare") {
            this.sc.up[id].close();
          }
        }
      }
    }
  }

  public sendFile(file: File, userId?: string) {
    if (!this.sc) return;

    if (userId) {
      try {
        this.sc.sendFile(userId, file);
      } catch (e) {
        console.error(`Error sending file to ${userId}:`, e);
      }
    } else {
      // Broadcast to all users
      if (this.sc && this.sc.users) {
        Object.keys(this.sc.users).forEach((id) => {
          if (id === this.sc!.id) return; // Don't send to self
          try {
            this.sc!.sendFile(id, file);
          } catch (e) {
            console.error(`Error sending file to ${id}:`, e);
          }
        });
      }
    }
  }

  public chat(message: string) {
    if (this.sc) {
      this.sc.chat(null, "", message);
    }
  }

  public setVolume(userId: string, volume: number) {
    userVolumes.setKey(userId, volume);
  }

  public kickUser(id: string) {
    if (this.sc) this.sc.userAction("kick", id);
  }

  public muteUser(id: string) {
    if (this.sc) this.sc.userMessage("mute", id);
  }

  public setPresenting(id: string, allow: boolean) {
    if (this.sc) this.sc.userAction(allow ? "present" : "unpresent", id);
  }

  public setOp(id: string, allow: boolean) {
    if (this.sc) this.sc.userAction(allow ? "op" : "unop", id);
  }

  private async handleAudioDeviceChange(deviceId: string) {
    if (this.rawMicStream) {
      console.log("Switching audio device to", deviceId);
      const hasVideo = this.rawMicStream.getVideoTracks().length > 0;

      // Don't close the connection here; joinMedia will handle stream replacement
      // if localUpstreamConnection exists.

      resetAudioProcessor();

      await this.joinMedia(!hasVideo);
    }
  }

  private async handleVideoDeviceChange(deviceId: string) {
    if (this.rawMicStream) {
      console.log("Switching video device to", deviceId);
      const hasVideo = this.rawMicStream.getVideoTracks().length > 0;

      // Don't close the connection here; joinMedia will handle stream replacement
      // if localUpstreamConnection exists.

      resetAudioProcessor();

      await this.joinMedia(!hasVideo);
    }
  }
}
