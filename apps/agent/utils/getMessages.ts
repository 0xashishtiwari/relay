import axios from "axios";

export const getMessages = async (conversationId: string) => {
  try {
    const { data } = await axios.get(
      `${process.env.CHAT_SERVICE_URL}/messages`,
      { params: { conversationId } }
    );

    return data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};