import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
};

export const generateDescription = async (mainImageBase64: string, imageMimeType: string): Promise<string> => {
  try {
    const imagePart = fileToGenerativePart(mainImageBase64, imageMimeType);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, {text: "Describe the product shown in the image in a concise paragraph, focusing on its key visual features and potential materials."}] },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating description:", error);
    throw new Error("Failed to generate product description.");
  }
};

export const editImage = async (mainImageBase64: string, supplementalImagesBase64: string[], imageMimeType: string, prompt: string): Promise<{ newImageBase64: string; textResponse: string }> => {
  try {
    const mainImagePart = fileToGenerativePart(mainImageBase64, imageMimeType);
    const supplementalImageParts = supplementalImagesBase64.map(img => fileToGenerativePart(img, 'image/png')); // Assuming png/jpeg for supplementals
    
    // FIX: Correctly construct the `parts` array to have a consistent union type,
    // allowing both image and text parts. This resolves the TypeScript error where
    // a text part could not be pushed to an array inferred to only contain image parts.
    const parts = [
        mainImagePart,
        ...supplementalImageParts,
        ...(prompt ? [{ text: prompt }] : [])
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    let newImageBase64 = '';
    let textResponse = "No text response from AI.";

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            newImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
            textResponse = part.text;
        }
    }

    if (!newImageBase64) {
      throw new Error("AI did not return an edited image.");
    }
    
    return { newImageBase64, textResponse };
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit the product image.");
  }
};

export const generateSketch = async (imageBase64: string, imageMimeType: string): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(imageBase64, imageMimeType);
        const prompt = "Generate a clean, black and white technical line drawing of this product. The sketch should be suitable for a manufacturing specification sheet. Focus on clear outlines, form, and key details. Remove all color, shading, and background elements. The output should be a single, clear product sketch.";
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: prompt },
                ],
            },
            // FIX: The 'gemini-2.5-flash-image-preview' model requires both IMAGE and TEXT response modalities
            // as per the provided coding guidelines.
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePartResponse = response.candidates[0].content.parts.find(part => part.inlineData);

        if (imagePartResponse && imagePartResponse.inlineData) {
            return `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
        }

        throw new Error("AI did not return a sketch.");
    } catch (error) {
        console.error("Error generating sketch:", error);
        throw new Error("Failed to generate product sketch.");
    }
};
