"use client";

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Upload,
  Rocket,
  X,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

// ───── Types ─────
interface FutureResult {
  scenario: string;
  positiveImagePrompt: string;
  positiveImageData: string;
  positiveNewsArticle: string;
  negativeImagePrompt: string;
  negativeImageData: string;
  negativeNewsArticle: string;
}

type StepStatus = "idle" | "active" | "done";

// ───── Components ─────

function StepIndicator({
  step,
  label,
  status,
}: {
  step: number;
  label: string;
  status: StepStatus;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-sm ${status === "done"
          ? "bg-emerald-500 text-white scale-110"
          : status === "active"
            ? "bg-sky-500 text-white animate-pulse scale-110"
            : "bg-slate-100 text-slate-400"
          }`}
      >
        {status === "done" ? <CheckCircle2 className="w-5 h-5" /> : step}
      </div>
      <span
        className={`text-sm font-bold transition-colors duration-300 ${status === "active"
          ? "text-sky-600"
          : status === "done"
            ? "text-emerald-600"
            : "text-slate-400"
          }`}
      >
        {label}
      </span>
    </div>
  );
}

function ResultCard({
  icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-3xl overflow-hidden transition-all duration-500 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 h-full flex flex-col">
      {/* Top accent line */}
      <div className={`h-1.5 w-full ${accentColor}`} />
      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor} bg-opacity-10`}
          >
            {icon}
          </div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className="text-slate-600 leading-relaxed flex-1">{children}</div>
      </div>
    </div>
  );
}

