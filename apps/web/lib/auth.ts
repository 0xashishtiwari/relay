import api from "./axios";
import { User } from "../types/user";

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const response = await api.get("/me");
        return response.data.user as User;
    }
    catch (error: any) {
        if (error.response?.status === 401)
            return null; // No active session

        console.error("Failed to fetch current user:", error);
        throw error;

    }
}

export const logout = async (): Promise<void> => {
    try {
        await api.get("/auth/logout");
    } catch (error: any) {
        console.error("Failed to logout:", error);
        throw error;
    }
}