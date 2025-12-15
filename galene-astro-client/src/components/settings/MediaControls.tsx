import React from "react";
import { useStore } from "@nanostores/react";
import { galene } from "../../stores/galene";
import {
  isMuted,
  isVideoOff,
  localScreenshareStream,
} from "../../stores/state";
import { Button } from "../ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
} from "lucide-react";

export function MediaControls() {
  const muted = useStore(isMuted);
  const videoOff = useStore(isVideoOff);
  const screenshare = useStore(localScreenshareStream);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={muted ? "destructive" : "secondary"}
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => galene.toggleAudio()}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      <Button
        variant={videoOff ? "destructive" : "secondary"}
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => galene.toggleVideo()}
        title={videoOff ? "Start Video" : "Stop Video"}
      >
        {videoOff ? (
          <VideoOff className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant={screenshare ? "destructive" : "secondary"}
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => galene.shareScreen()}
        title={screenshare ? "Stop Sharing" : "Share Screen"}
      >
        {screenshare ? (
          <MonitorOff className="h-5 w-5" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        className="rounded-full h-10 w-10 ml-2"
        onClick={() => window.location.reload()}
        title="Disconnect"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
