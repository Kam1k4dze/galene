import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { galene } from "../../stores/galene";
import { chatMessages } from "../../stores/state";
import { ChatMessage } from "./ChatMessage";
import { Send, Paperclip } from "lucide-react";
import { Button } from "../ui/button";

export function ChatPanel() {
  const messages = useStore(chatMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFileConfirm, setShowFileConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      galene.chat(inputValue);
      setInputValue("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPendingFiles(Array.from(e.dataTransfer.files));
      setShowFileConfirm(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingFiles(Array.from(e.target.files));
      setShowFileConfirm(true);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmSendFiles = () => {
    pendingFiles.forEach((file) => {
      galene.sendFile(file);
    });
    setPendingFiles([]);
    setShowFileConfirm(false);
  };

  const cancelSendFiles = () => {
    setPendingFiles([]);
    setShowFileConfirm(false);
  };

  return (
    <div
      className={`flex h-full flex-col bg-zinc-900 border-l border-zinc-800 w-80 relative transition-colors ${
        isDragging ? "bg-zinc-800 border-indigo-500 border-2" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-indigo-500/20 pointer-events-none">
          <div className="text-indigo-200 font-bold text-lg">
            Drop files to send
          </div>
        </div>
      )}

      {showFileConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-800 p-4 rounded-lg shadow-xl border border-zinc-700 max-w-xs w-full">
            <h3 className="text-lg font-semibold text-white mb-2">
              Send Files?
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              You are about to send {pendingFiles.length} file(s).
              <br />
              <br />
              <span className="text-red-400 font-bold">WARNING:</span> This is a
              peer-to-peer transfer. Your IP address will be exposed to the
              recipient(s).
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelSendFiles}
                className="bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmSendFiles}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-12 items-center border-b border-zinc-800 px-4 font-semibold text-zinc-200">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            username={msg.username}
            message={msg.message}
            time={msg.time}
            isSystem={msg.kind === "system"}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-zinc-800">
        <form onSubmit={handleSend} className="relative flex gap-2">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 p-2"
            onClick={() => fileInputRef.current?.click()}
            title="Send file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <input
              className="w-full rounded-md bg-zinc-800 px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
