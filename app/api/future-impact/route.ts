import { NextRequest, NextResponse } from "next/server";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300;

// 1. 상태(State) 정의
const AgentState = Annotation.Root({
  studentInput: Annotation<string>,
  uploadedImageBase64: Annotation<string>, // 학생이 업로드한 원본 사진 (base64)
  scenarioFull: Annotation<string>,
  
  positiveImagePrompt: Annotation<string>,
  positiveImageBase64: Annotation<string>,
  positiveDoc: Annotation<string>,

  negativeImagePrompt: Annotation<string>,
  negativeImageBase64: Annotation<string>,
  negativeDoc: Annotation<string>,
});

type AgentStateType = typeof AgentState.State;

// 2. LLM & GenAI 초기화
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

function getLLM() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    apiKey: API_KEY,
  });
}

function getGenAI() {
  return new GoogleGenAI({ apiKey: API_KEY });
}

// 3. 노드 함수 정의

async function nodeForecast(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log("🚀 [1단계] 미래 시나리오 생성 중...");
  const llm = getLLM();
  
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: "text", text: `다음은 학생이 제출한 프로젝트 결과물에 대한 내용입니다:\n${state.studentInput}\n\n이 프로젝트가 10년 뒤 사회에 적용되었을 때, 긍정적인 방향으로 발전했을 때와 부정적인 부작용이 생겼을 때의 두 가지 시나리오를 간략히 요약해주세요.\n1. 긍정적 시나리오 (1-2문장)\n2. 부정적 시나리오 (1-2문장)` }];

  if (state.uploadedImageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${state.uploadedImageBase64}` },
    });
  }

  const response = await llm.invoke([
    { role: "system", content: "당신은 기술 및 사회 변화를 예측하는 세계 최고의 미래학자입니다. 10년 뒤(2036년)의 기술적 파급 효과를 긍정과 부정 양면으로 현실적으로 예측하세요." },
    { role: "user", content: userContent }
  ]);

  return { scenarioFull: response.content as string };
}

// === 긍정 이미지 생성 ===
async function nodeGenPositiveImage(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log("🎨 [2단계-병렬] 긍정적 미래 이미지 생성 중...");
  const llm = getLLM();

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ 
    type: "text", 
    text: `전체 시나리오:\n${state.scenarioFull}\n\n위 시나리오 중 가장 긍정적이고 희망찬 10년 뒤의 모습을 보여주는 사진 프롬프트를 작성하세요. ${state.uploadedImageBase64 ? "첨부된 사진 속의 물체가 10년 뒤에 어떻게 더 발전되고 세련되게 변했을지를 중점적으로 묘사하세요." : ""} 다음 요소를 반드시 포함하여 영어 콤마(,)로 구분된 단어 나열식으로 작성하세요.\n- Subject: (긍정적이고 희망찬 미래 피사체)\n- Background: (2036년의 밝은 미래 배경 및 환경)\n- Lighting: (밝고 화사한 조명 효과)\n- Style: Photorealistic, highly detailed, utopian, bright, clean` 
  }];

  if (state.uploadedImageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${state.uploadedImageBase64}` },
    });
  }

  const promptResponse = await llm.invoke([
    { role: "system", content: "당신은 텍스트를 고품질 이미지 생성 프롬프트로 변환하는 프롬프트 엔지니어입니다." },
    { role: "user", content: userContent }
  ]);
  const imagePromptText = promptResponse.content as string;

  let generatedImageBase64 = "";
  try {
    const ai = getGenAI();
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [{ text: imagePromptText }];
    if (state.uploadedImageBase64) {
      parts.unshift({
        inlineData: { data: state.uploadedImageBase64, mimeType: "image/jpeg" },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts }],
      config: { responseModalities: ["IMAGE"] },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      const imagenResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: imagePromptText,
        config: { numberOfImages: 1 },
      });
      if (imagenResponse.generatedImages?.[0]?.image?.imageBytes) {
        generatedImageBase64 = `data:image/png;base64,${imagenResponse.generatedImages[0].image.imageBytes}`;
      }
    }
  } catch (err) {
    console.error("긍정 이미지 생성 실패:", err);
  }

  return { positiveImagePrompt: imagePromptText, positiveImageBase64: generatedImageBase64 };
}

