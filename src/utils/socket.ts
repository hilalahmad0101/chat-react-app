import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addMessage, setTyping, updateOnlineStatus, updateMessageStatus } from '../store/slices/chatSlice';

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
      console.log('Socket: received message', message);
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message, currentUserId }));
    });

    this.socket.on('receive_group_message', (data) => {
      console.log('Socket: received group message', data);
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message: data.message, currentUserId }));
    });

    this.socket.on('message_sent', (message) => {
      console.log('Socket: message sent confirmation', message);
      const currentUserId = store.getState().auth.user?._id;
      store.dispatch(addMessage({ message, currentUserId }));
    });

    this.socket.on('typing', (data) => {
      console.log('Socket: user typing', data);
      store.dispatch(setTyping({ ...data, isTyping: true }));
    });

    this.socket.on('stop_typing', (data) => {
      console.log('Socket: user stopped typing', data);
      store.dispatch(setTyping({ ...data, isTyping: false }));
    });

    this.socket.on('user_online', (data) => {
      console.log('Socket: user online', data.userId);
      store.dispatch(updateOnlineStatus({ userId: data.userId, isOnline: true }));
    });

    this.socket.on('user_offline', (data) => {
      console.log('Socket: user offline', data.userId);
      store.dispatch(updateOnlineStatus({ userId: data.userId, isOnline: false }));
    });

    this.socket.on('message_status_updated', (data) => {
      console.log('Socket: message status updated', data);
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
