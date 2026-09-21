import { create } from "zustand";
import { User } from "../types/user";

interface UserStore {
  user: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  clearUser: () => set({ user: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));