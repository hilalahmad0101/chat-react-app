import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { updateGroup } from "../../store/slices/chatSlice";
import apiClient from "../../api/client";
import type { Group } from "../../types";
import {
  X,
  Users,
  Shield,
  UserPlus,
  UserMinus,
  Copy,
  Check,
  Lock,
  Globe,
  MessageSquareOff,
  MessageSquare,
  Search,
  Pencil,
  CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { users } = useSelector((state: RootState) => state.chat);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [renamingLoading, setRenamingLoading] = useState(false);

  const isAdmin =
    String(typeof group.admin === "string" ? group.admin : group.admin._id) ===
    String(currentUser?._id);

  const handleAddMember = async (userId: string) => {
    try {
      const response = await apiClient.post("/groups/add-member", {
        groupId: group._id,
        userId,
      });
      dispatch(updateGroup(response.data));
      toast.success("Member added!");
      setShowAddMember(false);
      setSearchTerm("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from the group?`)) return;
    try {
      const response = await apiClient.post("/groups/remove-member", {
        groupId: group._id,
        userId,
      });
      dispatch(updateGroup(response.data));
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === group.name) {
      setEditingName(false);
      return;
    }
    setRenamingLoading(true);
    try {
      const response = await apiClient.post("/groups/rename", {
        groupId: group._id,
        name: newName.trim(),
      });
      dispatch(updateGroup(response.data));
      toast.success("Group renamed!");
      setEditingName(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename group");
    } finally {
      setRenamingLoading(false);
    }
  };

  const handleToggleAdminOnly = async () => {
    try {
      const newStatus = !group.settings.onlyAdminCanMessage;
      const response = await apiClient.post("/groups/toggle-admin-only", {
        groupId: group._id,
        status: newStatus,
      });
      dispatch(updateGroup(response.data.group || response.data));
      toast.success(
        newStatus
          ? "Only admin can send messages now"
          : "All members can send messages now",
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update settings");
    }
  };

  const copyInviteCode = () => {
    if (group.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Invite code copied!");
    }
  };

  const memberIds = group.members.map((m) =>
    String(typeof m === "string" ? m : m._id),
  );
  const availableUsers = users.filter(
    (u) =>
      !memberIds.includes(String(u._id)) &&
      u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Group Info</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/20 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-3 flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {group.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Editable group name */}
                  {editingName && isAdmin ? (
                    <div className="flex items-center space-x-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") {
                            setEditingName(false);
                            setNewName(group.name);
                          }
                        }}
                        className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-lg px-2 py-1 text-lg font-bold outline-none border border-white/40 focus:border-white"
                        placeholder="Group name..."
                      />
                      <button
                        onClick={handleRename}
                        disabled={renamingLoading}
                        className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition"
                      >
                        <CheckCheck size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold truncate">
                        {group.name}
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setNewName(group.name);
                            setEditingName(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/20 transition flex-shrink-0"
                          title="Rename group"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-white/70 flex items-center space-x-1 mt-0.5">
                    {group.groupType === "private" ? (
                      <Lock size={12} />
                    ) : (
                      <Globe size={12} />
                    )}
                    <span className="capitalize">{group.groupType}</span>
                    <span>· {group.members.length} members</span>
                  </p>
                </div>
              </div>
              {group.description && (
                <p className="mt-2 text-sm text-white/80">
                  {group.description}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invite Code */}
              {group.groupType === "public" && group.inviteCode && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-700">
                      Invite Code
                    </p>
                    <p className="text-sm font-mono font-bold text-green-800">
                      {group.inviteCode}
                    </p>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition text-green-700"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              )}

              {/* Admin Settings */}
              {isAdmin && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                    <Shield size={14} />
                    <span>Admin Settings</span>
                  </h4>
                  <button
                    onClick={handleToggleAdminOnly}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      group.settings.onlyAdminCanMessage
                        ? "border-orange-200 bg-orange-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {group.settings.onlyAdminCanMessage ? (
                        <MessageSquareOff
                          size={18}
                          className="text-orange-500"
                        />
                      ) : (
                        <MessageSquare size={18} className="text-green-500" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">
                          Admin Only Messaging
                        </p>
                        <p className="text-xs text-gray-500">
                          {group.settings.onlyAdminCanMessage
                            ? "Only admins can send messages"
                            : "All members can send messages"}
                        </p>
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <div
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                        group.settings.onlyAdminCanMessage
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow transition-all duration-200 ${
                          group.settings.onlyAdminCanMessage
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              )}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                    <Users size={14} />
                    <span>Members ({group.members.length})</span>
                  </h4>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-blue-600"
                      title="Add member"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>

                {/* Add Member Search */}
                <AnimatePresence>
                  {showAddMember && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 space-y-2 bg-blue-50 p-3 rounded-xl border border-blue-200 overflow-hidden"
                    >
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={14}
                        />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search users to add..."
                          className="w-full pl-8 pr-4 py-2 bg-white rounded-lg text-sm outline-none border border-blue-200 focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {availableUsers.map((u) => (
                          <button
                            key={u._id}
                            onClick={() => handleAddMember(u._id)}
                            className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-blue-100 transition text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                              {u.username[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {u.username}
                            </span>
                            <UserPlus
                              size={14}
                              className="ml-auto text-blue-500"
                            />
                          </button>
                        ))}
                        {availableUsers.length === 0 && (
                          <p className="text-xs text-center text-gray-400 py-2">
                            No users available to add
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Member List */}
                <div className="space-y-1">
                  {group.members.map((member) => {
                    const m = typeof member === "string" ? null : member;
                    if (!m) return null;
                    const isMemberAdmin =
                      String(m._id) ===
                      String(
                        typeof group.admin === "string"
                          ? group.admin
                          : group.admin._id,
                      );

                    return (
                      <div
                        key={m._id}
                        className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 transition"
                      >
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {m.username[0]?.toUpperCase()}
                          </div>
                          {m.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-800">
                              {m.username}
                            </span>
                            {isMemberAdmin && (
                              <span className="text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 px-1.5 py-0.5 rounded-md">
                                Admin
                              </span>
                            )}
                            {String(m._id) === String(currentUser?._id) && (
                              <span className="text-[10px] text-gray-400">
                                (You)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {m.isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                        {isAdmin &&
                          !isMemberAdmin &&
                          String(m._id) !== String(currentUser?._id) && (
                            <button
                              onClick={() =>
                                handleRemoveMember(m._id, m.username)
                              }
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                              title="Remove member"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupInfoPanel;
