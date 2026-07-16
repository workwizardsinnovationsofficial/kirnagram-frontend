import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { auth } from "@/firebase";
import { Download, Image as ImageIcon, Sparkles, Upload } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const REMIX_API_BASE = import.meta.env.VITE_REMIX_API_BASE || "http://127.0.0.1:8001";

const normalizeVariableKey = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();

type PromptDetail = {
  _id: string;
  unit_id?: string | null;
  style_name?: string;
  prompt_description?: string;
  prompt_template?: string;
  prompt_variables?: PromptVariable[];
  description?: string;
  prompt?: string;
  prompt_text?: string;
  ai_model?: "chatgpt" | "gemini" | "both";
  image_url?: string;
  sample_image_url?: string;
  sample_image_urls?: string[];
  reference_correct_image_urls?: string[];
  reference_wrong_image_urls?: string[];
  tags?: string[];
  aspect_ratio?: "9:16" | "16:9" | "1:1";
};

type PromptVariable = {
  key: string;
  label?: string;
  input_type?: "text" | "dropdown";
  options?: string[];
  placeholder?: string;
  default_value?: string;
  required?: boolean;
};

type RemixSourceState = {
  returnTo?: string;
  fromPostId?: string;
  returnScrollY?: number;
};

const renderTemplatePrompt = (
  template: string,
  values: Record<string, string>
) => {
  const normalizedValues: Record<string, string> = {};
  Object.entries(values).forEach(([key, value]) => {
    const normalizedKey = normalizeVariableKey(key);
    if (!normalizedKey) return;
    normalizedValues[normalizedKey] = value;
  });

  const resolveValue = (rawKey: string) => {
    const directValue = values[rawKey];
    if (typeof directValue === "string") return directValue.trim();

    const normalizedKey = normalizeVariableKey(rawKey);
    if (!normalizedKey) return "";

    const normalizedDirect = values[normalizedKey];
    if (typeof normalizedDirect === "string") return normalizedDirect.trim();

    return (normalizedValues[normalizedKey] || "").trim();
  };

  // Support legacy {{var}} and current {var} token formats.
  const withDoubleBrace = template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) =>
    resolveValue(key)
  );
  return withDoubleBrace.replace(/\{\s*([^{}]+?)\s*\}/g, (_, key: string) =>
    resolveValue(key)
  );
};

