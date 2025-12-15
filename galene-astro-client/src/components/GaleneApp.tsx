import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { galene } from "../stores/galene";
import { connectionState, users, streams } from "../stores/state";
import { Button } from "./ui/button";
import { MainStage } from "./layout/MainStage";
import { VideoGrid } from "./video/VideoGrid";
import { ChatPanel } from "./chat/ChatPanel";
import { MediaControls } from "./settings/MediaControls";
import { SettingsModal } from "./settings/SettingsModal";
import { AdminModal } from "./admin/AdminModal";
import { ErrorToast } from "./ui/ErrorToast";
import { FileTransferList } from "./chat/FileTransferList";
import { Settings, MessageSquare, Bug, Shield } from "lucide-react";
import { localPermissions } from "../stores/state";

export default function GaleneApp() {
  const state = useStore(connectionState);
  const userList = useStore(users);
  const streamList = useStore(streams);
  const perms = useStore(localPermissions);
  // Removed local error handling in favor of ErrorToast

  const [username, setUsername] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("username") || "";
  });
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });
  const [authType, setAuthType] = useState<"password" | "token">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ? "token" : "password";
  });
  const [group, setGroup] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("group") || "public";
  });
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [usernameLocked] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get("token") && params.get("username"));
  });

  const handleConnect = () => {
    if (!group) return;
    if (authType === "password" && !username) return;

    // Update URL with group
    const url = new URL(window.location.href);
    url.searchParams.set("group", group);
    window.history.pushState({}, "", url.toString());

    if (authType === "token") {
      galene.connect(group, username, { type: "token", token });
    } else {
      galene.connect(group, username, password);
    }
  };

  if (state === "disconnected") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#313338] text-zinc-200 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-md bg-[#2b2d31] p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
            <p className="text-zinc-400">
              We&apos;re so excited to see you again!
            </p>
          </div>

          <div className="flex gap-4 border-b border-zinc-700 pb-4">
            <button
              className={`flex-1 pb-2 text-sm font-medium ${
                authType === "password"
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
              onClick={() => setAuthType("password")}
            >
              Password
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-medium ${
                authType === "token"
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
              onClick={() => setAuthType("token")}
            >
              Token
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username-input"
                className="text-xs font-bold uppercase text-zinc-400"
              >
                Username{" "}
                {authType === "token" && !usernameLocked && "(Optional)"}
              </label>
              <input
                id="username-input"
                className={`w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 ${
                  usernameLocked ? "opacity-50 cursor-not-allowed" : ""
                }`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                disabled={usernameLocked}
              />
            </div>

            {authType === "password" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="password-input"
                  className="text-xs font-bold uppercase text-zinc-400"
                >
                  Password{" "}
                  <span className="font-normal normal-case italic text-zinc-500">
                    (Optional)
                  </span>
                </label>
                <input
                  id="password-input"
                  type="password"
                  className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="token-input"
                  className="text-xs font-bold uppercase text-zinc-400"
                >
                  Token
                </label>
                <input
                  id="token-input"
                  className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="group-input"
                className="text-xs font-bold uppercase text-zinc-400"
              >
                Group
              </label>
              <input
                id="group-input"
                className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>

            <Button
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-2.5"
              onClick={handleConnect}
            >
              Join Voice
            </Button>
          </div>
        </div>
        <ErrorToast />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#313338] text-white font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Header / Top Bar */}
        <div className="flex h-12 items-center justify-between px-4 shadow-sm bg-[#2b2d31] z-10">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-xl">#</span>
            <span className="font-bold text-white">{group}</span>
            <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full">
              Voice
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDebug(!showDebug)}
              className={
                showDebug
                  ? "text-green-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              <Bug className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className={
                showChat ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            {perms.includes("op") && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAdmin(true)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <MainStage className="flex-row bg-[#313338] relative">
          <div className="flex-1 relative p-4">
            <VideoGrid />

            {/* Floating Media Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-[#1e1f22]/90 p-2 shadow-lg backdrop-blur-md border border-zinc-800/50 flex gap-2">
              <MediaControls />
            </div>
          </div>
          {showChat && <ChatPanel />}
          {showDebug && (
            <div className="absolute top-0 left-0 z-50 h-full w-1/3 overflow-auto bg-black/90 p-4 text-xs text-green-400 font-mono border-r border-green-900">
              <h3 className="font-bold text-lg mb-2">Debug Info</h3>
              <div className="mb-4">
                <h4 className="font-bold mb-1 text-white">
                  Users ({Object.keys(userList).length})
                </h4>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(userList, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-bold mb-1 text-white">
                  Streams ({Object.keys(streamList).length})
                </h4>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(
                    streamList,
                    (key, value) => {
                      if (key === "stream")
                        return value
                          ? `[MediaStream ${value.id} active:${value.active}]`
                          : "null";
                      if (key === "pc") return "[RTCPeerConnection]";
                      if (key === "userdata") return value; // Keep userdata
                      return value;
                    },
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </MainStage>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <AdminModal isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
      <ErrorToast />
      <FileTransferList />
    </div>
  );
}
