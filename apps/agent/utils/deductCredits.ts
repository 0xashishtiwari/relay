import axios from "axios";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

export const deductCredits = async (userId: string, agent: string) => {
    if (!AUTH_SERVICE_URL) {
        throw new Error("AUTH_SERVICE_URL is not configured");
    }
    if (!userId || !agent) {
        throw new Error("userId and agent are required to deduct credits");
    }
    try {
        const { data } = await axios.post(
            `${AUTH_SERVICE_URL}/deductCredits`,
            { userId, agent },
            { timeout: 15_000 }
        );

        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            // Insufficient credits etc. — preserve the downstream message.
            const msg = (error.response.data as { error?: string; message?: string })?.error
                ?? (error.response.data as { message?: string })?.message
                ?? "Credit deduction rejected";
            const err = new Error(msg);
            (err as { statusCode?: number }).statusCode = 402;
            throw err;
        }
        console.error("Error deducting credits:", error instanceof Error ? error.message : error);
        throw error;
    }
};
