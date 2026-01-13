import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { LessonContent, QuizQuestion, Topic } from "../types";

// Helper to get AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_TEXT = "gemini-3-flash-preview";
const MODEL_IMAGE = "gemini-2.5-flash-image";

/**
 * Generates a list of basic topics for a subject suitable for a beginner.
 */
export const generateTopics = async (subjectName: string): Promise<Topic[]> => {
  const ai = getAI();
  // Updated prompt to explicitly include Master/PhD levels
  const prompt = `Tôi muốn nghiên cứu môn ${subjectName} một cách toàn diện.
  Phạm vi: Từ người mất gốc hoàn toàn đến trình độ Chuyên gia/Hàn lâm (bao gồm cả kiến thức Đại học, Thạc sĩ, Tiến sĩ và các chuyên ngành hẹp).
  
  Hãy đóng vai một giáo sư đầu ngành và liệt kê 5 chủ đề/khái niệm nền tảng quan trọng nhất (Key Concepts) để bắt đầu hành trình này.
  Các chủ đề này cần là "xương sống" để sau này có thể phát triển lên kiến thức cao cấp.
  
  Trả về định dạng JSON: array of objects with 'title' and 'description'.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text).map((item: any, index: number) => ({
      ...item,
      id: `topic-${index}`,
    }));
  } catch (error) {
    console.error("Error generating topics:", error);
    return [];
  }
};

/**
 * Searches for topics based on a user query/custom subject.
 */
export const searchTopics = async (query: string): Promise<Topic[]> => {
  const ai = getAI();
  // Updated prompt to handle specialized and abstract research topics
  const prompt = `Tôi muốn học sâu về chủ đề "${query}".
  Lưu ý: Đây có thể là một chủ đề học thuật cao (Sau đại học), một lý thuyết trừu tượng, hoặc một công nghệ chuyên sâu.
  
  Hãy chia nhỏ chủ đề này thành 5 bước đi (Concepts) từ nhập môn đến chuyên sâu để tôi có thể nắm bắt bản chất của nó.
  Trả về định dạng JSON: array of objects with 'title' and 'description'.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text).map((item: any, index: number) => ({
      ...item,
      id: `topic-search-${index}`,
    }));
  } catch (error) {
    console.error("Error searching topics:", error);
    return [];
  }
};

/**
 * Generates the lesson content (explanation + image prompt).
 */
export const generateLessonContent = async (
  subject: string,
  topic: string
): Promise<LessonContent | null> => {
  const ai = getAI();
  // Updated prompt: Genius Tutor persona handling PhD level concepts like a fairy tale
  const prompt = `Bạn là Kha, một giáo sư thiên tài vui tính. Bạn có khả năng giải thích những kiến thức phức tạp nhất (Vật lý lượng tử, Triết học hiện sinh, Toán cao cấp, Y khoa chuyên sâu,...) thành những câu chuyện đơn giản cho trẻ 3 tuổi.
  
  Nhiệm vụ: Giải thích khái niệm "${topic}" trong môn/lĩnh vực "${subject}".
  
  YÊU CẦU ĐẶC BIỆT:
  1. Giả định kiến thức này có thể ở trình độ Thạc sĩ/Tiến sĩ, nhưng bạn KHÔNG ĐƯỢC dùng jargon (thuật ngữ) khô khan.
  2. Hãy dùng phép ẩn dụ (Analogy) cực kỳ đời thường (ví dụ: so sánh lỗ đen với cái máy hút bụi, so sánh tế bào với nhà máy lego).
  3. Giọng văn: Hài hước, gần gũi, khích lệ.
  4. Tạo Image Prompt để vẽ minh họa khái niệm trừu tượng này thành hình ảnh hoạt hình dễ thương.
  5. Tóm tắt 3 ý cốt lõi.

  Trả về JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            explanation: { type: Type.STRING },
            analogy: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["title", "explanation", "analogy", "imagePrompt", "keyPoints"],
        },
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Error generating lesson:", error);
    return null;
  }
};

/**
 * Generates an image based on the prompt.
 */
export const generateImage = async (imagePrompt: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [{ text: imagePrompt + " .High quality, cute 3D cartoon style, bright colors, educational illustration, simple and clear." }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

/**
 * Generates a summary image for the lesson key points with bilingual text support.
 */
export const generateSummaryImage = async (subject: string, topic: string, keyPoints: string[]): Promise<string | null> => {
  const ai = getAI();
  const promptText = `I need an image prompt to generate a cute, educational summary poster (infographic style) for:
  Subject: ${subject}
  Topic: ${topic}
  Key Points:
  ${keyPoints.map(p => `- ${p}`).join('\n')}

  Write a detailed image generation prompt (in English) describing a visual composition that integrates metaphors, icons, or characters for these points. 
  IMPORTANT: The prompt MUST instruct that any text, labels, or headings appearing in the image MUST be Bilingual (English and Vietnamese).
  The style should be "Cute 3D Cartoon".
  Output ONLY the raw prompt string.`;

  try {
    const response = await ai.models.generateContent({
       model: MODEL_TEXT,
       contents: promptText,
    });
    const prompt = response.text;
    if (!prompt) return null;
    
    // Call existing generateImage with appended instruction for bilingual text
    return await generateImage(prompt + " . Educational infographic poster, cute 3D style, high definition, clear composition, visual summary. IMPORTANT: Text must be Bilingual (English and Vietnamese).");
  } catch (error) {
    console.error("Error generating summary image:", error);
    return null;
  }
};

/**
 * Generates a quiz for the topic.
 */
export const generateQuiz = async (
  subject: string,
  topic: string,
  excludeQuestions: string[] = []
): Promise<QuizQuestion[]> => {
  const ai = getAI();
  
  // Context to avoid duplicates
  const excludeText = excludeQuestions.length > 0 
    ? `\nQUAN TRỌNG: Hãy tạo các câu hỏi MỚI HOÀN TOÀN, KHÔNG ĐƯỢC TRÙNG với các câu hỏi sau đây: ${JSON.stringify(excludeQuestions.slice(-10))}` 
    : "";

  const prompt = `Tạo 3 câu hỏi trắc nghiệm kiểm tra kiến thức về "${topic}" trong chủ đề "${subject}".
  LƯU Ý: Đây có thể là kiến thức nâng cao/chuyên sâu. Tuy nhiên, hãy đặt câu hỏi sao cho người vừa đọc lời giải thích đơn giản ở trên có thể trả lời được.
  Giải thích đáp án phải mở rộng thêm một chút kiến thức thực tế.
  ${excludeText}
  Trả về JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"],
          },
        },
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};
