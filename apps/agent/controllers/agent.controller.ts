
import type { Request, Response } from 'express';
import axios from 'axios';
import {agentGraph} from '../graph/graph';

export const agentController = async (req: Request, res: Response) => {
    try {

        const { prompt, conversationId } = req.body;

        await axios.post(`${process.env.CHAT_SERVICE_URL}/message`, {
            conversationId,
            role: "user",
            content: prompt
        });

       const result = await agentGraph.invoke({
            prompt,
            conversationId
        });

        const response = result.aiResponse

        await axios.post(`${process.env.CHAT_SERVICE_URL}/message`, {
            conversationId,
            role: "assistant",
            content: response
        });

        return res.status(200).json({ response });
       
        
    } catch (err) {
        console.error("Error in agent controller:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}