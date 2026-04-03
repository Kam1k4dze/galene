import React from "react";
import { useStore } from "@nanostores/react";
import {
  streams,
  localMediaStream,
  localScreenshareStream,
  localUser,
  users,
  localPermissions,
  localUserActive,
  isMuted,
  isDeafened,
} from "../../stores/state";
import { VideoTile } from "./VideoTile";

export function VideoGrid() {
  const streamList = useStore(streams);
  const localStream = useStore(localMediaStream);
  const localScreen = useStore(localScreenshareStream);
  const myId = useStore(localUser);
  const userList = useStore(users);
  const myPerms = useStore(localPermissions);
  const amIActive = useStore(localUserActive);
  const amIMuted = useStore(isMuted);
  const amIDeafened = useStore(isDeafened);

  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
      {/* Local User */}
      {myId && (
        <VideoTile
          stream={localStream || undefined}
          username={userList[myId]?.username || "Me"}
          userId={myId}
          isLocal={true}
          permissions={myPerms}
          isActive={amIActive}
          isMuted={amIMuted}
          isDeafened={amIDeafened}
        />
      )}

      {/* Local Screenshare */}
      {localScreen && myId && (
        <VideoTile
          stream={localScreen}
          username={userList[myId]?.username || "Me"}
          userId={myId}
          label="screenshare"
          isLocal={true}
          permissions={myPerms}
        />
      )}

      {/* Remote Users */}
      {Object.entries(userList).map(([userId, user]) => {
        if (userId === myId) return null;

        // Presence from user data (set via setdata by our custom client)
        // Falls back to stream inactivity for vanilla clients
        const data = user.data as Record<string, unknown> | undefined;
        const remoteMuted: boolean =
          data?.muted === true ||
          (data?.muted === undefined &&
            !Object.values(streamList).some(
              (s) => s.username === user.username && s.active
            ));
        const remoteHandRaised = data?.raisedHand === true;
        const remoteDeafened = data?.deafened === true;

        const userStreams = Object.values(streamList).filter(
          (s) => s.username === user.username
        );

        if (userStreams.length === 0) {
          return (
            <VideoTile
              key={userId}
              username={user.username}
              userId={userId}
              isLocal={false}
              permissions={user.permissions}
              isMuted={remoteMuted}
              isDeafened={remoteDeafened}
              isHandRaised={remoteHandRaised}
            />
          );
        }

        const screenshare = userStreams.find((s) => s.label === "screenshare");
        const camera = userStreams.find((s) => s.label === "video" || !s.label);
        const mainStream = screenshare || camera || userStreams[0];
        const otherStreams = userStreams.filter((s) => s.localId !== mainStream.localId);

        return (
          <React.Fragment key={userId}>
            <VideoTile
              key={mainStream.localId}
              stream={mainStream.stream}
              username={user.username}
              userId={userId}
              label={mainStream.label}
              isLocal={false}
              isActive={mainStream.active}
              isMuted={remoteMuted}
              isDeafened={remoteDeafened}
              isHandRaised={remoteHandRaised}
              permissions={user.permissions}
            />
            {otherStreams.map((s) => (
              <VideoTile
                key={s.localId}
                stream={s.stream}
                username={user.username}
                userId={userId}
                label={s.label}
                isLocal={false}
                hidden={true}
              />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
