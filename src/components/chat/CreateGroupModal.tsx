import React, { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { X, Users, Search, Check, Lock, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    members: string[];
    groupType: "public" | "private";
  }) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<"public" | "private">("private");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { users } = useSelector((state: RootState) => state.chat);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      members: selectedMembers,
      groupType,
    });
    // Reset
    setName("");
    setDescription("");
    setSelectedMembers([]);
    setGroupType("private");
    setSearchTerm("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Create Group
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              {/* Group Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                />
              </div>

              {/* Group Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupType("private")}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition font-medium text-sm ${
                      groupType === "private"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Lock size={16} />
                    <span>Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupType("public")}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border-2 transition font-medium text-sm ${
                      groupType === "public"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Globe size={16} />
                    <span>Public</span>
                  </button>
                </div>
              </div>

              {/* Add Members */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Add Members ({selectedMembers.length} selected)
                </label>
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedMembers.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => toggleMember(u._id)}
                        className={`w-full flex items-center space-x-3 p-2.5 rounded-lg transition ${
                          isSelected
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <span className="flex-1 text-left text-sm font-medium text-gray-800">
                          {u.username}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">
                      No users found
                    </p>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateGroupModal;
