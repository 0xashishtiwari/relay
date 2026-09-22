import { agentState } from "../graph/state";
import { runSpecialistAgent } from "./specialist.agent";

export const imageGenAgent = (state: typeof agentState.State) =>
    runSpecialistAgent(
        state,
        "You are Relay's image generation agent. Help create detailed image prompts and visual concepts. Describe composition, subject, style, lighting, and useful generation parameters. Be clear when an actual image tool is unavailable.",
    );