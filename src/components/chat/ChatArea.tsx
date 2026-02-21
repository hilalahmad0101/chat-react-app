import React, { useEffect, useRef } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socketService } from "../../utils/socket";

const ChatArea: React.FC = () => {
  const dispatch = useDispatch();
  const { activeConversation, messages, typingUsers } = useSelector(
    (state: RootState) => state.chat,
  );
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const msgSenderId =
        typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id;
      if (msgSenderId !== currentUser._id && msg.status !== "seen") {
        socketService.emit("mark_message_seen", {
          messageId: msg._id,
          senderId: msgSenderId,
        });
        // Update locally to avoid redundant emissions and update UI
        dispatch(updateMessageStatus({ messageId: msg._id, status: "seen" }));
      }
    });
  }, [messages, activeConversation, currentUser, dispatch]);

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
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            {otherParticipant?.avatar ? (
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
              {activeConversation.isGroup
                ? activeConversation.groupName
                : otherParticipant?.username}
            </h2>
            <p className="text-xs text-gray-500">
              {isTyping ? (
                <span className="text-blue-600 font-medium italic">
                  Typing...
                </span>
              ) : otherParticipant?.isOnline ? (
                "Active now"
              ) : (
                "Yesterday"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
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
            const isMe =
              (typeof msg.senderId === "string"
                ? msg.senderId
                : msg.senderId._id) === currentUser?._id;
            const senderName =
              typeof msg.senderId === "string" ? "" : msg.senderId.username;

            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && activeConversation.isGroup && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex-shrink-0 flex items-center justify-center text-xs">
                    {senderName[0]}
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm relative group ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {!isMe && activeConversation.isGroup && (
                    <p className="text-[10px] font-bold text-blue-500 mb-1">
                      {senderName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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
              </motion.div>
            );
          })}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="flex justify-start"
            >
              <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl shadow-sm border border-gray-100 rounded-bl-none flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs text-gray-400 ml-2 font-medium">
                  {otherParticipant?.username} is typing
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area will be here */}
    </div>
  );
};

export default ChatArea;
