import React from "react";
import { useStore } from "@nanostores/react";
import { galene } from "../../stores/galene";
import {
  isMuted,
  isVideoOff,
  isDeafened,
  isHandRaised,
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
  Headphones,
  HeadphoneOff,
  Hand,
} from "lucide-react";

export function MediaControls() {
  const muted = useStore(isMuted);
  const videoOff = useStore(isVideoOff);
  const deafened = useStore(isDeafened);
  const handRaised = useStore(isHandRaised);
  const screenshare = useStore(localScreenshareStream);

  return (
    <div className="flex items-center gap-2">
      {/* Mute */}
      <Button
        variant={muted ? "destructive" : "secondary"}
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => galene.toggleAudio()}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {/* Deafen */}
      <Button
        variant={deafened ? "destructive" : "secondary"}
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => galene.toggleDeafen()}
        title={deafened ? "Undeafen" : "Deafen"}
      >
        {deafened ? (
          <HeadphoneOff className="h-5 w-5" />
        ) : (
          <Headphones className="h-5 w-5" />
        )}
      </Button>

      {/* Video */}
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

      {/* Screenshare */}
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

      {/* Raise hand */}
      <Button
        variant={handRaised ? "secondary" : "ghost"}
        size="icon"
        className={`rounded-full h-10 w-10 ${
          handRaised
            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
        onClick={() => galene.toggleHandRaise()}
        title={handRaised ? "Lower Hand" : "Raise Hand"}
      >
        <Hand className="h-5 w-5" />
      </Button>

      {/* Disconnect */}
      <Button
        variant="destructive"
        size="icon"
        className="rounded-full h-10 w-10 ml-2"
        onClick={() => galene.disconnect()}
        title="Disconnect"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
