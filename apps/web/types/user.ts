export interface User{
    userId: string;
    name: string;
    email: string;
    avatar: string;
    plan?: "free" | "starter" | "pro";
    credits?: number;
    totalCredits?: number;
    planExpiry?: string | null;
}