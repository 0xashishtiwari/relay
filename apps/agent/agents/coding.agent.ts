import { agentState } from "../graph/state";
import { runSpecialistAgent } from "./specialist.agent";

export const codingAgent = (state: typeof agentState.State) =>
    runSpecialistAgent(
        state,
        "You are Relay's coding agent. Help with programming, debugging, architecture, and code generation. Give practical, technically correct answers with code when useful.",
    );