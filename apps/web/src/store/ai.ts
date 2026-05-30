import { create } from "zustand";

type AIState = {
  isOpen: boolean;
  conversationId: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: string | null) => void;
};

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  conversationId: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setConversationId: (id) => set({ conversationId: id }),
}));
