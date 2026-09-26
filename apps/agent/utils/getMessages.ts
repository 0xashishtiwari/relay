import axios from "axios";

export const getMessages = async (conversationId: string, userId?: string) => {
  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("conversationId is required to fetch messages");
  }
  const baseUrl = process.env.CHAT_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("CHAT_SERVICE_URL is not configured");
  }
  try {
    const { data } = await axios.get(
      `${baseUrl}/messages`,
      {
        params: { conversationId },
        timeout: 15_000,
        // Chat service requires the owner identity header; without it the
        // request is rejected with 400 "User ID is required".
        ...(userId ? { headers: { "x-user-id": userId } } : {}),
      }
    );

    // Chat service returns an envelope { success, messages } — unwrap tolerantly.
    if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown }).messages)) {
      return (data as { messages: unknown[] }).messages;
    }
    return data;
  } catch (error) {
    console.error("Error fetching messages:", error instanceof Error ? error.message : error);
    throw error;
  }
};