// ───── Main Page ─────
export default function FutureImpactPage() {
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FutureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0); // 0: idle, 1: forecasting, 2: parallel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.split(",")[1]);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStep(1);

    try {
      // Simulate step progression for UX
      const stepTimer = setTimeout(() => setStep(2), 4000);

      const res = await fetch("/api/future-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, imageBase64 }),
      });

      clearTimeout(stepTimer);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "서버 오류가 발생했습니다.");
      }

      const data: FutureResult = await res.json();
      setStep(3);
      setResult(data);

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-hidden pt-10 pb-20">
      {/* Ambient Background - Bright & Playful */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-sky-200/40 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-amber-100/30 rounded-full blur-[80px] animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-16">
        {/* ────── Header ────── */}
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4">
            우리의 아이디어가
            <br />
            <span className="bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">
              미래를 바꾼다면?
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            여러분이 만든 산출물의 설명과 사진을 넣어주세요.
            <br />
            AI가 10년 뒤의 <strong className="text-emerald-500">긍정적인 미래</strong>와 <strong className="text-red-500">부정적인 미래</strong>를 비교해서 보여드립니다.
          </p>
        </header>

        {/* ────── Input Section ────── */}
        <section className="mb-12 md:mb-20">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Text Input */}
              <div className="flex flex-col">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  📝 산출물 설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 폐플라스틱을 분쇄하여 3D 프린터로 뽑아내는 모듈형 보도블럭 시스템. 빗물이 잘 스며들도록 다공성 구조를 가짐."
                  rows={7}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/10 resize-none transition-all text-base leading-relaxed"
                />
              </div>

              {/* Image Upload */}
              <div className="flex flex-col">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  📷 산출물 사진 (선택)
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[200px] ${imagePreview
                    ? "border-sky-500/40 bg-sky-50"
                    : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50"
                    }`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="업로드한 사진"
                        className="max-h-[200px] rounded-xl object-contain shadow-md"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                          setImageBase64(null);
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-slate-400 group">
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-center">
                        클릭 또는 드래그하여
                        <br />
                        사진을 업로드하세요
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || isLoading}
                className={`group relative px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all duration-500 overflow-hidden ${!description.trim() || isLoading
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/20 hover:shadow-2xl hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI가 미래를 예측하고 있습니다...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 group-hover:animate-bounce" />
                    미래 예측 시작
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                {/* Shimmer effect */}
                {!isLoading && description.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ────── Loading State ────── */}
        {isLoading && (
          <section className="mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-inner shadow-slate-50">
              <h2 className="text-xl font-bold text-slate-800 mb-8 text-center">
                🔮 미래를 그리는 중...
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                <StepIndicator
                  step={1}
                  label="시나리오 생성"
                  status={step >= 2 ? "done" : step === 1 ? "active" : "idle"}
                />
                <div className="hidden md:block w-12 h-px bg-slate-200" />
                <StepIndicator
                  step={2}
                  label="긍정/부정 10년 뒤 모습 생성"
                  status={step >= 3 ? "done" : step === 2 ? "active" : "idle"}
                />
                <div className="hidden md:block w-12 h-px bg-slate-200" />
                <StepIndicator
                  step={3}
                  label="완료"
                  status={step >= 3 ? "done" : "idle"}
                />
              </div>
              {/* Fun loading animation */}
              <div className="flex justify-center mt-10">
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ────── Error State ────── */}
        {error && (
          <section className="mb-12 animate-in fade-in duration-500">
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 md:p-8 text-center">
              <p className="text-red-300 font-medium">⚠️ {error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-200 text-sm font-bold transition-colors"
              >
                다시 시도
              </button>
            </div>
          </section>
        )}

        {/* ────── Results ────── */}
        {result && (
          <section ref={resultRef} className="animate-in fade-in slide-in-from-bottom-10 duration-1000 space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
                🌟 10년 뒤의 미래 비교
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                AI가 예측한 2036년의 두 가지 가능성입니다
              </p>
            </div>

            {/* Scenario Card */}
            <ResultCard
              icon={<Sparkles className="w-5 h-5 text-amber-400" />}
              title="미래 시나리오 요약"
              accentColor="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <div className="prose prose-slate max-w-none [&_strong]:text-amber-700 [&_ul]:list-disc [&_li]:text-slate-600">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.scenario}
                </ReactMarkdown>
              </div>
            </ResultCard>

            {/* Two Columns Grid: Positive vs Negative */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">

              {/* === LEFT COLUMN: POSITIVE === */}
              <div className="flex flex-col gap-6">
                <ResultCard
                  icon={<Lightbulb className="w-5 h-5 text-emerald-400" />}
                  title="✨ 긍정적인 미래"
                  accentColor="bg-gradient-to-r from-emerald-400 to-teal-500"
                >
                  <div className="flex flex-col gap-6">
                    {/* Positive Image */}
                    {result.positiveImageData ? (
                      <div className="space-y-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.positiveImageData}
                          alt="긍정적인 미래 이미지"
                          className="w-full rounded-xl border border-white/10 shadow-lg object-contain bg-slate-50"
                        />
                        <details className="group">
                          <summary className="text-xs text-emerald-600 font-bold uppercase tracking-wider cursor-pointer hover:text-emerald-700 transition-colors">
                            사용된 프롬프트 보기 ▾
                          </summary>
                          <div className="prose prose-slate prose-xs mt-2 bg-emerald-50 rounded-lg p-3 border border-emerald-100 font-mono text-emerald-800 leading-relaxed max-h-32 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {result.positiveImagePrompt}
                            </ReactMarkdown>
                          </div>
                        </details>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <p className="text-xs text-amber-600 font-medium">⚠️ 이미지 생성에 실패했습니다.</p>
                      </div>
                    )}

                    {/* Positive Article */}
                    <div className="prose prose-slate max-w-none [&_h1]:text-2xl [&_h1]:text-emerald-900 [&_h1]:font-black [&_h1]:mt-0 [&_h2]:text-lg [&_h2]:text-emerald-700 [&_blockquote]:border-emerald-200 [&_blockquote]:bg-emerald-50 [&_blockquote]:rounded-xl [&_blockquote]:px-4 [&_blockquote]:py-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.positiveNewsArticle}
                      </ReactMarkdown>
                    </div>
                  </div>
                </ResultCard>
              </div>

              {/* === RIGHT COLUMN: NEGATIVE === */}
              <div className="flex flex-col gap-6">
                <ResultCard
                  icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                  title="⚠️ 부정적인 미래 (부작용)"
                  accentColor="bg-gradient-to-r from-orange-500 to-red-600"
                >
                  <div className="flex flex-col gap-6">
                    {/* Negative Image */}
                    {result.negativeImageData ? (
                      <div className="space-y-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.negativeImageData}
                          alt="부정적인 미래 이미지"
                          className="w-full rounded-xl border border-white/10 shadow-lg object-contain bg-slate-50"
                        />
                        <details className="group">
                          <summary className="text-xs text-red-600 font-bold uppercase tracking-wider cursor-pointer hover:text-red-700 transition-colors">
                            사용된 프롬프트 보기 ▾
                          </summary>
                          <div className="prose prose-slate prose-xs mt-2 bg-red-50 rounded-lg p-3 border border-red-100 font-mono text-red-800 leading-relaxed max-h-32 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {result.negativeImagePrompt}
                            </ReactMarkdown>
                          </div>
                        </details>
                      </div>
                    ) : (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <p className="text-xs text-amber-600 font-medium">⚠️ 이미지 생성에 실패했습니다.</p>
                      </div>
                    )}

                    {/* Negative Article */}
                    <div className="prose prose-slate max-w-none [&_h1]:text-2xl [&_h1]:text-red-900 [&_h1]:font-black [&_h1]:mt-0 [&_h2]:text-lg [&_h2]:text-red-700 [&_blockquote]:border-red-200 [&_blockquote]:bg-red-50 [&_blockquote]:rounded-xl [&_blockquote]:px-4 [&_blockquote]:py-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.negativeNewsArticle}
                      </ReactMarkdown>
                    </div>
                  </div>
                </ResultCard>
              </div>

            </div>

            {/* Reset */}
            <div className="flex justify-center pt-8 pb-12">
              <button
                onClick={() => {
                  setResult(null);
                  setStep(0);
                  setDescription("");
                  setImagePreview(null);
                  setImageBase64(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-500 hover:text-slate-700 font-medium transition-all duration-300"
              >
                🔄 새로운 아이디어 예측하기
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-12 text-slate-300 text-xs font-bold uppercase tracking-widest">
          Powered by LangGraph × Gemini
        </footer>
      </div>
    </div>
  );
}
