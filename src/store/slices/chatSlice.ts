import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Conversation, Message, User, Group } from '../../types';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  users: User[];
  groups: Group[];
  activeGroup: Group | null;
  isSidebarOpen: boolean;
  typingUsers: { [convId: string]: string[] };
  unreadCounts: { [convId: string]: number };
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  users: [],
  groups: [],
  activeGroup: null,
  isSidebarOpen: true,
  typingUsers: {},
  unreadCounts: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.activeConversation = action.payload;
      state.messages = [];
      state.activeGroup = null;
      if (action.payload) {
        state.unreadCounts[action.payload._id] = 0;
      }
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload;
    },
    setActiveGroup: (state, action: PayloadAction<Group | null>) => {
      state.activeGroup = action.payload;
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      const exists = state.groups.find(g => g._id === action.payload._id);
      if (!exists) {
        state.groups.unshift(action.payload);
      }
    },
    updateGroup: (state, action: PayloadAction<Group>) => {
      const index = state.groups.findIndex(g => g._id === action.payload._id);
      if (index !== -1) {
        state.groups[index] = action.payload;
      }
      if (state.activeGroup?._id === action.payload._id) {
        state.activeGroup = action.payload;
      }
    },
    addMessage: (state, action: PayloadAction<{ message: any; currentUserId?: string }>) => {
      const { message, currentUserId } = action.payload;
      
      // Handle both raw and populated conversationId
      const conversationData = typeof message.conversationId === 'string' 
        ? null 
        : message.conversationId;
      const conversationId = conversationData ? String(conversationData._id) : String(message.conversationId);
      
      const senderId = message.senderId;
      const senderIdStr = String(typeof senderId === 'string' ? senderId : senderId._id);
      
      if (state.activeConversation?._id === conversationId) {
        const alreadyExists = state.messages.some(m => m._id === message._id);
        if (!alreadyExists) {
          state.messages.push(message);
        }
      } else if (senderIdStr !== String(currentUserId)) {
        // Increment unread count if message is not from current user and not in active conversation
        state.unreadCounts[conversationId] = (state.unreadCounts[conversationId] || 0) + 1;
      }

      // Update last message in conversation list
      const convIndex = state.conversations.findIndex(c => String(c._id) === conversationId);
      if (convIndex !== -1) {
        state.conversations[convIndex].lastMessage = message;
        // Move to top
        const [conv] = state.conversations.splice(convIndex, 1);
        state.conversations.unshift(conv);
      } else if (conversationData) {
        // If conversation is missing but we have the data, add it
        const newConv = {
          ...conversationData,
          lastMessage: message
        };
        state.conversations.unshift(newConv);
      }
    },
    setTyping: (state, action: PayloadAction<{ conversationId: string; username: string; isTyping: boolean }>) => {
      const { conversationId, username, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (isTyping) {
        if (!state.typingUsers[conversationId].includes(username)) {
          state.typingUsers[conversationId].push(username);
        }
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(u => u !== username);
      }
    },
    updateOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      const { userId, isOnline } = action.payload;
      
      // Update online status in conversations
      state.conversations.forEach(conv => {
        conv.participants.forEach(p => {
          if (String(p._id) === String(userId)) p.isOnline = isOnline;
        });
      });

      // Update online status in active conversation
      if (state.activeConversation) {
        state.activeConversation.participants.forEach(p => {
          if (String(p._id) === String(userId)) p.isOnline = isOnline;
        });
      }

      // Update online status in users list
      const userIndex = state.users.findIndex(u => String(u._id) === String(userId));
      if (userIndex !== -1) {
        state.users[userIndex].isOnline = isOnline;
      }

      // If user went offline, clear their typing status globally
      if (!isOnline) {
        Object.keys(state.typingUsers).forEach(convId => {
          state.typingUsers[convId] = state.typingUsers[convId].filter(_ => {
            return true; // placeholder
          });
        });
      }
    },
    updateMessageStatus: (state, action: PayloadAction<{ messageId: string; status: 'sent' | 'delivered' | 'seen' }>) => {
      const { messageId, status } = action.payload;
      const msgIndex = state.messages.findIndex(m => m._id === messageId);
      if (msgIndex !== -1) {
        state.messages[msgIndex].status = status;
      }
      // Also update in conversations lastMessage if applicable
      state.conversations.forEach(conv => {
        if (conv.lastMessage?._id === messageId) {
          conv.lastMessage.status = status;
        }
      });
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    }
  },
});

export const {
  setConversations, setActiveConversation, setMessages, setUsers, addMessage,
  setTyping, updateOnlineStatus, updateMessageStatus, toggleSidebar, setSidebarOpen,
  setGroups, setActiveGroup, addGroup, updateGroup,
} = chatSlice.actions;
export default chatSlice.reducer;
