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

  // We want to show ALL users, not just those with streams.
  // If a user has a stream, we show it. If not, we show a placeholder tile.

  // Create a map of user ID -> stream(s)
  // const userStreams: Record<string, any[]> = {};
  // Object.values(streamList).forEach((s) => {
  //   // Assuming stream.localId maps to user ID or we can find it.
  //   // Actually, in Galene, streams are separate entities but associated with users.
  //   // The `streams` store has `localId` which is the stream ID, not user ID.
  //   // But `users` store has `streams` property which lists stream IDs.
  //   // Let's iterate users and find their streams.
  // });

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

        // Find streams for this user by username
        const userStreams = Object.values(streamList).filter(
          (s) => s.username === user.username
        );

        // If no streams, show placeholder
        if (userStreams.length === 0) {
          return (
            <VideoTile
              key={userId}
              username={user.username}
              userId={userId}
              isLocal={false}
              permissions={user.permissions}
            />
          );
        }

        // Prioritize screenshare, then camera
        const screenshare = userStreams.find((s) => s.label === "screenshare");
        const camera = userStreams.find((s) => s.label === "video" || !s.label);

        // Main stream to display
        const mainStream = screenshare || camera || userStreams[0];

        // Other streams (to be rendered hidden for audio)
        const otherStreams = userStreams.filter(
          (s) => s.localId !== mainStream.localId
        );

        return (
          <React.Fragment key={userId}>
            {/* Main visible tile */}
            <VideoTile
              key={mainStream.localId}
              stream={mainStream.stream}
              username={user.username}
              userId={userId}
              label={mainStream.label}
              isLocal={false}
              isActive={mainStream.active}
              permissions={user.permissions}
            />

            {/* Hidden tiles for other streams (audio only) */}
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
