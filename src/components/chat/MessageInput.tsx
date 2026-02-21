import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { socketService } from "../../utils/socket";
import apiClient from "../../api/client";
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  File as FileIcon,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

interface FileUploadState {
  file: File | null;
  preview: string | null;
  progress: number;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  fileUrl: string | null;
  messageType: "image" | "file" | null;
  fileName: string | null;
  abortController: AbortController | null;
}

const MessageInput: React.FC = () => {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    preview: null,
    progress: 0,
    uploading: false,
    uploaded: false,
    error: null,
    fileUrl: null,
    messageType: null,
    fileName: null,
    abortController: null,
  });

  const { activeConversation } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close emoji picker and attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getOtherParticipant = useCallback(() => {
    return activeConversation?.participants.find(
      (p) => String(p._id) !== String(user?._id),
    );
  }, [activeConversation, user]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !user) return;

    const otherParticipant = getOtherParticipant();

    // If there's a file upload completed, send message with file
    if (fileUpload.uploaded && fileUpload.fileUrl) {
      socketService.emit("send_message", {
        conversationId: activeConversation._id,
        content: content.trim() || fileUpload.fileName || "File",
        receiverId: otherParticipant?._id,
        messageType: fileUpload.messageType,
        fileUrl: fileUpload.fileUrl,
        fileName: fileUpload.fileName,
        fileSize: fileUpload.file?.size,
      });
      resetFileUpload();
      setContent("");
      handleStopTyping();
      return;
    }

    // Regular text message
    if (!content.trim()) return;

    socketService.emit("send_message", {
      conversationId: activeConversation._id,
      content: content.trim(),
      receiverId: otherParticipant?._id,
      messageType: "text",
    });

    setContent("");
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!user || !activeConversation) return;
    const otherParticipant = getOtherParticipant();

    socketService.emit("typing", {
      conversationId: activeConversation._id,
      receiverId: otherParticipant?._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (!user || !activeConversation) return;
    const otherParticipant = getOtherParticipant();

    socketService.emit("stop_typing", {
      conversationId: activeConversation._id,
      receiverId: otherParticipant?._id,
    });
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      handleStopTyping();
    };
  }, [activeConversation?._id]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "file",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);

    // Generate preview for images
    let preview: string | null = null;
    if (type === "image" && file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    const abortController = new AbortController();

    setFileUpload({
      file,
      preview,
      progress: 0,
      uploading: true,
      uploaded: false,
      error: null,
      fileUrl: null,
      messageType: type,
      fileName: file.name,
      abortController,
    });

    // Upload the file
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1),
          );
          setFileUpload((prev) => ({ ...prev, progress: percent }));
        },
      });

      setFileUpload((prev) => ({
        ...prev,
        uploading: false,
        uploaded: true,
        fileUrl: response.data.fileUrl,
        messageType: response.data.messageType,
        fileName: response.data.fileName,
      }));
    } catch (err: any) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        resetFileUpload();
      } else {
        setFileUpload((prev) => ({
          ...prev,
          uploading: false,
          error: "Upload failed. Try again.",
        }));
      }
    }

    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const cancelUpload = () => {
    if (fileUpload.abortController) {
      fileUpload.abortController.abort();
    }
    resetFileUpload();
  };

  const resetFileUpload = () => {
    if (fileUpload.preview) {
      URL.revokeObjectURL(fileUpload.preview);
    }
    setFileUpload({
      file: null,
      preview: null,
      progress: 0,
      uploading: false,
      uploaded: false,
      error: null,
      fileUrl: null,
      messageType: null,
      fileName: null,
      abortController: null,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!activeConversation) return null;

  return (
    <div className="border-t border-gray-200 bg-white relative">
      {/* File Upload Preview Bar */}
      {(fileUpload.file || fileUpload.error) && (
        <div className="px-4 pt-3 pb-1">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 relative overflow-hidden">
            {/* Progress bar background */}
            {fileUpload.uploading && (
              <div
                className="absolute inset-0 bg-blue-50 transition-all duration-300 ease-out rounded-2xl"
                style={{ width: `${fileUpload.progress}%` }}
              />
            )}
            {/* Uploaded success background */}
            {fileUpload.uploaded && (
              <div className="absolute inset-0 bg-green-50 rounded-2xl" />
            )}
            {/* Error background */}
            {fileUpload.error && (
              <div className="absolute inset-0 bg-red-50 rounded-2xl" />
            )}

            <div className="relative flex items-center space-x-3">
              {/* File Preview */}
              <div className="flex-shrink-0">
                {fileUpload.preview ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={fileUpload.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200">
                    <FileIcon className="w-7 h-7 text-blue-600" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {fileUpload.fileName}
                </p>
                <div className="flex items-center space-x-2 mt-0.5">
                  {fileUpload.file && (
                    <span className="text-xs text-gray-500">
                      {formatFileSize(fileUpload.file.size)}
                    </span>
                  )}
                  {fileUpload.uploading && (
                    <span className="text-xs text-blue-600 font-medium">
                      Uploading {fileUpload.progress}%
                    </span>
                  )}
                  {fileUpload.uploaded && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Ready to send
                    </span>
                  )}
                  {fileUpload.error && (
                    <span className="text-xs text-red-500 font-medium">
                      {fileUpload.error}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {fileUpload.uploading && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${fileUpload.progress}%`,
                        background:
                          "linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Cancel / Remove Button */}
              <button
                type="button"
                onClick={fileUpload.uploading ? cancelUpload : resetFileUpload}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition text-gray-500 shadow-sm"
                title={fileUpload.uploading ? "Cancel upload" : "Remove file"}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-4 mb-2 z-50"
          style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.15))" }}
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.LIGHT}
            width={320}
            height={400}
            searchPlaceholder="Search emoji..."
            lazyLoadEmojis={true}
          />
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div
          ref={attachMenuRef}
          className="absolute bottom-full left-4 mb-2 z-50"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 min-w-[180px]">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition">
                <ImageIcon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Photo</p>
                <p className="text-[11px] text-gray-400">PNG, JPG, GIF, WEBP</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Document</p>
                <p className="text-[11px] text-gray-400">
                  PDF, DOC, XLS, ZIP...
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.mp3,.wav,.mp4,.webm"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "file")}
      />

      {/* Main Input Area */}
      <form
        onSubmit={handleSend}
        className="p-4 flex items-center space-x-3 max-w-5xl mx-auto"
      >
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2.5 rounded-xl transition ${
              showAttachMenu
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-blue-600 hover:bg-gray-100"
            }`}
          >
            <Paperclip size={22} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className={`p-2.5 rounded-xl transition ${
              showEmojiPicker
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-blue-600 hover:bg-gray-100"
            }`}
          >
            <Smile size={22} />
          </button>
        </div>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            placeholder={
              fileUpload.uploaded
                ? "Add a caption (optional)..."
                : "Type your message..."
            }
            onBlur={handleStopTyping}
            className="w-full px-5 py-3 bg-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12"
          />
          <button
            type="submit"
            disabled={!content.trim() && !fileUpload.uploaded}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition ${
              content.trim() || fileUpload.uploaded
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                : "text-gray-300"
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
