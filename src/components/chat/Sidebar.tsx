import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import {
  setConversations,
  setActiveConversation,
  setUsers,
} from "../../store/slices/chatSlice";
import apiClient from "../../api/client";
import {
  User,
  LogOut,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
} from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { useNavigate } from "react-router-dom";

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    conversations,
    activeConversation,
    users,
    typingUsers,
    unreadCounts,
  } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "users">("chats");

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

    fetchConversations();
    fetchUsers();
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

      // Check if conversation already exists in our list
      const existingConv = conversations.find((c) => c._id === newConv._id);
      if (!existingConv) {
        // We might need to fetch it again to get populated participants
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

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participants.find((p) => p._id !== user?._id);
    return (
      otherParticipant?.username
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      conv.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()),
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
              activeTab === "chats" ? "Search chats..." : "Find users..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" ? (
          filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const otherParticipant = conv.participants.find(
                (p) => String(p._id) !== String(user?._id),
              );
              const isActive = activeConversation?._id === conv._id;

              return (
                <button
                  key={conv._id}
                  onClick={() => dispatch(setActiveConversation(conv))}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition border-b border-gray-100 ${isActive ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {otherParticipant?.avatar ? (
                        <img
                          src={otherParticipant.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="text-gray-400" />
                      )}
                    </div>
                    {otherParticipant?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900 truncate">
                        {conv.isGroup
                          ? conv.groupName
                          : otherParticipant?.username}
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
                            ? conv.lastMessage.content
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
        ) : filteredUsers.length > 0 ? (
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
    </div>
  );
};

export default Sidebar;
