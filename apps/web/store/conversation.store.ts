import { create } from "zustand";

export interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

interface ConversationStore {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;

  setConversations: (conversations: Conversation[]) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  selectedConversation: null,
  isLoading: true,

  setConversations: (conversations) => set({ conversations }),

  setSelectedConversation: (conversation) =>
    set({ selectedConversation: conversation }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      selectedConversation: conversation,
    })),

  updateConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item._id === conversation._id ? conversation : item,
      ),
      selectedConversation:
        state.selectedConversation?._id === conversation._id
          ? conversation
          : state.selectedConversation,
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter(
        (conversation) => conversation._id !== conversationId,
      ),
      selectedConversation:
        state.selectedConversation?._id === conversationId
          ? null
          : state.selectedConversation,
    })),

  setLoading: (isLoading) => set({ isLoading }),
}));