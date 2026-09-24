import { getModel } from "../config/llmModels";
import { agentState } from "../graph/state";
import axios from "axios";
import { randomUUID } from "node:crypto";
import { uploadFile } from "../config/storage";
import { generateSasUrl } from "../config/storage/storage";

export const imageGenAgent = async (
    state: typeof agentState.State
) => {
    try {
        const llm = await getModel("image");

        const res = await llm.invoke(`
You are a professional visual prompt engineer specializing in high-quality image generation.

Your task is to transform the user's request into a precise, visually rich prompt that an image generation model can directly understand.

USER REQUEST:
${state.prompt}

PROMPT ENGINEERING RULES:

1. PRESERVE INTENT
- Identify the main subject, action, environment, and purpose of the user's request.
- Never change the user's intended subject or meaning.
- Do not invent important objects, characters, text, brands, locations, or events unless they are implied or requested.
- If the request is simple, enhance it naturally without making it unnecessarily complex.

2. DESCRIBE THE SUBJECT
Clearly describe:
- who or what is being shown
- appearance, clothing, materials, shape, color, and important physical details
- pose, action, expression, or interaction
- distinctive characteristics explicitly requested by the user

3. COMPOSITION
Specify the most appropriate visual composition:
- foreground, middle ground, and background when useful
- camera angle
- framing
- subject placement
- perspective
- scale
- symmetry or asymmetry when relevant
- visual hierarchy

4. CAMERA AND PHOTOGRAPHY
For realistic or photographic scenes, naturally specify appropriate details such as:
- camera perspective
- focal length
- depth of field
- focus
- aperture
- cinematic framing
- realistic photographic detail

Do not add camera specifications when they would be inappropriate for the requested art style.

5. LIGHTING
Describe lighting appropriate to the scene:
- natural or artificial lighting
- direction and softness
- shadows
- highlights
- rim lighting when useful
- golden hour, overcast, studio lighting, neon lighting, volumetric lighting, etc.

6. STYLE
Identify the most appropriate visual style based on the user's request:
- photorealistic
- cinematic
- editorial photography
- 3D render
- anime
- illustration
- concept art
- watercolor
- oil painting
- minimal graphic design
- product photography
- architectural visualization
- or another appropriate style

Do not force a style if the user already specified one.

7. MATERIALS AND DETAILS
Include realistic textures, surfaces, materials, environmental details, and small visual elements that improve realism or artistic quality.

8. COLOR AND MOOD
Describe the appropriate:
- color palette
- contrast
- atmosphere
- emotional tone
- visual mood

9. QUALITY
Prioritize:
- coherent anatomy
- accurate proportions
- realistic lighting
- physically consistent shadows
- natural depth
- detailed textures
- clean composition
- visual clarity
- high detail

10. TEXT
If the user requests text inside the image:
- reproduce the requested wording exactly
- make the text clearly visible
- specify appropriate typography, placement, size, and hierarchy
- never invent additional text

11. AVOID UNNECESSARY DETAILS
Do not add random objects, characters, logos, text, visual effects, or stylistic elements that were not requested and do not help the scene.

12. NEGATIVE CONSTRAINTS
When relevant, naturally prevent common visual problems such as:
- distorted anatomy
- extra fingers or limbs
- duplicate objects
- malformed faces
- unnatural proportions
- blurry subject
- cluttered composition
- unwanted text
- watermarks
- excessive artifacts

OUTPUT FORMAT:
Return ONLY ONE polished image-generation prompt.

The prompt must:
- be written in English
- be a single paragraph
- contain no explanations
- contain no headings
- contain no bullet points
- contain no markdown
- contain no references to AI, language models, or prompt engineering
- be directly usable by an image generation model

Generate the final visual prompt now.
`);

        const imagePrompt =
            typeof res.content === "string"
                ? res.content
                : res.content
                      .map((block) =>
                          typeof block === "string"
                              ? block
                              : typeof block === "object" &&
                                  block !== null &&
                                  "text" in block &&
                                  typeof block.text === "string"
                                ? block.text
                                : ""
                      )
                      .join(" ");

        if (!imagePrompt.trim()) {
            throw new Error("Image prompt generation failed");
        }

        // Generate image
        const imageUrl =
            "https://image.pollinations.ai/prompt/" +
            encodeURIComponent(imagePrompt.trim());

        const imageResponse = await axios.get(
            imageUrl,
            {
                responseType: "arraybuffer",
                timeout: 120000,
            }
        );

        const imageId = randomUUID();

        const blobName =
            `generated-images/${imageId}.png`;

        const buffer = Buffer.from(
            imageResponse.data
        );

        const contentType = "image/png";

        // Upload to Azure
        await uploadFile({
            buffer,
            blobName,
            contentType,
        });

        // Generate temporary private URL
        const sasUrl = generateSasUrl(
            blobName,
            60
        );

        console.log(
            `Image uploaded to Azure: ${blobName}`
        );

        return {
            ...state,

            aiResponse: "Image generated successfully.",
            images: [sasUrl],
        };
    } catch (error) {
        console.error(
            "Error generating image:",
            error
        );

        return {
            ...state,

            aiResponse:
                "An error occurred while generating the image.",
        };
    }
};