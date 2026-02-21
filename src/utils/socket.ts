import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  addMessage,
  setTyping,
  updateOnlineStatus,
  updateMessageStatus,
  addGroup,
  updateGroup,
  setConversations,
  setActiveConversation,
  setActiveGroup,
} from '../store/slices/chatSlice';
import apiClient from '../api/client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket) return;

    this.socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('receive_message', (message) => {
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message, currentUserId }));
    });

    this.socket.on('receive_group_message', (data) => {
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message: data.message, currentUserId }));
    });

    this.socket.on('message_sent', (message) => {
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message, currentUserId }));
    });

    // ── Group real-time events ──────────────────────────────────────────
    this.socket.on('group_created', async (group) => {
      console.log('Socket: group created', group);
      // Add the group to the store
      store.dispatch(addGroup(group));
      // Also refresh conversations so the group conv shows in Chats tab
      try {
        const res = await apiClient.get('/chat/conversations');
        store.dispatch(setConversations(res.data));
      } catch (_) {}
    });

    this.socket.on('group_updated', (group) => {
      console.log('Socket: group updated', group);
      store.dispatch(updateGroup(group));

      // If this group is currently active, refresh activeGroup as well
      const activeGroup = store.getState().chat.activeGroup;
      if (activeGroup?._id === group._id) {
        store.dispatch(setActiveGroup(group));
      }
    });

    this.socket.on('group_member_removed', ({ groupId, userId }: { groupId: string; userId: string }) => {
      const currentUserId = store.getState().auth.user?._id;
      if (String(currentUserId) === String(userId)) {
        // I was removed — close the active conversation if it was this group
        const activeGroup = store.getState().chat.activeGroup;
        if (activeGroup?._id === groupId) {
          store.dispatch(setActiveConversation(null));
          store.dispatch(setActiveGroup(null));
        }
      }
    });

    // ── Typing ──────────────────────────────────────────────────────────
    this.socket.on('typing', (data) => {
      store.dispatch(setTyping({ ...data, isTyping: true }));
    });

    this.socket.on('stop_typing', (data) => {
      store.dispatch(setTyping({ ...data, isTyping: false }));
    });

    // ── Presence ────────────────────────────────────────────────────────
    this.socket.on('user_online', (data) => {
      store.dispatch(updateOnlineStatus({ userId: data.userId, isOnline: true }));
    });

    this.socket.on('user_offline', (data) => {
      store.dispatch(updateOnlineStatus({ userId: data.userId, isOnline: false }));
    });

    // ── Message status ───────────────────────────────────────────────────
    this.socket.on('message_status_updated', (data) => {
      store.dispatch(updateMessageStatus(data));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
