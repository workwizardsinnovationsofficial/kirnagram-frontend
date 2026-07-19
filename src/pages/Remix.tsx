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
import { useNotificationStore } from "@/store/notificationStore";
import { Download, Image as ImageIcon, Sparkles, Upload } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const REMIX_API_BASE = import.meta.env.VITE_REMIX_API_BASE || "https://api-r.kirnagram.com";

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
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [progressMessage, setProgressMessage] = useState<string>("Waiting to start remix...");
  const addNotification = useNotificationStore((state) => state.addNotification);
  const generateAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const sourceState = (location.state || null) as RemixSourceState | null;

  const sanitizePublicDescription = (text?: string) => {
    if (!text) return "";
    // Remove template tokens like {var} or {{var}}, bracketed hints like [uploaded photo],
    // and any parenthetical internal instructions. Collapse whitespace.
    return text
      .replace(/{{?\s*[^{}]+\s*}?}/g, "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    if (generating) {
      if (!confirmStopRemixing()) {
        return;
      }
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
    const rawDesc = prompt.prompt_description || prompt.description || "";
    const publicDesc = sanitizePublicDescription(rawDesc);
    return {
      style: prompt.style_name || "Prompt Style",
      description: publicDesc,
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

      setProgressMessage("Preparing remix generation...");

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

      setProgressMessage("Uploading assets and generating your remix...");
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
      const generatedRemixId = data.remix_id || null;
      setRemixId(generatedRemixId);

      // 🔥 REFRESH PROMPT DATA (IMPORTANT)
      const updatedPromptRes = await fetchWithFreshToken(
        `${REMIX_API_BASE}/remix/prompt/${promptId}`
      );
      if (updatedPromptRes.ok) {
        const updatedPrompt = await updatedPromptRes.json();
        setPrompt(updatedPrompt);
      }

      setProgressMessage("Remix generated successfully.");

      const notificationId = generatedRemixId || `remix-${Date.now()}`;
      addNotification({
        id: notificationId,
        user_id: "system",
        user_name: "Kirnagram",
        user_image: null,
        action: "remix_ready",
        description: "Your remix is ready. Tap to view it.",
        timestamp: new Date().toISOString(),
        read: false,
        remix_id: generatedRemixId || undefined,
      });

      toast({
        title: "Remix ready",
        description: "Your remix is generated and ready to use.",
        action: (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (generatedRemixId) navigate(`/remix-details/${generatedRemixId}`);
            }}
          >
            View
          </Button>
        ),
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

  const requiredVariables = useMemo(() => {
    return Array.isArray(prompt?.prompt_variables)
      ? prompt.prompt_variables.filter((item) => item.required)
      : [];
  }, [prompt]);

  const missingRequiredVariables = requiredVariables.filter((item) => {
    const key = (item?.key || "").trim();
    return key && !(variableValues[key] || "").trim();
  });

  const canProceedToStep3 = Boolean(uploadedFile) && missingRequiredVariables.length === 0;

  const handleNextStep = () => {
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!uploadedFile) {
        toast({
          title: "Upload required",
          description: "Please upload an image before continuing.",
          variant: "destructive",
        });
        return;
      }
      if (missingRequiredVariables.length > 0) {
        toast({
          title: "Complete all required fields",
          description: `Please fill: ${missingRequiredVariables.map((item) => item.key).join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Close inputs and start generation immediately.
      // This will cause the UI to show the loading view while `generating` is true.
      handleGenerate();
      return;
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((current) => (current === 2 ? 1 : 1));
      return;
    }
    handleBack();
  };

  const handleViewNotification = () => {
    if (remixId) {
      navigate(`/remix-details/${remixId}`);
    }
  };

  const handleGoToNotifications = () => {
    navigate("/notifications");
  };

  const handleBackToPrompt = () => {
    if (wizardStep === 1) {
      handleBack();
      return;
    }
    setWizardStep(1);
  };

  const handleResetWizard = () => {
    setWizardStep(1);
  };

  const renderPromptStep = () => (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-muted/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prompt</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">{promptInfo.style}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {promptInfo.description || "No description provided."}
        </p>
      </div>

      {promptInfo.image ? (
        <div className="rounded-3xl border border-border/70 overflow-hidden">
          <img src={promptInfo.image} alt="Reference" className="w-full h-64 object-cover rounded-xl" />
        </div>
      ) : null}

      <div className="pt-2">
        <Button onClick={() => setWizardStep(2)} className="w-full h-12">
          Continue to remix
        </Button>
      </div>
    </div>
  );

  const renderCustomizeStep = () => (
    <div className="space-y-5">
      <Card className="glass-card border border-border/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Upload your photo</p>
            <p className="font-semibold text-foreground">Choose one image</p>
          </div>
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {uploadedPreview ? (
          <div className="relative">
            <img src={uploadedPreview} alt="Uploaded" className="w-full h-64 object-cover rounded-xl" />
            <button
              onClick={() => {
                setUploadedFile(null);
                setUploadedPreview(null);
              }}
              className="absolute top-3 right-3 px-3 py-1 bg-background/90 rounded-full text-xs"
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

      {Array.isArray(prompt?.prompt_variables) && prompt.prompt_variables.length > 0 ? (
        <Card className="glass-card border border-border/60 p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Prompt variables</p>
          <div className="space-y-3">
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
        </Card>
      ) : null}
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-5">
      <Card className="glass-card border border-border/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Generation summary</p>
            <p className="font-semibold text-foreground">Confirm and start remixing</p>
          </div>
          <span className="text-xs text-muted-foreground">{ratio} aspect</span>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <span>Prompt style</span>
            <strong className="text-foreground">{promptInfo.style}</strong>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <span>Model</span>
            <strong className="text-foreground">{resolvedModel === "chatgpt" ? "ChatGPT" : "Gemini"}</strong>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <span>Burn cost</span>
            <strong className="text-foreground">{burnCost ?? "--"} credits</strong>
          </div>
          {uploadedPreview ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">
              Uploaded image preview available
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-rose-500/10 p-3 text-sm text-rose-600">
              No photo uploaded yet.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <p className="text-sm text-foreground">{progressMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {generating ? "Generating now..." : "Ready to start when you press generate."}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {generating ? (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                stopGeneration();
                toast({
                  title: "Remix cancelled",
                  description: "Generation was cancelled.",
                });
                setProgressMessage("Generation cancelled.");
              }}
              className="w-full"
            >
              Cancel Remix
            </Button>
            <Button onClick={handleGoToNotifications} className="w-full">
              Go to Notifications
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={!uploadedFile || generating}
            className="w-full h-12 bg-gradient-to-r from-secondary to-accent text-secondary-foreground font-semibold"
          >
            Generate Remix
          </Button>
        )}
      </div>

    </div>
  );

  const renderActiveStep = () => {
    if (wizardStep === 1) return renderPromptStep();
    return renderCustomizeStep();
  };

  const stepButtons = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="outline" onClick={handlePrevStep} className="w-full sm:w-auto">
        {wizardStep === 1 ? "Back" : "Previous"}
      </Button>
      <Button onClick={handleNextStep} className="w-full sm:w-auto">
        {wizardStep === 1 ? "Continue to remix" : "Generate remix"}
      </Button>
    </div>
  );

  const showOverviewImage = promptInfo.image || uploadedPreview;

  /**
   * Adds Kirnagram logo + website text at the bottom-left of the provided image URL.

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

  const stepLabels = [
    { label: "Prompt", step: 1 },
    { label: "Upload & generate", step: 2 },
  ];

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-5xl mx-auto pb-32 md:pb-8 space-y-6">
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remix Studio</p>
              <h1 className="text-2xl font-semibold text-foreground">Create your remix</h1>
            </div>
            <Button variant="ghost" onClick={handleBack}>
              ← Back
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {stepLabels.map((stepInfo) => (
              <button
                key={stepInfo.step}
                type="button"
                onClick={() => setWizardStep(stepInfo.step as 1 | 2)}
                className={`rounded-3xl border px-4 py-3 text-left transition ${
                  wizardStep === stepInfo.step
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/70"
                }`}
              >
                <span className="text-[10px] uppercase tracking-[0.24em]">
                  Step {stepInfo.step}
                </span>
                <p className="mt-1 text-sm font-semibold">{stepInfo.label}</p>
              </button>
            ))}
          </div>
        </div>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            {/* If generating, show focused loading view; otherwise show the active step */}
            {generating ? (
              <Card className="glass-card border border-border/60 p-8 flex items-center justify-center flex-col min-h-[320px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-transparent border-primary" />
                  <p className="text-lg font-semibold text-foreground">Kirnagram is remixing...</p>
                  <p className="text-sm text-muted-foreground">{progressMessage}</p>
                </div>
              </Card>
            ) : (
              <Card className="glass-card border border-border/60 p-4">
                {renderActiveStep()}
                <div className="mt-4">{stepButtons}</div>
              </Card>
            )}

            {outputUrl && (
              <Card className="glass-card border border-border/60 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Output</p>
                    <p className="font-semibold text-foreground">Your remix is ready</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <img
                  src={outputUrl}
                  alt="Remix output"
                  className="w-full max-h-[520px] object-contain rounded-3xl border border-border/70 bg-muted/50"
                  style={{ aspectRatio: ratio }}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button onClick={handleViewNotification} className="w-full">
                    View remix
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/create", { state: { imageUrl: outputUrl } })}
                    className="w-full"
                  >
                    Add to post
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/story/upload", { state: { imageUrl: outputUrl } })}
                    className="w-full"
                  >
                    Add to story
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Show the right summary/preview only when a remix output exists */}
          {outputUrl && (
            <aside className="space-y-4">
            <Card className="glass-card border border-border/60 p-4 space-y-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prompt summary</p>
                <div>
                  <p className="text-sm text-muted-foreground">Style</p>
                  <p className="font-semibold text-foreground">{promptInfo.style}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {promptInfo.description || "No description available."}
                  </p>
                </div>
                {tagsLabel ? (
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags?.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="glass-card border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Preview</p>
                <span className="text-xs text-muted-foreground">{ratio}</span>
              </div>
              <div className="mt-4 rounded-3xl border border-border/70 bg-muted/50 overflow-hidden">
                <img
                  src={uploadedPreview || promptInfo.image || "https://via.placeholder.com/320x480?text=No+preview"}
                  alt="Prompt preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            </Card>

            <Card className="glass-card border border-border/60 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Generation status</p>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4 text-sm text-foreground">
                <p>{generating ? "Generating now..." : "Ready to start when you press generate."}</p>
                <p className="mt-2 text-xs text-muted-foreground">{progressMessage}</p>
              </div>
            </Card>
            </aside>
          )}
        </div>
      </div>
      {prompt && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleNextStep}
              disabled={wizardStep === 2 ? !uploadedFile || generating : false}
              className="flex-1 h-12 bg-gradient-to-r from-secondary to-accent text-secondary-foreground font-semibold"
            >
              {wizardStep === 1 ? "Continue to remix" : generating ? "Generating..." : "Generate remix"}
            </Button>
            <span className="text-xs text-muted-foreground min-w-[72px] text-right">
              {burnCost ?? "--"} cr
            </span>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Remix;