const Remix = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { promptId } = useParams();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [ratio, setRatio] = useState("9:16");
  const [burnCost, setBurnCost] = useState<number | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [remixId, setRemixId] = useState<string | null>(null);
  const [resolvedModel, setResolvedModel] = useState<"chatgpt" | "gemini">("chatgpt");
  const [downloading, setDownloading] = useState(false);
  const [reviewRating, setReviewRating] = useState<"good" | "bad" | "">("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImprovement, setReviewImprovement] = useState("");
  const [reviewData, setReviewData] = useState<{ review_rating?: string; review_comment?: string; review_improvement?: string } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const generateAbortRef = useRef<AbortController | null>(null);
  const sourceState = (location.state || null) as RemixSourceState | null;

  const stopGeneration = () => {
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
    }
  };

  const confirmStopRemixing = () => {
    if (!generating) return true;
    return window.confirm("Remix generation is in progress. Do you want to stop remixing and go back?");
  };

  const handleBack = () => {
    if (!confirmStopRemixing()) {
      return;
    }

    if (generating) {
      stopGeneration();
      toast({
        title: "Remix stopped",
        description: "Generation was cancelled.",
      });
    }

    if (sourceState?.returnTo) {
      navigate(sourceState.returnTo, {
        replace: true,
        state: {
          fromRemix: true,
          focusPostId: sourceState.fromPostId,
          restoreScrollY: sourceState.returnScrollY,
        },
      });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  useEffect(() => {
    if (!generating) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [generating]);

  useEffect(() => {
    if (!generating) return;

    const guardState = { remixGuard: true, ts: Date.now() };
    window.history.pushState(guardState, "", window.location.href);

    const handlePopState = () => {
      const shouldStop = window.confirm(
        "Remix generation is in progress. Stop remixing and go back?"
      );

      if (!shouldStop) {
        window.history.pushState({ remixGuard: true, ts: Date.now() }, "", window.location.href);
        return;
      }

      stopGeneration();
      toast({
        title: "Remix stopped",
        description: "Generation was cancelled.",
      });

      if (sourceState?.returnTo) {
        navigate(sourceState.returnTo, {
          replace: true,
          state: {
            fromRemix: true,
            focusPostId: sourceState.fromPostId,
            restoreScrollY: sourceState.returnScrollY,
          },
        });
        return;
      }

      navigate("/home", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [generating, navigate, sourceState]);

  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, []);

  const fetchWithFreshToken = async (url: string, init?: RequestInit) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Not logged in");
    }

    let token = await user.getIdToken();
    let response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 401) {
      return response;
    }

    token = await user.getIdToken(true);
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  };

  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchWithFreshToken(`${REMIX_API_BASE}/remix/prompt/${promptId}`);
        
        // Handle specific HTTP status codes
        if (res.status === 403) {
          throw new Error("This remix is private");
        }
        if (res.status === 404) {
          throw new Error("Remix not found");
        }
        if (res.status === 500) {
          throw new Error("Server error, please try again");
        }
        if (!res.ok) throw new Error("Failed to load prompt");
        
        const data = await res.json();
        setPrompt(data);
        const aiModel = (data.ai_model || "chatgpt").toLowerCase();
        const resolved = aiModel === "gemini" || aiModel === "both" ? "gemini" : "chatgpt";
        setResolvedModel(resolved);
        if (data.aspect_ratio === "16:9" || data.aspect_ratio === "1:1" || data.aspect_ratio === "9:16") {
          setRatio(data.aspect_ratio);
        }
        setBurnCost(typeof data.burn_credits === "number" ? data.burn_credits : Number(data.burn_credits ?? 3));

        const promptVariables = Array.isArray(data.prompt_variables) ? data.prompt_variables : [];
        const initialValues: Record<string, string> = {};
        promptVariables.forEach((item: PromptVariable) => {
          const key = (item?.key || "").trim();
          if (!key) return;
          if (item.default_value) {
            initialValues[key] = item.default_value;
            return;
          }
          if (item.input_type === "dropdown" && Array.isArray(item.options) && item.options.length > 0) {
            initialValues[key] = item.options[0];
            return;
          }
          initialValues[key] = "";
        });
        setVariableValues(initialValues);
      } catch (error) {
        toast({
          title: "Remix",
          description: error instanceof Error ? error.message : "Failed to load prompt",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPrompt();
  }, [promptId]);

  const promptInfo = useMemo(() => {
    const orderedImages: string[] = [];

    const addImage = (value?: string) => {
      const candidate = (value || "").trim();
      if (!candidate) return;
      if (!orderedImages.includes(candidate)) orderedImages.push(candidate);
    };

    // Main sample image should always be prioritized first.
    addImage(prompt?.image_url);
    addImage(prompt?.sample_image_url);

    if (Array.isArray(prompt?.sample_image_urls)) {
      prompt.sample_image_urls.forEach((url) => addImage(url));
    }

    if (Array.isArray(prompt?.reference_correct_image_urls)) {
      prompt.reference_correct_image_urls.forEach((url) => addImage(url));
    }

    if (!prompt) return { style: "", description: "", image: "" };
    return {
      style: prompt.style_name || "Prompt Style",
      description:
        prompt.prompt_description ||
        prompt.description ||
        prompt.prompt ||
        prompt.prompt_text ||
        "",
      image: orderedImages[0] || "",
    };
  }, [prompt]);

  const tagsLabel = useMemo(() => {
    if (!prompt?.tags?.length) return "";
    return prompt.tags.join(", ");
  }, [prompt]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = () => setUploadedPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!uploadedFile || !promptId) return;
    try {
      setGenerating(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();

      const promptVariables = Array.isArray(prompt?.prompt_variables) ? prompt.prompt_variables : [];
      const missingRequired = promptVariables.filter((item) => {
        const key = (item?.key || "").trim();
        if (!key || !item.required) return false;
        return !(variableValues[key] || "").trim();
      });

      if (missingRequired.length > 0) {
        throw new Error(`Please fill required variables: ${missingRequired.map((item) => item.key).join(", ")}`);
      }

      let promptText = "";
      if (prompt?.prompt_template?.trim()) {
        promptText = renderTemplatePrompt(prompt.prompt_template, variableValues).trim();
      }

      if (!promptText) {
        promptText = [
          promptInfo.style ? `${promptInfo.style}` : "",
          promptInfo.description ? `. ${promptInfo.description}` : "",
        ].join("").trim();
      }

      const formData = new FormData();
      formData.append("prompt_id", promptId);
      formData.append("ratio", ratio);
      formData.append("model", resolvedModel);
      formData.append("prompt_text", promptText);
      formData.append("variable_values_json", JSON.stringify(variableValues));
      formData.append("image", uploadedFile);

      const abortController = new AbortController();
      generateAbortRef.current = abortController;

      const res = await fetch(`${REMIX_API_BASE}/remix/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
        body: formData,
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to generate remix");
      }

      const data = await res.json();
      if (!data?.success || !data?.image_url) {
        throw new Error(data?.error || data?.detail || "Failed to generate remix");
      }

      try {
        const watermarked = await addWatermarkToImage(data.image_url);
        setOutputUrl(watermarked);
      } catch {
        setOutputUrl(data.image_url);
      }
      setRemixId(data.remix_id || null);

      // 🔥 REFRESH PROMPT DATA (IMPORTANT)
      const updatedPromptRes = await fetchWithFreshToken(
        `${REMIX_API_BASE}/remix/prompt/${promptId}`
      );
      if (updatedPromptRes.ok) {
        const updatedPrompt = await updatedPromptRes.json();
        setPrompt(updatedPrompt);
      }

      toast({
        title: "Remix ready",
        description: "Your remix is generated and ready to use.",
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      toast({
        title: "Remix failed",
        description: error instanceof Error ? error.message : "Generation failed",
        variant: "destructive",
      });
    } finally {
      generateAbortRef.current = null;
      setGenerating(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!remixId) {
      toast({
        title: "Unable to submit review",
        description: "Please generate a remix first.",
        variant: "destructive",
      });
      return;
    }

    if (!reviewRating) {
      toast({
        title: "Select a rating",
        description: "Please choose whether the remix was good or bad.",
        variant: "destructive",
      });
      return;
    }

    if (reviewRating === "bad" && !reviewImprovement.trim()) {
      toast({
        title: "Add improvement feedback",
        description: "Please tell us what can be improved.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReviewSubmitting(true);
      const formData = new URLSearchParams();
      formData.append("rating", reviewRating);
      formData.append("comment", reviewComment.trim());
      formData.append("improvement", reviewImprovement.trim());

      const res = await fetchWithFreshToken(
        `${REMIX_API_BASE}/remix/${remixId}/review`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to submit review");
      }

      const data = await res.json();
      setReviewData(data);
      toast({
        title: "Review sent",
        description: "Thanks for your feedback.",
      });
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Could not submit review.",
        variant: "destructive",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  /**
   * Adds Kirnagram logo + website text at the bottom-left of the provided image URL.
   * - Tries to fetch the image as a Blob and draw to a canvas (avoids taint where possible).
   * - Looks for a logo at `/kirnagram-logo.png` in the public folder; if missing, only text will be drawn.
   * - Returns a data URL (png) of the watermarked image.
   */
  async function addWatermarkToImage(src: string): Promise<string> {
    const loadImage = (urlOrBlob: string | Blob) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        if (typeof urlOrBlob === "string") {
          img.crossOrigin = "anonymous";
          img.src = urlOrBlob;
        } else {
          img.src = URL.createObjectURL(urlOrBlob);
        }
      });

    // fetch main image as blob to improve chance of clean canvas draw
    const imgResp = await fetch(src);
    if (!imgResp.ok) throw new Error("Failed to fetch image for watermarking");
    const imgBlob = await imgResp.blob();
    const img = await loadImage(imgBlob);

    // create canvas scaled by devicePixelRatio for crisper output
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * dpr);
    canvas.height = Math.round(img.height * dpr);
    canvas.style.width = `${img.width}px`;
    canvas.style.height = `${img.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.scale(dpr, dpr);

    // draw original image
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const padding = Math.max(12, Math.round(img.width * 0.02));
    const maxLogoWidth = Math.round(img.width * 0.12);
    let logoDrawn = false;

    // try to load logo from public folder; skip if missing
    try {
      const logo = await loadImage("/kirnagram-logo.png");
      const logoRatio = logo.width / logo.height;
      let logoW = maxLogoWidth;
      let logoH = Math.round(logoW / logoRatio);
      if (logoH > img.height * 0.18) {
        logoH = Math.round(img.height * 0.18);
        logoW = Math.round(logoH * logoRatio);
      }
      const logoX = padding; // bottom-left corner
      const logoY = img.height - logoH - padding;

      ctx.globalAlpha = 0.98;
      ctx.drawImage(logo, logoX, logoY, logoW, logoH);
      ctx.globalAlpha = 1;
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }

    // draw website text to the right of logo (or at padding if no logo)
    const text = "www.kirnagram.com";
    const fontSize = Math.max(14, Math.min(32, Math.round(img.width * 0.035)));
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textBaseline = "alphabetic";

    const textX = logoDrawn ? padding + Math.round(maxLogoWidth) + Math.round(padding * 0.5) : padding;
    const textY = img.height - padding; // baseline at bottom padding

    // subtle shadow for contrast
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(text, textX + 1, textY + 1);

    // white, semi-opaque text
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(text, textX, textY);

    return canvas.toDataURL("image/png");
  }

  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">
          Loading remix...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-24 md:pb-8 space-y-6">
        <div className="flex flex-col gap-2 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remix Studio</p>
          <div className="w-full flex justify-start">
            <Button variant="ghost" onClick={handleBack}>
              ← Back
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Card className="glass-card border border-border/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Original Style</p>
                  <p className="font-semibold text-foreground">{promptInfo.style}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  {resolvedModel === "chatgpt" ? "ChatGPT" : "Gemini"}
                </span>
              </div>
              {prompt?.unit_id && (
                <p className="text-xs text-muted-foreground">Prompt ID: {prompt.unit_id}</p>
              )}
              {tagsLabel && (
                <p className="text-xs text-muted-foreground">Tags: {tagsLabel}</p>
              )}
              <div className="w-full flex items-center justify-center min-h-[220px] bg-gradient-to-br from-muted/60 to-background rounded-xl border border-border/60 shadow-lg overflow-hidden">
                {promptInfo.image ? (
                  <img
                    src={promptInfo.image}
                    alt="Prompt sample"
                    className="max-w-full max-h-72 object-contain rounded-xl transition-transform duration-200 hover:scale-105 shadow-md"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-56 text-muted-foreground">
                    <span className="text-3xl mb-2">🖼️</span>
                    <span className="text-sm">No sample image</span>
                  </div>
                )}
              </div>

              {/* Show correct reference images if present */}
              {Array.isArray(prompt?.reference_correct_image_urls) && prompt.reference_correct_image_urls.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-emerald-500 mb-1">Correct Reference Images</div>
                  <div className="flex flex-wrap gap-2">
                    {prompt.reference_correct_image_urls.map((url, idx) => (
                      <img
                        key={url + idx}
                        src={url}
                        alt={`Correct reference ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border border-emerald-400 bg-background"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Show wrong reference images if present */}
              {Array.isArray(prompt?.reference_wrong_image_urls) && prompt.reference_wrong_image_urls.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-red-500 mb-1">Wrong Reference Images</div>
                  <div className="flex flex-wrap gap-2">
                    {prompt.reference_wrong_image_urls.map((url, idx) => (
                      <img
                        key={url + idx}
                        src={url}
                        alt={`Wrong reference ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border border-red-400 bg-background"
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="glass-card border border-border/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Image</p>
                  <p className="font-semibold text-foreground">Upload a photo</p>
                </div>
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              {uploadedPreview ? (
                <div className="relative">
                  <img
                    src={uploadedPreview}
                    alt="Uploaded"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setUploadedPreview(null);
                    }}
                    className="absolute top-3 right-3 px-3 py-1 bg-background/80 rounded-full text-xs"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Tap to upload</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG or JPG up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="glass-card border border-border/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Generation Settings</p>
                  <p className="font-semibold text-foreground">Auto model + locked ratio</p>
                </div>
                <span className="text-xs text-muted-foreground">Auto model</span>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aspect Ratio</p>
                  <p className="text-sm text-muted-foreground">Auto from approved prompt</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 bg-primary/10 text-primary">
                  {ratio}
                </span>
              </div>

              {Array.isArray(prompt?.prompt_variables) && prompt.prompt_variables.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prompt Variables</p>
                  <div className="space-y-2">
                    {prompt.prompt_variables.map((item) => {
                      const key = (item?.key || "").trim();
                      if (!key) return null;
                      const label = item.label || key;
                      const value = variableValues[key] ?? "";

                      if (item.input_type === "dropdown") {
                        const options = Array.isArray(item.options) ? item.options : [];
                        return (
                          <div key={key} className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              {label}
                              {item.required ? " *" : ""}
                            </label>
                            <Select
                              value={value}
                              onValueChange={(nextValue) =>
                                setVariableValues((prev) => ({ ...prev, [key]: nextValue }))
                              }
                            >
                              <SelectTrigger className="w-full h-11 rounded-xl border-border bg-card/90 text-foreground focus:ring-primary/40 focus:ring-offset-0">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border bg-card text-foreground">
                                {options.length === 0 ? (
                                  <SelectItem value="__no_option__" disabled>
                                    No options
                                  </SelectItem>
                                ) : (
                                  options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {label}
                            {item.required ? " *" : ""}
                          </label>
                          <input
                            type="text"
                            value={value}
                            placeholder={item.placeholder || `Enter ${label}`}
                            onChange={(event) =>
                              setVariableValues((prev) => ({ ...prev, [key]: event.target.value }))
                            }
                            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Credits burn</span>
                <span className="text-sm font-semibold text-foreground">
                  {burnCost ?? "--"} credits
                </span>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!uploadedFile || generating}
                className="w-full h-11 bg-gradient-to-r from-secondary to-accent text-secondary-foreground font-semibold"
              >
                {generating ? "Generating..." : "Generate Remix"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Credits are burned when generation starts. Ratio is locked by prompt settings.
              </p>
            </Card>

            {outputUrl && (
              <Card className="glass-card border border-border/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Output</p>
                    <p className="font-semibold text-foreground">Your remix is ready</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <img
                  src={outputUrl}
                  alt="Remix output"
                  className="w-full max-h-[500px] object-contain bg-black rounded-xl border border-border/60"
                  style={{ aspectRatio: ratio }}
                />
                <div className="space-y-4">
                  {reviewData ? (
                    <Card className="rounded-xl border border-border/70 bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${reviewData.review_rating === "good" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>
                          {reviewData.review_rating === "good" ? "Good" : "Bad"}
                        </span>
                        <span className="text-xs text-muted-foreground">Review submitted</span>
                      </div>
                      {reviewData.review_comment ? (
                        <p className="text-sm text-foreground">Feedback: {reviewData.review_comment}</p>
                      ) : null}
                      {reviewData.review_improvement ? (
                        <p className="text-sm text-foreground">Improvement: {reviewData.review_improvement}</p>
                      ) : null}
                    </Card>
                  ) : (
                    <Card className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">How was this remix?</p>
                        <p className="text-xs text-muted-foreground">Choose good or bad and add details.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewRating("good")}
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${reviewRating === "good" ? "border-emerald-400 bg-emerald-500/10 text-emerald-700" : "border-border bg-background text-foreground hover:border-foreground"}`}
                        >
                          Good
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewRating("bad")}
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${reviewRating === "bad" ? "border-rose-400 bg-rose-500/10 text-rose-700" : "border-border bg-background text-foreground hover:border-foreground"}`}
                        >
                          Bad
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Comment</label>
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="What did you like or dislike?"
                          className="w-full min-h-[100px] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
                        />
                      </div>
                      {reviewRating === "bad" && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">What can be improved?</label>
                          <textarea
                            value={reviewImprovement}
                            onChange={(event) => setReviewImprovement(event.target.value)}
                            placeholder="Tell us what should be better"
                            className="w-full min-h-[100px] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <Button
                        onClick={handleSubmitReview}
                        disabled={reviewSubmitting}
                        className="w-full"
                      >
                        {reviewSubmitting ? "Sending review..." : "Send review"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Your review helps improve future generations and creator quality.
                      </p>
                    </Card>
                  )}
                </div>
                <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      if (!remixId) {
                        alert("Invalid remix ID");
                        setDownloading(false);
                        return;
                      }

                      const user = auth.currentUser;
                      if (!user) {
                        alert("Please login");
                        setDownloading(false);
                        return;
                      }

                      const token = await user.getIdToken();

                      const response = await fetch(
                        `${import.meta.env.VITE_API_BASE}/remix/download/${remixId}`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      if (!response.ok) {
                        throw new Error("Download failed");
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);

                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `kirnagram-remix-${remixId}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      window.URL.revokeObjectURL(url);

                    } catch (error) {
                      alert("Failed to download image.");
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  {downloading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-primary rounded-full mr-2"></span>
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {downloading ? "Downloading..." : "Download"}
                </Button>
                <Button
                  onClick={() => navigate("/create", { state: { imageUrl: outputUrl } })}
                  className="w-full"
                >
                  Add to Post
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/story/upload", { state: { imageUrl: outputUrl } })}
                  className="w-full"
                >
                  Add to Story
                </Button>
                </div>
                </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Remix;
