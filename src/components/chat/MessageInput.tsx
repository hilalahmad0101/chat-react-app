import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { socketService } from "../../utils/socket";
import { Send, Paperclip, Smile } from "lucide-react";

const MessageInput: React.FC = () => {
  const [content, setContent] = useState("");
  const { activeConversation } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !activeConversation || !user) return;

    const otherParticipant = activeConversation.participants.find(
      (p) => String(p._id) !== String(user?._id),
    );

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

    const otherParticipant = activeConversation.participants.find(
      (p) => String(p._id) !== String(user?._id),
    );

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

    const otherParticipant = activeConversation.participants.find(
      (p) => String(p._id) !== String(user?._id),
    );

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

  if (!activeConversation) return null;

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <form
        onSubmit={handleSend}
        className="flex items-center space-x-3 max-w-5xl mx-auto"
      >
        <div className="flex space-x-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-blue-600 transition"
          >
            <Paperclip size={22} />
          </button>
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-blue-600 transition"
          >
            <Smile size={22} />
          </button>
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            onBlur={handleStopTyping}
            className="w-full px-5 py-3 bg-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition ${
              content.trim()
                ? "bg-blue-600 text-white shadow-md"
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
