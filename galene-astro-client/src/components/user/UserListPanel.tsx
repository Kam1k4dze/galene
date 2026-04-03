import { useStore } from "@nanostores/react";
import { users, localUser, streams, isMuted, isDeafened, isHandRaised, localUserActive } from "../../stores/state";
import { UserListItem } from "./UserListItem";

export function UserListPanel() {
  const userList = useStore(users);
  const myId = useStore(localUser);
  const streamList = useStore(streams);
  const amIMuted = useStore(isMuted);
  const amIDeafened = useStore(isDeafened);
  const amIHandRaised = useStore(isHandRaised);
  const amIActive = useStore(localUserActive);

  return (
    <div className="flex h-full w-52 flex-col bg-zinc-900 border-l border-zinc-800">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        Members — {Object.keys(userList).length}
      </div>
      <div className="flex flex-col gap-0.5 px-1 overflow-y-auto">
        {Object.entries(userList).map(([id, user]) => {
          const isSelf = id === myId;
          const data = user.data as Record<string, unknown> | undefined;

          // For self: use local state (most up-to-date before setdata roundtrip)
          const muted = isSelf ? amIMuted : data?.muted === true;
          const deafened = isSelf ? amIDeafened : data?.deafened === true;
          const handRaised = isSelf ? amIHandRaised : data?.raisedHand === true;

          // Speaking: use voice-activity from streams
          const active = isSelf
            ? amIActive
            : Object.values(streamList).some(
                (s) => s.username === user.username && s.active
              );

          return (
            <UserListItem
              key={id}
              username={user.username}
              isSelf={isSelf}
              isOp={user.permissions?.includes("op")}
              isMuted={muted}
              isDeafened={deafened}
              isHandRaised={handRaised}
              isActive={active}
            />
          );
        })}
      </div>
    </div>
  );
}
