import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Plus, Trash2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:8000";
const MAX_SAMPLE_IMAGES = 3;
const CATEGORY_OPTIONS = [
  "Ghibli",
  "Art",
  "Sketch",
  "AI",
  "Anime",
  "Fantasy",
  "Devotional",
  "Cinematic",
  "Portrait",
  "Fashion",
  "Neon",
  "Cyberpunk",
  "Vintage",
  "Minimal",
  "3D Render",
  "Watercolor",
  "Pixel Art",
  "Comic",
  "Realistic",
  "Abstract",
] as const;

type VariableInputType = "text" | "dropdown";
type AspectRatio = "9:16" | "16:9" | "1:1";
type AiModel = "chatgpt" | "gemini" | "";
type ReferenceStrategy = "none" | "correct-vs-wrong";

type VariableDraft = {
  id: string;
  key: string;
  label: string;
  inputType: VariableInputType;
  optionsCsv: string;
  placeholder: string;
};

const newVariable = (): VariableDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  key: "",
  label: "",
  inputType: "text",
  optionsCsv: "",
  placeholder: "",
});

const extractTemplateKeys = (template: string): string[] => {
  const keys = new Set<string>();
  const matches = template.matchAll(/\{\s*([^{}]+?)\s*\}/g);
  for (const match of matches) {
    const key = normalizeKey((match[1] || "").trim());
    if (key) keys.add(key);
  }
  return Array.from(keys);
};

