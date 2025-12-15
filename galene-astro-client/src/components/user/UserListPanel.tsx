import React from "react";
import { useStore } from "@nanostores/react";
import { users, localUser } from "../../stores/state";
import { UserListItem } from "./UserListItem";

export function UserListPanel() {
  const userList = useStore(users);
  const myId = useStore(localUser);

  return (
    <div className="flex flex-col gap-1 p-2">
      {Object.entries(userList).map(([id, user]) => (
        <UserListItem
          key={id}
          username={user.username}
          isSelf={id === myId}
          isOp={user.permissions?.includes("op")}
        />
      ))}
    </div>
  );
}
