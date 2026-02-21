export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'seen';
  parentMessageId?: string | Message;   // populated reply-to
  isForwarded?: boolean;
  createdAt: string;
}

export interface GroupData {
  name?: string;
  admin?: string | User;
  description?: string;
  avatar?: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  isGroup: boolean;
  groupName?: string;
  groupData?: GroupData;
  updatedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  admin: string | User;
  members: User[];
  conversationId: string | Conversation;
  groupType: 'public' | 'private';
  inviteCode?: string;
  settings: {
    onlyAdminCanMessage: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
