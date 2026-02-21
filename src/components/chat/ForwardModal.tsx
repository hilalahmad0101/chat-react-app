import React, { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { socketService } from "../../utils/socket";
import type { Message } from "../../types";
import { X, Search, User, Users, Forward, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface ForwardModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  message,
  onClose,
}) => {
  const { conversations, groups } = useSelector(
    (state: RootState) => state.chat,
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<
    { id: string; type: "conversation" | "group"; name: string }[]
  >([]);
  const [sent, setSent] = useState(false);

  const filteredConversations = conversations
    .filter((c) => !c.isGroup)
    .filter((c) => {
      const other = c.participants.find(
        (p) => String(p._id) !== String(user?._id),
      );
      return other?.username.toLowerCase().includes(search.toLowerCase());
    });

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string, type: "conversation" | "group", name: string) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === id);
      return exists
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, type, name }];
    });
  };

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const handleForward = () => {
    if (!message || selected.length === 0) return;
    selected.forEach(({ id, type }) => {
      if (type === "conversation") {
        const conv = conversations.find((c) => c._id === id);
        const other = conv?.participants.find(
          (p) => String(p._id) !== String(user?._id),
        );
        socketService.emit("send_message", {
          conversationId: id,
          content: message.content,
          receiverId: other?._id,
          messageType:
            message.messageType === "system" ? "text" : message.messageType,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          isForwarded: true,
          originalMessageId: message._id,
        });
      } else {
        socketService.emit("send_group_message", {
          conversationId: id,
          content: message.content,
          messageType:
            message.messageType === "system" ? "text" : message.messageType,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          isForwarded: true,
        });
      }
    });
    setSent(true);
    toast.success(
      `Forwarded to ${selected.length} chat${selected.length > 1 ? "s" : ""}!`,
    );
    setTimeout(() => {
      setSent(false);
      setSelected([]);
      setSearch("");
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[82vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Forward size={18} className="text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  Forward Message
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Forwarded message preview */}
            <div className="mx-4 mt-3 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r-xl">
              <p className="text-xs font-semibold text-blue-600 mb-0.5">
                Forwarding:
              </p>
              <p className="text-sm text-gray-600 truncate">
                {message.messageType === "image"
                  ? "📷 Photo"
                  : message.messageType === "file"
                    ? `📎 ${message.fileName || "File"}`
                    : message.content}
              </p>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts & groups..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-4">
              {/* Conversations */}
              {filteredConversations.length > 0 && (
                <>
                  <p className="px-4 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Direct Messages
                  </p>
                  {filteredConversations.map((conv) => {
                    const other = conv.participants.find(
                      (p) => String(p._id) !== String(user?._id),
                    );
                    if (!other) return null;
                    const sel = isSelected(conv._id);
                    return (
                      <button
                        key={conv._id}
                        onClick={() =>
                          toggle(conv._id, "conversation", other.username)
                        }
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 transition ${sel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User size={18} className="text-gray-400" />
                          </div>
                          {other.isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-800">
                            {other.username}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 transition flex items-center justify-center ${sel ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                        >
                          {sel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Groups */}
              {filteredGroups.length > 0 && (
                <>
                  <p className="px-4 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-2">
                    Groups
                  </p>
                  {filteredGroups.map((g) => {
                    const convId =
                      typeof g.conversationId === "string"
                        ? g.conversationId
                        : g.conversationId._id;
                    const sel = isSelected(String(convId));
                    return (
                      <button
                        key={g._id}
                        onClick={() => toggle(String(convId), "group", g.name)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 transition ${sel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Users size={18} className="text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-800">
                            {g.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {g.members.length} members
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 transition flex items-center justify-center ${sel ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                        >
                          {sel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {filteredConversations.length === 0 &&
                filteredGroups.length === 0 && (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    No contacts found
                  </div>
                )}
            </div>

            {/* Footer */}
            {selected.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleForward}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                    sent
                      ? "bg-green-500 text-white"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                  }`}
                >
                  {sent
                    ? "✓ Forwarded!"
                    : `Forward to ${selected.length} chat${selected.length > 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForwardModal;
