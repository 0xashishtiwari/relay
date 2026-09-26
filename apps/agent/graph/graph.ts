import { END, START, StateGraph } from "@langchain/langgraph";
import { agentState } from "./state";
import { router } from "./router";
import { chatAgent } from "../agents/chat.agent";
import { imageGenAgent } from "../agents/imageGen.agent";
import { pdfAgent } from "../agents/pdf.agent";
import { codingAgent } from "../agents/coding.agent";
import { searchAgent } from "../agents/search.agent";
import { pptAgent } from "../agents/ppt.agent";
import { pdfRagAgent } from "../agents/pdfRag.agent";
import { imageRagAgent } from "../agents/imageRag.agent";

const workflow = new StateGraph(agentState)
  .addNode("router", router)
  .addNode("chat", chatAgent)
  .addNode("search", searchAgent)
  .addNode("coding", codingAgent)
  .addNode("pdf", pdfAgent)
  .addNode("ppt", pptAgent)
  .addNode("imageGen", imageGenAgent)
  .addNode("pdfRag", pdfRagAgent)
  .addNode("imageRag", imageRagAgent)
  .addEdge(START, "router")
  .addConditionalEdges("router", (state) => {
    if (state.agent === "chat") return "chat";
    if (state.agent === "search") return "search";
    if (state.agent === "coding") return "coding";
    if (state.agent === "pdf") return "pdf";
    if (state.agent === "ppt") return "ppt";
    if (state.agent === "imageGen") return "imageGen";
    if (state.agent === "pdfRag") return "pdfRag";
    if (state.agent === "imageRag") return "imageRag";
    return END;
  }, ["chat", "search", "coding", "pdf", "ppt", "imageGen", "pdfRag", "imageRag"])
  .addEdge("chat", END)
  .addEdge("coding", END)
  .addEdge("pdf", END)
  .addEdge("ppt", END)
  .addEdge("imageGen", END)
  .addEdge("pdfRag", END)
  .addEdge("imageRag", END);

workflow.addEdge("search", "chat");

export const agentGraph = workflow.compile();
