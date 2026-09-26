import api from "./axios";
import { User } from "../types/user";
import { unwrapObject } from "./errors";

interface MeResponse {
    user?: User;
}

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const response = await api.get("/me");
        const user = unwrapObject<User | undefined>((response.data as MeResponse)?.user ?? response.data);
        return (user as User | undefined) ?? null;
    }
    catch (error: unknown) {
        if ((error as { status?: number })?.status === 401) return null; // No active session
        console.error("Failed to fetch current user:", error);
        throw error; // already an ApiError via interceptor
    }
}

export const logout = async (): Promise<void> => {
    try {
        await api.get("/auth/logout");
    } catch (error: unknown) {
        console.error("Failed to logout:", error);
        throw error;
    }
}

export const deleteAccount = async (): Promise<void> => {
    try {
        await api.delete("/auth/account");
    } catch (error: unknown) {
        console.error("Failed to delete account:", error);
        throw error;
    }
}
