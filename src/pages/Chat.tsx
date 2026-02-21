import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { socketService } from "../utils/socket";
import Sidebar from "../components/chat/Sidebar";
import ChatArea from "../components/chat/ChatArea";
import MessageInput from "../components/chat/MessageInput";
import { setSidebarOpen } from "../store/slices/chatSlice";

const Chat: React.FC = () => {
  const { token, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const { isSidebarOpen } = useSelector((state: RootState) => state.chat);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  // Close sidebar on mobile when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        dispatch(setSidebarOpen(true));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-white overflow-hidden font-inter relative">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Sidebar - Responsive Container */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 w-80 h-full bg-white shadow-2xl lg:shadow-none`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 uppercase shadow-inner overflow-hidden">
        <ChatArea />
        <MessageInput />
      </div>
    </div>
  );
};

export default Chat;
