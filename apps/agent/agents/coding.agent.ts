import { randomUUID } from "node:crypto";
import { getModel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { deductCredits } from "../utils/deductCredits";

const CODE_INTENTS = [
    "CODE_GENERATION",
    "CODE_REVIEW",
    "CODE_DEBUGGING",
    "CODE_OPTIMIZATION",
    "CONVERSATION",
    "DOCUMENTATION",
    "TESTING",
] as const;

type CodeIntent = (typeof CODE_INTENTS)[number];

const isCodeIntent = (value: string): value is CodeIntent =>
    (CODE_INTENTS as readonly string[]).includes(value);

const INTENT_PROMPT = `
You are the intent classifier for Relay's Coding Agent.

Classify the user's request into exactly ONE of:

CODE_GENERATION
CODE_REVIEW
CODE_DEBUGGING
CODE_OPTIMIZATION
CONVERSATION
DOCUMENTATION
TESTING

Definitions:

CODE_GENERATION:
New code, feature, function, component, API, project,
or implementation.

CODE_REVIEW:
Existing code is provided and the user wants review,
analysis, correctness checks, or improvements.

CODE_DEBUGGING:
The user has a bug, error, exception, crash,
unexpected behavior, or incorrect output.

CODE_OPTIMIZATION:
The user wants better performance, lower memory usage,
lower latency, better scalability, or algorithmic optimization.

DOCUMENTATION:
README, comments, API documentation, technical documentation,
or code explanations.

TESTING:
Unit tests, integration tests, test cases, test suites,
or test coverage.

CONVERSATION:
General programming discussion that does not clearly
fit another category.

Return ONLY the intent value.
Do not explain.
Do not return JSON.
Do not use markdown.

USER REQUEST:
`;

const GENERATION_PROMPT = `
You are Relay, an expert software engineer and coding agent.

Generate the requested code or project.

LANGUAGE AND STACK RULES:

- Always follow an explicitly requested language or framework.
- For algorithms, data structures, competitive programming, dynamic programming,
    tabulation, memoization, or interview problems, generate C++17 by default
    when no language is specified. Use a file such as main.cpp.
- For backend requests, use the requested backend language and framework.
- Use HTML, CSS, and JavaScript only when the user asks for a webpage, website,
    frontend, UI, browser app, or live visual experience.
- Use React or React Native only when explicitly requested.
- Do not turn an algorithm request into a web page or visual demo.
- Do not introduce unnecessary dependencies.

WEB PROJECT RULES:

- Apply responsive UI requirements only to web or frontend requests.
- A web project should include index.html and its referenced CSS/JavaScript files.
- A non-web coding request should contain source files for the requested language,
    not HTML/CSS/JavaScript placeholders.

APPLICATION STRUCTURE:

- Create the smallest complete set of files needed for the request.
- Create multiple files only when they improve the requested implementation.

OUTPUT:

Return ONLY valid JSON using this schema:

{
    "files": [
        {
            "name": "index.html",
            "content": "..."
        }
    ]
}

RULES:

- Valid JSON only
- No markdown
- No code fences
- No explanations
- No text outside JSON
- Every file must contain complete source code
- Never mention internal intent classification

USER REQUEST:
`;

const GENERAL_CODING_PROMPT = `
You are Relay, an expert software engineer.

Answer the user's coding request directly.

Requirements:

- Be technically correct.
- Be practical.
- Explain the important reasoning.
- Include code when useful.
- Preserve the user's technology choices.
- Do not invent requirements.
- Use Markdown.
- Do not mention internal intent classification.

USER REQUEST:
`;

const parseGeneratedProject = (content: string) => {
    const normalizedContent = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");

    const parsed = JSON.parse(normalizedContent);

    if (!parsed || !Array.isArray(parsed.files)) {
        throw new Error("Invalid project structure returned by coding model.");
    }

    return parsed;
};

export const codingAgent = async (
    state: typeof agentState.State
) => {
    // -----------------------------------------
    // GET USER MESSAGE
    // -----------------------------------------


    const userMessage = Array.isArray(state.prompt)
        ? String(state.prompt.at(-1) ?? "")
        : String(state.prompt ?? "");

    if (!userMessage.trim()) {
        return {
            ...state,
            intent: "CONVERSATION" as CodeIntent,
            aiResponse: "Please provide a coding request.",
            artifacts: [],
        };
    }

    // -----------------------------------------
    // 1. CLASSIFY INTENT
    // -----------------------------------------

    const intentLlm = await getModel("intent");

    const intentResponse = await intentLlm.invoke(
        `${INTENT_PROMPT}\n${userMessage}`
    );

    const rawIntent = intentResponse.content
        .toString()
        .trim()
        .toUpperCase();

    const intent: CodeIntent = isCodeIntent(rawIntent)
        ? rawIntent
        : "CONVERSATION";

    // -----------------------------------------
    // 2. CODE GENERATION
    // -----------------------------------------

    if (intent === "CODE_GENERATION") {
        const codingLlm = await getModel("coding");

        try {
            const response = await codingLlm.invoke(
                `${GENERATION_PROMPT}\n${userMessage}`
            );

            const rawContent = response.content
                .toString()
                .trim();

            const data = parseGeneratedProject(rawContent);
            await deductCredits(state.userId, "coding");

            return {
                ...state,

                intent,

                aiResponse:
                    "Code generation completed successfully.",

                artifacts: [
                    {
                        id: randomUUID(),
                        type: "code-project",
                        files: data.files,
                        title: state.prompt.slice(0, 100) || "Untitled Project",
                    },
                ],
            };
        } catch (error) {
            console.error(
                "[CodingAgent] Code generation failed:",
                error
            );

            return {
                ...state,
                intent,
                aiResponse:
                    "I couldn't generate the project correctly. Please try again.",
                artifacts: [],
            };
        }
    }

    // -----------------------------------------
    // 3. GENERAL CODING TASKS
    // -----------------------------------------

    const codingLlm = await getModel("coding");

    const response = await codingLlm.invoke(
        `${GENERAL_CODING_PROMPT}\n${userMessage}`
    );
    
    return {
        ...state,

        intent,

        aiResponse: response.content.toString(),

        artifacts: [],
    };
};