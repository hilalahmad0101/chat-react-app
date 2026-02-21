import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import {
  setMessages,
  toggleSidebar,
  updateMessageStatus,
} from "../../store/slices/chatSlice";
import apiClient from "../../api/client";
import {
  User as UserIcon,
  MoreVertical,
  Phone,
  Video,
  Menu,
  Check,
  CheckCheck,
  MessageSquare,
  FileText,
  Download,
  Users,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socketService } from "../../utils/socket";
import GroupInfoPanel from "./GroupInfoPanel";

const ChatArea: React.FC = () => {
  const dispatch = useDispatch();
  const { activeConversation, messages, typingUsers, activeGroup } =
    useSelector((state: RootState) => state.chat);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const otherParticipant = activeConversation?.participants.find(
    (p) => String(p._id) !== String(currentUser?._id),
  );
  const isTyping = activeConversation
    ? typingUsers[activeConversation._id]?.some(
        (username) => username !== currentUser?.username,
      )
    : false;

  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      try {
        const response = await apiClient.get(
          `/chat/messages/${activeConversation._id}`,
        );
        dispatch(setMessages(response.data.messages));
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();
  }, [activeConversation, dispatch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isTyping]);

  // Mark messages as seen when conversation is active
  useEffect(() => {
    if (!activeConversation || !currentUser || !messages.length) return;

    messages.forEach((msg) => {
      if (msg.messageType === "system") return; // system messages have no sender
      const msgSenderId =
        typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id;
      if (msgSenderId !== currentUser._id && msg.status !== "seen") {
        socketService.emit("mark_message_seen", {
          messageId: msg._id,
          senderId: msgSenderId,
        });
        dispatch(updateMessageStatus({ messageId: msg._id, status: "seen" }));
      }
    });
  }, [messages, activeConversation, currentUser, dispatch]);

  // Close group info when conversation changes
  useEffect(() => {
    setShowGroupInfo(false);
  }, [activeConversation?._id]);

  if (!activeConversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 relative">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="lg:hidden absolute top-4 left-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600"
        >
          <Menu size={20} />
        </button>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={48} className="text-blue-200" />
          </div>
          <h2 className="text-xl font-bold text-gray-700">
            Select a chat to start messaging
          </h2>
          <p className="mt-2 text-sm">
            Stay connected with your friends and team
          </p>
        </motion.div>
      </div>
    );
  }

  const isGroupChat = activeConversation.isGroup;
  const groupDisplayName =
    activeConversation.groupData?.name ||
    activeConversation.groupName ||
    "Group";

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-blue-600 transition"
          >
            <Menu size={24} />
          </button>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isGroupChat
                ? "bg-gradient-to-br from-blue-500 to-purple-600"
                : "bg-blue-100"
            }`}
          >
            {isGroupChat ? (
              <Users className="text-white" size={20} />
            ) : otherParticipant?.avatar ? (
              <img
                src={otherParticipant.avatar}
                alt=""
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <UserIcon className="text-blue-600 w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-800">
              {isGroupChat ? groupDisplayName : otherParticipant?.username}
            </h2>
            <p className="text-xs text-gray-500">
              {isTyping ? (
                <span className="text-blue-600 font-medium italic">
                  Typing...
                </span>
              ) : isGroupChat ? (
                `${activeConversation.participants.length} members`
              ) : otherParticipant?.isOnline ? (
                "Active now"
              ) : (
                "Yesterday"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
          {isGroupChat && activeGroup && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="hover:text-blue-600 transition"
              title="Group Info"
            >
              <Info size={20} />
            </button>
          )}
          <button className="hover:text-blue-600 transition">
            <Phone size={20} />
          </button>
          <button className="hover:text-blue-600 transition">
            <Video size={20} />
          </button>
          <button className="hover:text-blue-600 transition">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 pattern-dots"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            // System messages have no senderId
            const isSystem = msg.messageType === "system";
            const senderId = msg.senderId;
            const isMe =
              !isSystem &&
              (typeof senderId === "string" ? senderId : senderId?._id) ===
                currentUser?._id;
            const senderName =
              typeof senderId === "string"
                ? ""
                : ((senderId as any)?.username ?? "");

            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}
              >
                {/* ── System / Event Message ──────────────────────────── */}
                {isSystem ? (
                  <div className="flex justify-center my-1 px-4">
                    <span className="bg-gray-200/90 text-gray-500 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm text-center max-w-xs leading-relaxed">
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] md:max-w-[60%] px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMe
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                    }`}
                  >
                    {!isMe && activeConversation.isGroup && (
                      <p className="text-[10px] font-bold text-blue-500 mb-1">
                        {senderName}
                      </p>
                    )}

                    {/* Image Message */}
                    {msg.messageType === "image" && msg.fileUrl && (
                      <div className="mb-2 -mx-1 -mt-1">
                        <img
                          src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${msg.fileUrl}`}
                          alt={msg.content || "Image"}
                          className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition bg-gray-200"
                          loading="lazy"
                          onClick={() =>
                            window.open(
                              `${import.meta.env.VITE_API_URL?.replace("/api", "")}${msg.fileUrl}`,
                              "_blank",
                            )
                          }
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-xs";
                            fallback.textContent = "Image failed to load";
                            target.parentNode?.appendChild(fallback);
                          }}
                        />
                      </div>
                    )}

                    {/* File Message */}
                    {msg.messageType === "file" && msg.fileUrl && (
                      <a
                        href={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${msg.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center space-x-3 p-2.5 rounded-xl mb-2 transition ${
                          isMe
                            ? "bg-blue-500/30 hover:bg-blue-500/40"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isMe ? "bg-blue-400/40" : "bg-blue-100"
                          }`}
                        >
                          <FileText
                            size={20}
                            className={isMe ? "text-white" : "text-blue-600"}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isMe ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {msg.content || "File"}
                          </p>
                          {msg.fileSize && (
                            <p
                              className={`text-[10px] ${
                                isMe ? "text-blue-200" : "text-gray-400"
                              }`}
                            >
                              {msg.fileSize < 1024 * 1024
                                ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                : `${(msg.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            </p>
                          )}
                        </div>
                        <Download
                          size={16}
                          className={`flex-shrink-0 ${
                            isMe ? "text-white" : "text-gray-500"
                          }`}
                        />
                      </a>
                    )}

                    {/* Text content (or caption for media) */}
                    {msg.messageType === "text" && (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                    {msg.messageType === "image" && msg.content && (
                      <p className="text-sm leading-relaxed mt-1">
                        {msg.content}
                      </p>
                    )}

                    <div
                      className={`text-[10px] mt-1 flex items-center ${isMe ? "text-blue-100" : "text-gray-400"}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMe && (
                        <span
                          className={`ml-1 flex items-center ${
                            msg.status === "seen"
                              ? "text-green-400"
                              : "text-blue-100 opacity-70"
                          }`}
                        >
                          {msg.status === "sent" ? (
                            <Check size={14} />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start"
          >
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm border border-gray-100">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Group Info Panel */}
      {activeGroup && (
        <GroupInfoPanel
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          group={activeGroup}
        />
      )}
    </div>
  );
};

export default ChatArea;