// === 부정 이미지 생성 ===
async function nodeGenNegativeImage(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log("🎨 [2단계-병렬] 부정적 미래 이미지 생성 중...");
  const llm = getLLM();

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ 
    type: "text", 
    text: `전체 시나리오:\n${state.scenarioFull}\n\n위 시나리오 중 가장 부정적이고 어두운 10년 뒤의 부작용을 보여주는 사진 프롬프트를 작성하세요. ${state.uploadedImageBase64 ? "첨부된 사진 속의 물체가 10년 뒤 잘못 사용되거나 버려져 환경과 사회에 문제를 일으키는 모습을 중점적으로 묘사하세요." : ""} 다음 요소를 반드시 포함하여 영어 콤마(,)로 구분된 단어 나열식으로 작성하세요.\n- Subject: (부정적인 결과를 나타내는 피사체)\n- Background: (2036년의 어둡고 문제적인 미래 환경)\n- Lighting: (어둡거나 위압적인 조명 효과)\n- Style: Photorealistic, highly detailed, dystopian, gloomy, polluted` 
  }];

  if (state.uploadedImageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${state.uploadedImageBase64}` },
    });
  }

  const promptResponse = await llm.invoke([
    { role: "system", content: "당신은 텍스트를 고품질 이미지 생성 프롬프트로 변환하는 프롬프트 엔지니어입니다." },
    { role: "user", content: userContent }
  ]);
  const imagePromptText = promptResponse.content as string;

  let generatedImageBase64 = "";
  try {
    const ai = getGenAI();
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [{ text: imagePromptText }];
    if (state.uploadedImageBase64) {
      parts.unshift({
        inlineData: { data: state.uploadedImageBase64, mimeType: "image/jpeg" },
      });
    }

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [{ role: "user", parts }],
        config: { responseModalities: ["IMAGE"] },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      const imagenResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: imagePromptText,
        config: { numberOfImages: 1 },
      });
      if (imagenResponse.generatedImages?.[0]?.image?.imageBytes) {
        generatedImageBase64 = `data:image/png;base64,${imagenResponse.generatedImages[0].image.imageBytes}`;
      }
    }
  } catch (err) {
    console.error("부정 이미지 생성 실패:", err);
  }

  return { negativeImagePrompt: imagePromptText, negativeImageBase64: generatedImageBase64 };
}

// === 긍정 뉴스 기사 생성 ===
async function nodeGenPositiveDocument(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log("📰 [2단계-병렬] 긍정적 미래 뉴스 기사 작성 중...");
  const llm = getLLM();
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "당신은 2036년의 저명한 기술/사회 전문 기자입니다. 중학생 독자들이 쉽고 흥미롭게 이해할 수 있도록 직관적이고 친근한 어조로 작성하세요. 내용이 너무 길지 않아야 하며, 최대 '2~3단락(문단)' 이내로 짧게 작성하세요. 반드시 Markdown 형식을 사용하세요 (# 헤드라인, ## 소제목, 인용구 > 가능).",
    ],
    [
      "user",
      `학생 아이디어 원본: {studentInput}
10년 뒤 전체 시나리오: {scenarioFull}

위 내용을 바탕으로 2036년에 이 아이디어가 사회를 눈부시게 발전시켰다는 '긍정적인 뉴스 기사'를 쉬운 말로, 짧게 작성해주세요.
중학생들이 단번에 이해할 수 있게 직관적으로 써주세요.
- # (기사 제목): 시선을 끄는 희망찬 헤드라인
- 본문: 매우 짧고 간결한 2-3문단`,
    ],
  ]);
  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    studentInput: state.studentInput,
    scenarioFull: state.scenarioFull,
  });
  return { positiveDoc: response.content as string };
}

// === 부정 뉴스 기사 생성 ===
async function nodeGenNegativeDocument(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log("📰 [2단계-병렬] 부정적 미래 뉴스 기사 작성 중...");
  const llm = getLLM();
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "당신은 2036년의 저명한 기술/사회 전문 기자입니다. 중학생 독자들이 쉽고 흥미롭게 이해할 수 있도록 직관적이고 명확한 어조로 작성하세요. 내용이 너무 길지 않아야 하며, 최대 '2~3단락(문단)' 이내로 짧게 작성하세요. 반드시 Markdown 형식을 사용하세요 (# 헤드라인, ## 소제목, 인용구 > 가능).",
    ],
    [
      "user",
      `학생 아이디어 원본: {studentInput}
10년 뒤 전체 시나리오: {scenarioFull}

위 내용을 바탕으로 이 아이디어가 예상치 못한 부작용을 일으켜 사회에 심각한 문제를 가져왔다는 '경고성(부정적인) 뉴스 기사'를 쉬운 말로, 짧게 작성해주세요.
중학생들이 부작용의 핵심을 단번에 이해할 수 있게 직관적으로 써주세요.
- # (기사 제목): 경각심을 주는 어두운 헤드라인
- 본문: 매우 짧고 간결한 2-3문단`,
    ],
  ]);
  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    studentInput: state.studentInput,
    scenarioFull: state.scenarioFull,
  });
  return { negativeDoc: response.content as string };
}

// 4. LangGraph 그래프 조립
function buildGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("forecast", nodeForecast)
    .addNode("pos_image_agent", nodeGenPositiveImage)
    .addNode("neg_image_agent", nodeGenNegativeImage)
    .addNode("pos_doc_agent", nodeGenPositiveDocument)
    .addNode("neg_doc_agent", nodeGenNegativeDocument)
    // 엣지 연결
    .addEdge(START, "forecast")
    // 병렬 처리: forecast 완료 후 네 개의 에이전트가 동시에 실행
    .addEdge("forecast", "pos_image_agent")
    .addEdge("forecast", "neg_image_agent")
    .addEdge("forecast", "pos_doc_agent")
    .addEdge("forecast", "neg_doc_agent")
    // 모든 병렬 작업이 끝나면 종료
    .addEdge("pos_image_agent", END)
    .addEdge("neg_image_agent", END)
    .addEdge("pos_doc_agent", END)
    .addEdge("neg_doc_agent", END);

  return workflow.compile();
}

// 5. API Route Handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, imageBase64: uploadedImage } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "산출물 설명을 입력해주세요." },
        { status: 400 }
      );
    }

    let studentInput = description;
    if (uploadedImage) {
      studentInput += "\n\n[학생이 제출한 산출물 사진이 함께 첨부되었습니다.]";
    }

    const graph = buildGraph();

    const result = await graph.invoke({
      studentInput,
      uploadedImageBase64: uploadedImage || "",
      scenarioFull: "",
      positiveImagePrompt: "",
      positiveImageBase64: "",
      positiveDoc: "",
      negativeImagePrompt: "",
      negativeImageBase64: "",
      negativeDoc: "",
    });

    return NextResponse.json({
      scenario: result.scenarioFull,
      positiveImagePrompt: result.positiveImagePrompt,
      positiveImageData: result.positiveImageBase64,
      positiveNewsArticle: result.positiveDoc,
      negativeImagePrompt: result.negativeImagePrompt,
      negativeImageData: result.negativeImageBase64,
      negativeNewsArticle: result.negativeDoc,
    });
  } catch (error: unknown) {
    console.error("LangGraph Error:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
