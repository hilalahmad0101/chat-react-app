import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import {
  setConversations,
  setActiveConversation,
  setUsers,
  setGroups,
  setActiveGroup,
  addGroup,
} from "../../store/slices/chatSlice";
import apiClient from "../../api/client";
import {
  User,
  LogOut,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
  Users,
  Plus,
  Lock,
  Globe,
} from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { socketService } from "../../utils/socket";
import CreateGroupModal from "./CreateGroupModal";
import type { Conversation, Group } from "../../types";
import toast from "react-hot-toast";

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    conversations,
    activeConversation,
    users,
    groups,
    typingUsers,
    unreadCounts,
  } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "users" | "groups">(
    "chats",
  );
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await apiClient.get("/chat/conversations");
        dispatch(setConversations(response.data));
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("/users/search");
        dispatch(setUsers(response.data));
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    const fetchGroups = async () => {
      try {
        const response = await apiClient.get("/groups");
        dispatch(setGroups(response.data));
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    };

    fetchConversations();
    fetchUsers();
    fetchGroups();
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleStartChat = async (userId: string) => {
    try {
      const response = await apiClient.post("/chat/conversations", {
        receiverId: userId,
      });
      const newConv = response.data;

      const existingConv = conversations.find((c) => c._id === newConv._id);
      if (!existingConv) {
        const freshConvRes = await apiClient.get("/chat/conversations");
        dispatch(setConversations(freshConvRes.data));
        const updatedConv = freshConvRes.data.find(
          (c: any) => c._id === newConv._id,
        );
        dispatch(setActiveConversation(updatedConv));
      } else {
        dispatch(setActiveConversation(existingConv));
      }
      setActiveTab("chats");
    } catch (err) {
      console.error("Failed to start chat", err);
    }
  };

  const handleOpenGroup = (group: Group) => {
    // Get the conversation associated with this group
    const conv =
      typeof group.conversationId === "string"
        ? conversations.find((c) => c._id === group.conversationId)
        : (group.conversationId as Conversation);

    if (conv) {
      dispatch(
        setActiveConversation({
          ...conv,
          isGroup: true,
          groupName: group.name,
          groupData: {
            name: group.name,
            admin: group.admin,
            description: group.description,
            avatar: group.avatar,
          },
        }),
      );
      dispatch(setActiveGroup(group));

      // Join the socket room
      socketService.emit("join_group", group._id);
    }
  };

  const handleCreateGroup = async (data: {
    name: string;
    description: string;
    members: string[];
    groupType: "public" | "private";
  }) => {
    try {
      const response = await apiClient.post("/groups", data);
      dispatch(addGroup(response.data));
      setShowCreateGroup(false);
      toast.success("Group created!");

      // Re-fetch conversations to include group conversation
      const convRes = await apiClient.get("/chat/conversations");
      dispatch(setConversations(convRes.data));

      // Open the newly created group
      handleOpenGroup(response.data);
      setActiveTab("chats");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (conv.isGroup) {
      return (
        conv.groupData?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        conv.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const otherParticipant = conv.participants.find(
      (p) => String(p._id) !== String(user?._id),
    );
    return otherParticipant?.username
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-80 h-full flex flex-col bg-white border-r border-gray-200">
      {/* Profile Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="text-blue-600 w-6 h-6" />
          </div>
          <span className="font-semibold text-gray-700">{user?.username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-500 transition"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "chats" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "groups" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          Groups
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "users" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          Users
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder={
              activeTab === "chats"
                ? "Search chats..."
                : activeTab === "groups"
                  ? "Search groups..."
                  : "Find users..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* === CHATS TAB === */}
        {activeTab === "chats" ? (
          filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isGroupConv = conv.isGroup;
              const otherParticipant = !isGroupConv
                ? conv.participants.find(
                    (p) => String(p._id) !== String(user?._id),
                  )
                : null;
              const isActive = activeConversation?._id === conv._id;
              const displayName = isGroupConv
                ? conv.groupData?.name || conv.groupName || "Group"
                : otherParticipant?.username || "Unknown";

              return (
                <button
                  key={conv._id}
                  onClick={() => {
                    if (isGroupConv) {
                      // Find the group for this conversation
                      const g = groups.find((grp) => {
                        const convId =
                          typeof grp.conversationId === "string"
                            ? grp.conversationId
                            : grp.conversationId._id;
                        return String(convId) === String(conv._id);
                      });
                      if (g) {
                        handleOpenGroup(g);
                      } else {
                        dispatch(setActiveConversation(conv));
                      }
                    } else {
                      dispatch(setActiveConversation(conv));
                    }
                  }}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition border-b border-gray-100 ${isActive ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                        isGroupConv
                          ? "bg-gradient-to-br from-blue-500 to-purple-600"
                          : "bg-gray-200"
                      }`}
                    >
                      {isGroupConv ? (
                        <Users className="text-white" size={20} />
                      ) : otherParticipant?.avatar ? (
                        <img
                          src={otherParticipant.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="text-gray-400" />
                      )}
                    </div>
                    {!isGroupConv && otherParticipant?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900 truncate">
                        {displayName}
                      </span>
                      <div className="flex flex-col items-end space-y-1">
                        <span className="text-xs text-gray-400">
                          {conv.lastMessage &&
                            new Date(
                              conv.lastMessage.createdAt,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </span>
                        {unreadCounts[conv._id] > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCounts[conv._id]}
                          </span>
                        )}
                      </div>
                    </div>
                    {typingUsers[conv._id]?.length > 0 ? (
                      <p className="text-sm text-blue-600 italic font-medium truncate mt-1 animate-pulse">
                        Typing...
                      </p>
                    ) : (
                      <div className="flex items-center space-x-1 mt-1 overflow-hidden">
                        {conv.lastMessage &&
                          String(conv.lastMessage.senderId) ===
                            String(user?._id) && (
                            <span
                              className={`${conv.lastMessage.status === "seen" ? "text-green-500" : "text-gray-400"} flex-shrink-0`}
                            >
                              {conv.lastMessage.status === "sent" ? (
                                <Check size={14} />
                              ) : (
                                <CheckCheck size={14} />
                              )}
                            </span>
                          )}
                        <p className="text-sm text-gray-500 truncate">
                          {conv.lastMessage
                            ? conv.lastMessage.messageType !== "text"
                              ? conv.lastMessage.messageType === "image"
                                ? "📷 Photo"
                                : "📎 File"
                              : conv.lastMessage.content
                            : "No messages yet"}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>No conversations found</p>
              <button
                onClick={() => setActiveTab("users")}
                className="mt-4 text-sm text-blue-600 font-medium hover:underline"
              >
                Find people to chat with
              </button>
            </div>
          )
        ) : /* === GROUPS TAB === */
        activeTab === "groups" ? (
          <div>
            {/* Create Group Button */}
            <div className="px-4 pb-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Plus size={20} className="text-white" />
                </div>
                <span className="font-semibold text-blue-700">
                  Create New Group
                </span>
              </button>
            </div>

            {filteredGroups.length > 0 ? (
              filteredGroups.map((g) => {
                const convId =
                  typeof g.conversationId === "string"
                    ? g.conversationId
                    : g.conversationId._id;
                const conv =
                  typeof g.conversationId === "string"
                    ? null
                    : g.conversationId;

                const isAdmin =
                  String(
                    typeof g.admin === "string" ? g.admin : g.admin._id,
                  ) === String(user?._id);

                return (
                  <button
                    key={g._id}
                    onClick={() => handleOpenGroup(g)}
                    className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition border-b border-gray-100 ${
                      activeConversation?._id === String(convId)
                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="text-white" size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 truncate">
                            {g.name}
                          </span>
                          {g.groupType === "private" ? (
                            <Lock size={12} className="text-gray-400" />
                          ) : (
                            <Globe size={12} className="text-green-500" />
                          )}
                        </div>
                        {unreadCounts[String(convId)] > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCounts[String(convId)]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {g.members.length} members
                        </p>
                        {isAdmin && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-md">
                            Admin
                          </span>
                        )}
                        {g.settings.onlyAdminCanMessage && (
                          <span className="text-[10px] text-orange-500">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <Users size={48} className="mb-4 opacity-20" />
                <p>No groups yet</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-4 text-sm text-blue-600 font-medium hover:underline"
                >
                  Create your first group
                </button>
              </div>
            )}
          </div>
        ) : /* === USERS TAB === */
        filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => handleStartChat(u._id)}
              className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition border-b border-gray-100"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="text-blue-500 opacity-60" />
                  )}
                </div>
                {u.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 text-left flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900">{u.username}</span>
                  <p className="text-xs text-gray-400">
                    {u.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
                {(() => {
                  const userConv = conversations.find(
                    (c) =>
                      !c.isGroup &&
                      c.participants.some(
                        (p) => String(p._id) === String(u._id),
                      ),
                  );
                  const count = userConv ? unreadCounts[userConv._id] : 0;
                  return (
                    count > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {count}
                      </span>
                    )
                  );
                })()}
              </div>
            </button>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <User size={48} className="mb-4 opacity-20" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  );
};

export default Sidebar;
