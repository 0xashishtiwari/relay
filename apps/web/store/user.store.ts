import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types/user";

interface UserStore {
  user: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  patchUser: (partial: Partial<User>) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,

      setUser: (user) => set({ user, isLoading: false }),

      patchUser: (partial) =>
        set((state) => (state.user ? { user: { ...state.user, ...partial } } : state)),

      clearUser: () => set({ user: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "relay-user",
      partialize: (state) => ({ user: state.user }),
    }
  )
);