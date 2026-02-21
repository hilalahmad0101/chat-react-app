import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { clearReplyingTo } from "../../store/slices/chatSlice";
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
  ShieldAlert,
  Reply,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const dispatch = useDispatch();
  const { activeConversation, activeGroup, replyingTo } = useSelector(
    (state: RootState) => state.chat,
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if this is a group with admin-only messaging
  const isAdminOnlyGroup =
    activeConversation?.isGroup && activeGroup?.settings?.onlyAdminCanMessage;
  const isGroupAdmin =
    activeGroup &&
    String(
      typeof activeGroup.admin === "string"
        ? activeGroup.admin
        : activeGroup.admin._id,
    ) === String(user?._id);
  const isLocked = isAdminOnlyGroup && !isGroupAdmin;

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
    if (!activeConversation || !user || isLocked) return;

    const otherParticipant = getOtherParticipant();

    // If there's a file upload completed, send message with file
    if (fileUpload.uploaded && fileUpload.fileUrl) {
      if (activeConversation.isGroup) {
        socketService.emit("send_group_message", {
          conversationId: activeConversation._id,
          content: content.trim() || fileUpload.fileName || "File",
          messageType: fileUpload.messageType,
          fileUrl: fileUpload.fileUrl,
          fileName: fileUpload.fileName,
          fileSize: fileUpload.file?.size,
          parentMessageId: replyingTo?._id,
        });
      } else {
        socketService.emit("send_message", {
          conversationId: activeConversation._id,
          content: content.trim() || fileUpload.fileName || "File",
          receiverId: otherParticipant?._id,
          messageType: fileUpload.messageType,
          fileUrl: fileUpload.fileUrl,
          fileName: fileUpload.fileName,
          fileSize: fileUpload.file?.size,
          parentMessageId: replyingTo?._id,
        });
      }
      dispatch(clearReplyingTo());
      resetFileUpload();
      setContent("");
      handleStopTyping();
      return;
    }

    // Regular text message
    if (!content.trim()) return;

    if (activeConversation.isGroup) {
      socketService.emit("send_group_message", {
        conversationId: activeConversation._id,
        content: content.trim(),
        messageType: "text",
        parentMessageId: replyingTo?._id,
      });
    } else {
      socketService.emit("send_message", {
        conversationId: activeConversation._id,
        content: content.trim(),
        receiverId: otherParticipant?._id,
        messageType: "text",
        parentMessageId: replyingTo?._id,
      });
    }

    dispatch(clearReplyingTo());
    setContent("");
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!activeConversation) return;
    socketService.emit("typing", {
      conversationId: activeConversation._id,
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    if (!activeConversation) return;
    socketService.emit("stop_typing", {
      conversationId: activeConversation._id,
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const cursor = inputRef.current?.selectionStart ?? content.length;
    setContent(
      content.slice(0, cursor) + emojiData.emoji + content.slice(cursor),
    );
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const resetFileUpload = () => {
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
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
    if (type === "image") {
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
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setFileUpload((prev) => ({
        ...prev,
        uploading: false,
        error: err.response?.data?.message || "Upload failed. Try again.",
      }));
    }
  };

  const cancelUpload = () => {
    if (fileUpload.abortController) {
      fileUpload.abortController.abort();
    }
    resetFileUpload();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!activeConversation) return null;

  // === LOCKED: Admin-Only Group ===
  if (isLocked) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-center space-x-3 text-gray-500">
        <ShieldAlert size={18} className="text-orange-400 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-500">
          Only admins can send messages in this group
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 relative">
      {/* File Upload Preview */}
      {fileUpload.file && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
          <button
            onClick={cancelUpload}
            className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition z-10"
          >
            <X size={14} />
          </button>

          <div className="flex items-center space-x-3">
            {/* Preview */}
            {fileUpload.preview ? (
              <img
                src={fileUpload.preview}
                alt="Preview"
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileIcon size={24} className="text-blue-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {fileUpload.fileName}
              </p>
              {fileUpload.file && (
                <p className="text-xs text-gray-400">
                  {formatFileSize(fileUpload.file.size)}
                </p>
              )}

              {/* Progress Bar */}
              {fileUpload.uploading && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${fileUpload.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Uploading {fileUpload.progress}%
                  </p>
                </div>
              )}

              {/* Ready */}
              {fileUpload.uploaded && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  ✓ Ready to send
                </p>
              )}

              {/* Error */}
              {fileUpload.error && (
                <p className="text-xs text-red-500 mt-1">{fileUpload.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.LIGHT}
            height={380}
            width={320}
            searchDisabled={false}
            lazyLoadEmojis
          />
        </div>
      )}

      {/* Attach Menu */}
      {showAttachMenu && (
        <div
          ref={attachMenuRef}
          className="absolute bottom-full left-14 mb-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-blue-50 transition"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center">
              <ImageIcon size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-blue-50 transition"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              Document
            </span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,audio/*,video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "file")}
      />

      {/* Reply Preview Bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="absolute bottom-full left-0 right-0 mx-2 mb-2 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden z-40"
          >
            <div className="flex items-center p-3 border-l-4 border-blue-500">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center space-x-2 mb-0.5">
                  <Reply size={12} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-600">
                    Replying to{" "}
                    {typeof replyingTo.senderId === "string"
                      ? "User"
                      : (replyingTo.senderId as any)?.username}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {replyingTo.messageType === "image"
                    ? "📷 Photo"
                    : replyingTo.messageType === "file"
                      ? `📎 ${replyingTo.fileName || "File"}`
                      : replyingTo.content}
                </p>
              </div>
              <button
                onClick={() => dispatch(clearReplyingTo())}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Row */}
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className={`p-2.5 rounded-xl transition flex-shrink-0 ${
            showEmojiPicker
              ? "bg-yellow-100 text-yellow-500"
              : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
          }`}
        >
          <Smile size={22} />
        </button>

        {/* Attach Button */}
        <button
          type="button"
          onClick={() => setShowAttachMenu((v) => !v)}
          disabled={fileUpload.uploading}
          className={`p-2.5 rounded-xl transition flex-shrink-0 ${
            showAttachMenu
              ? "bg-blue-100 text-blue-600"
              : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
          } disabled:opacity-40`}
        >
          <Paperclip size={22} />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            fileUpload.uploaded
              ? "Add a caption (optional)..."
              : activeConversation.isGroup
                ? `Message ${activeConversation.groupData?.name || activeConversation.groupName || "Group"}...`
                : "Type a message..."
          }
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={
            (!content.trim() && !fileUpload.uploaded) || fileUpload.uploading
          }
          className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