const generateSafeDescription = (template: string) => {
  if (!template) return "";
  // Remove template tokens like {var} and {{var}}, bracketed hints like [uploaded photo],
  // and parenthetical instructions. Collapse whitespace and trim.
  let s = template
    .replace(/\{\{?[^{}]+\}??\}/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  if (s.length > 300) s = `${s.slice(0, 297)}...`;
  return s;
};

const prettifyLabel = (key: string) =>
  key
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeKey = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

const buildTemplateTokenPattern = (key: string): RegExp => {
  const normalized = normalizeKey(key);
  const parts = normalized.split("_").filter(Boolean).map(escapeRegex);
  if (!parts.length) return /$^/;
  const tokenBody = parts.join("[\\s_]+");
  return new RegExp(`\\{\\s*${tokenBody}\\s*\\}`, "gi");
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AddNewPrompt = () => {
  const { toast } = useToast();

  const [styleName, setStyleName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const [variables, setVariables] = useState<VariableDraft[]>([]);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [aiModel, setAiModel] = useState<AiModel>("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [tags, setTags] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [samplePreviews, setSamplePreviews] = useState<string[]>([]);

  const [referenceStrategy, setReferenceStrategy] = useState<ReferenceStrategy>("none");
  const [referenceCorrectFiles, setReferenceCorrectFiles] = useState<File[]>([]);
  const [referenceWrongFiles, setReferenceWrongFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const templateKeys = useMemo(() => extractTemplateKeys(promptTemplate), [promptTemplate]);

  useEffect(() => {
    setVariables((prev) => {
      const existingByKey = new Map(prev.map((entry) => [entry.key, entry]));
      const next = templateKeys.map((key) => {
        const existing = existingByKey.get(key);
        return (
          existing || {
            ...newVariable(),
            key,
            label: prettifyLabel(key),
          }
        );
      });

      const unchanged =
        prev.length === next.length &&
        prev.every((entry, index) => {
          const candidate = next[index];
          return (
            candidate &&
            candidate.id === entry.id &&
            candidate.key === entry.key &&
            candidate.label === entry.label &&
            candidate.inputType === entry.inputType &&
            candidate.optionsCsv === entry.optionsCsv &&
            candidate.placeholder === entry.placeholder
          );
        });

      return unchanged ? prev : next;
    });
  }, [templateKeys]);

  const addVariableToPrompt = () => {
    const used = new Set(templateKeys);
    let key = "new";
    let count = 2;
    while (used.has(key)) {
      key = `new_${count}`;
      count += 1;
    }

    setPromptTemplate((prev) => {
      const trimmedRight = prev.replace(/\s+$/, "");
      return trimmedRight ? `${trimmedRight} {${key}}` : `{${key}}`;
    });
  };

  const onCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(await fileToDataUrl(file));
  };

  const onSampleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_SAMPLE_IMAGES);
    setSampleFiles(files);
    setSamplePreviews(await Promise.all(files.map((file) => fileToDataUrl(file))));
  };

  const onReferenceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "correct" | "wrong"
  ) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_SAMPLE_IMAGES);
    if (target === "correct") {
      setReferenceCorrectFiles(files);
      return;
    }
    setReferenceWrongFiles(files);
  };

  const updateVariable = (id: string, changes: Partial<VariableDraft>) => {
    setVariables((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
  };

  const renameVariableInPrompt = (id: string, nextRawKey: string) => {
    const nextKey = normalizeKey(nextRawKey);
    const target = variables.find((entry) => entry.id === id);
    if (!target) return;

    if (!target.key) {
      return;
    }

    const currentTokenPattern = buildTemplateTokenPattern(target.key);
    setPromptTemplate((prev) => prev.replace(currentTokenPattern, nextKey ? `{${nextKey}}` : ""));
  };

  const removeVariable = (id: string) => {
    const target = variables.find((entry) => entry.id === id);
    if (!target?.key) return;

    const tokenPattern = buildTemplateTokenPattern(target.key);
    setPromptTemplate((prev) => prev.replace(tokenPattern, ""));
  };

  const validateAndBuildVariables = () => {
    const normalized = variables
      .map((entry) => {
        const key = normalizeKey(entry.key);
        const options = entry.optionsCsv
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean);

        return {
          key,
          label: entry.label.trim() || key,
          input_type: entry.inputType,
          options,
          placeholder: entry.placeholder.trim(),
          default_value: "",
          required: true,
        };
      })
      .filter((entry) => entry.key);

    const normalizedTemplateKeys = templateKeys.map((key) => normalizeKey(key)).filter(Boolean);
    const missingTemplateVariable = normalizedTemplateKeys.find(
      (key) => !normalized.some((item) => item.key === key)
    );
    if (missingTemplateVariable) {
      throw new Error(`Configure variable: ${missingTemplateVariable}`);
    }

    const invalidDropdown = normalized.find(
      (item) => item.input_type === "dropdown" && item.options.length === 0
    );
    if (invalidDropdown) {
      throw new Error(`Dropdown variable needs options: ${invalidDropdown.key}`);
    }

    return normalized;
  };

  const handleSubmit = async () => {
    try {
      if (!styleName.trim()) throw new Error("Prompt title is required");
      if (!promptTemplate.trim()) throw new Error("Prompt template is required");
      let finalCategory = category;
      if (category === "__custom__") {
        if (!customCategory.trim()) throw new Error("Category is required");
        finalCategory = customCategory.trim();
      } else {
        if (!category.trim()) throw new Error("Category is required");
      }
      if (!aiModel) throw new Error("Select AI model");
      if (!coverFile) throw new Error("Main sample image is required");

      const user = auth.currentUser;
      if (!user) throw new Error("Please login first");

      const normalizedVariables = validateAndBuildVariables();
      const token = await user.getIdToken();

      setSubmitting(true);
      const formData = new FormData();
      formData.append("style_name", styleName.trim());
      const finalPromptDescription = promptDescription.trim() || generateSafeDescription(promptTemplate.trim()) || promptTemplate.trim();
      formData.append("prompt_description", finalPromptDescription);
      formData.append("prompt_template", promptTemplate.trim());
      formData.append("prompt_variables_json", JSON.stringify(normalizedVariables));
      formData.append("prompt_category", finalCategory);
      formData.append("tags", tags.trim());
      formData.append("aspect_ratio", aspectRatio);
      formData.append("ai_model", aiModel);
      formData.append("image", coverFile);
      formData.append(
        "require_reference_image",
        referenceStrategy === "correct-vs-wrong" ? "true" : "false"
      );

      sampleFiles.forEach((file) => formData.append("sample_images", file));
      if (referenceStrategy === "correct-vs-wrong") {
        referenceCorrectFiles.forEach((file) => formData.append("reference_correct_images", file));
        referenceWrongFiles.forEach((file) => formData.append("reference_wrong_images", file));
      }

      const response = await fetch(`${API_BASE}/ai-creator/prompts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Submit failed");
      }

      setSubmitted(true);
      toast({
        title: "Submitted",
        description: "Prompt sent to admin for review.",
      });
    } catch (error) {
      toast({
        title: "Cannot submit",
        description: error instanceof Error ? error.message : "Submission failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-display font-bold">Prompt Submitted</h1>
            <p className="text-sm text-muted-foreground">
              Your prompt is now in review. You will get a notification after admin action.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/ai-creator/prompts"
                className="px-4 py-2 rounded-xl border border-border bg-muted/50 hover:bg-muted"
              >
                My Prompts
              </Link>
              <Link
                to="/ai-creator"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto px-3 md:px-4 pb-24 md:pb-10 space-y-5">
        <div className="flex items-start md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <Link to="/ai-creator" className="p-2 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AI Creator Studio</p>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Add New Prompt</h1>
              <p className="text-sm text-muted-foreground">Create a premium prompt package for review</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="font-semibold text-primary">Prompt Setup</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Title</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={styleName}
                  onChange={(event) => setStyleName(event.target.value)}
                  placeholder="Style name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Template (use {"{variable}"})</label>
                <textarea
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={promptTemplate}
                  onChange={(event) => setPromptTemplate(event.target.value)}
                  placeholder="A cinematic portrait of {gender} in {city}..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Description (public)</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={promptDescription}
                  onChange={(event) => setPromptDescription(event.target.value)}
                  placeholder="Short, user-facing description shown to users (avoid internal instructions)."
                />
                <p className="text-xs text-muted-foreground">If left empty, a safe description will be auto-generated from the template.</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Variables (text or dropdown)</p>
                  <button
                    type="button"
                    onClick={addVariableToPrompt}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-muted"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {variables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Variables are auto-detected from prompt tokens like {"{name}"}.</p>
                ) : (
                  <div className="space-y-2">
                    {variables.map((entry) => (
                      <div key={entry.id} className="space-y-2 p-3 rounded-lg border border-border bg-background">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            value={entry.key}
                            onChange={(event) => renameVariableInPrompt(entry.id, event.target.value)}
                            placeholder="variable_key"
                            className="px-3 py-2 rounded-md border border-border text-sm"
                          />
                          <input
                            value={entry.label}
                            onChange={(event) => updateVariable(entry.id, { label: event.target.value })}
                            placeholder="Label"
                            className="px-3 py-2 rounded-md border border-border text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={entry.inputType}
                            onChange={(event) => updateVariable(entry.id, { inputType: event.target.value as VariableInputType })}
                            className="px-3 py-2 rounded-md border border-border text-sm"
                          >
                            <option value="text">Text Enter</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                          {entry.inputType === "dropdown" ? (
                            <input
                              value={entry.optionsCsv}
                              onChange={(event) => updateVariable(entry.id, { optionsCsv: event.target.value })}
                              placeholder="option1,option2"
                              className="px-3 py-2 rounded-md border border-border text-sm"
                            />
                          ) : (
                            <input
                              value={entry.placeholder}
                              onChange={(event) => updateVariable(entry.id, { placeholder: event.target.value })}
                              placeholder="placeholder"
                              className="px-3 py-2 rounded-md border border-border text-sm"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => removeVariable(entry.id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-red-300 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Note: Prompt description is auto-generated from your Prompt Template.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="font-semibold text-primary">Media and Settings</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["9:16", "16:9", "1:1"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAspectRatio(value)}
                      className={`px-3 py-2 rounded-xl border text-xs ${
                        aspectRatio === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sample Image (main)</label>
                {coverPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={coverPreview} alt="cover" className="w-full h-56 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 text-xs rounded-md bg-background/85 border border-border"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                    <span className="text-sm text-muted-foreground">Upload sample image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onCoverUpload} />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">More Sample Images (up to 3)</label>
                  <label className="text-xs px-2 py-1 rounded-md border border-border bg-muted/40 cursor-pointer hover:bg-muted/60">
                    Upload
                    <input type="file" accept="image/*" multiple onChange={onSampleUpload} className="hidden" />
                  </label>
                </div>
                {samplePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {samplePreviews.map((preview, index) => (
                      <img key={index} src={preview} alt={`sample-${index}`} className="w-full h-24 object-cover rounded-lg border border-border" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No extra sample images uploaded yet.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full h-12 rounded-xl border-primary/35 bg-muted/40 focus:ring-primary/30 data-[state=open]:border-primary data-[state=open]:bg-primary/5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-primary/35 bg-card">
                    {CATEGORY_OPTIONS.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                        className="rounded-md focus:bg-primary/15 focus:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                      >
                        {item}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Other (type your own)</SelectItem>
                  </SelectContent>
                </Select>
                {category === "__custom__" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-2"
                    placeholder="Enter custom category"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">AI Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "ChatGPT", value: "chatgpt" as const },
                    { label: "Gemini", value: "gemini" as const },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAiModel(option.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm ${
                        aiModel === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Image Strategy</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { value: "none" as const, label: "No reference strategy" },
                    { value: "correct-vs-wrong" as const, label: "Correct and Wrong reference images" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setReferenceStrategy(item.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm text-left ${
                        referenceStrategy === item.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {referenceStrategy === "correct-vs-wrong" && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3 bg-muted/20 space-y-2">
                      <p className="text-xs font-medium text-emerald-500">Correct references (up to 3)</p>
                      <label className="inline-flex text-xs px-2 py-1 rounded-md border border-border bg-muted/40 cursor-pointer hover:bg-muted/60">
                        Upload
                        <input type="file" multiple accept="image/*" onChange={(event) => onReferenceUpload(event, "correct")} className="hidden" />
                      </label>
                      <p className="text-[11px] text-muted-foreground">Selected: {referenceCorrectFiles.length}</p>
                      {referenceCorrectFiles.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {referenceCorrectFiles.map((file, idx) => (
                            <img
                              key={idx}
                              src={URL.createObjectURL(file)}
                              alt={`Correct reference ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded border border-emerald-400"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-border p-3 bg-muted/20 space-y-2">
                      <p className="text-xs font-medium text-red-500">Wrong references (up to 3)</p>
                      <label className="inline-flex text-xs px-2 py-1 rounded-md border border-border bg-muted/40 cursor-pointer hover:bg-muted/60">
                        Upload
                        <input type="file" multiple accept="image/*" onChange={(event) => onReferenceUpload(event, "wrong")} className="hidden" />
                      </label>
                      <p className="text-[11px] text-muted-foreground">Selected: {referenceWrongFiles.length}</p>
                      {referenceWrongFiles.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {referenceWrongFiles.map((file, idx) => (
                            <img
                              key={idx}
                              src={URL.createObjectURL(file)}
                              alt={`Wrong reference ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded border border-red-400"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          <aside className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
              <h3 className="font-semibold text-foreground">Publishing Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium truncate max-w-[160px] text-right">{styleName || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Template variables</span>
                  <span className="font-medium">{templateKeys.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI model</span>
                  <span className="font-medium uppercase">{aiModel || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ratio</span>
                  <span className="font-medium">{aspectRatio}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium truncate max-w-[160px] text-right">{category === "__custom__" ? (customCategory || "-") : (category || "-")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Main image</span>
                  <span className="font-medium">{coverFile ? "Added" : "Missing"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Post Preview</p>
                {coverPreview ? (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                    <img src={coverPreview} alt="post-preview" className="w-full h-44 object-cover" />
                    <div className="px-3 py-2 border-t border-border bg-background/80">
                      <p className="text-xs font-medium truncate">{styleName || "Untitled Prompt"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{category || "No category selected"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 h-44 flex items-center justify-center text-xs text-muted-foreground">
                    Upload main sample image to see preview
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Prompt"}
              </button>
              <p className="text-xs text-muted-foreground">Your prompt goes to admin review before public remix listing.</p>
            </div>
          </aside>
        </div>

      </div>
    </MainLayout>
  );
};

export default AddNewPrompt;
