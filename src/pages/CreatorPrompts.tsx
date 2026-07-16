import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, Heart, MessageCircle, Eye, TrendingUp, ChevronRight, Search, Filter, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "https://api.kirnagram.com";

type Prompt = {
  _id: string;
  post_id?: string | null;
  unit_id?: string | null;
  style_name: string;
  prompt_description?: string;
  ai_model?: string;
  prompt_category?: string;
  tags?: string[];
  image_url: string;
  sample_image_url?: string;
  sample_image_urls?: string[];
  reference_correct_image_urls?: string[];
  status: "pending" | "approved" | "rejected" | "modified" | "modify" | "delete_requested" | "deleted";
  likes?: string[];
  comments?: Array<{ comment_id?: string; user_id?: string; username?: string; user_image?: string; text?: string; created_at?: string }>;
  views?: string[];
  remixes?: string[];
  reason?: string;
  created_at?: string;
};

const normalizePrompt = (raw: any): Prompt => {
  const sampleImageUrls = Array.isArray(raw?.sample_image_urls)
    ? raw.sample_image_urls
    : Array.isArray(raw?.sample_images)
      ? raw.sample_images
      : [];

  const referenceCorrectImageUrls = Array.isArray(raw?.reference_correct_image_urls)
    ? raw.reference_correct_image_urls
    : [];

  const comments = Array.isArray(raw?.comments)
    ? raw.comments.map((item: any) => ({
        comment_id: item?.comment_id || item?._id || `${Math.random()}`,
        user_id: item?.user_id,
        username: item?.username || item?.user_name || "User",
        user_image: item?.user_image,
        text: item?.text || item?.message || item?.comment || "",
        created_at: item?.created_at,
      }))
    : [];

  return {
    _id: raw?._id,
    post_id: raw?.post_id ?? null,
    unit_id: raw?.unit_id ?? null,
    style_name: raw?.style_name || "Untitled",
    prompt_description: raw?.prompt_description || "",
    ai_model: raw?.ai_model || "",
    prompt_category: raw?.prompt_category || "",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    image_url: raw?.image_url || "",
    sample_image_url: raw?.sample_image_url || "",
    sample_image_urls: sampleImageUrls,
    reference_correct_image_urls: referenceCorrectImageUrls,
    status: raw?.status || "pending",
    likes: Array.isArray(raw?.likes) ? raw.likes : [],
    comments,
    views: Array.isArray(raw?.views) ? raw.views : [],
    remixes: Array.isArray(raw?.remixes) ? raw.remixes : [],
    reason: raw?.reason,
    created_at: raw?.created_at,
  };
};

const getPromptImage = (prompt: Prompt) =>
  (Array.isArray(prompt.sample_image_urls) ? prompt.sample_image_urls[0] || "" : "") ||
  (Array.isArray(prompt.reference_correct_image_urls) ? prompt.reference_correct_image_urls[0] || "" : "") ||
  (prompt.sample_image_url || "") ||
  prompt.image_url;

const CreatorPrompts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "modified" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = auth.currentUser;
        if (!user) throw new Error("Not logged in");
        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE}/ai-creator/prompts/me?status=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch prompts");
        const data = await res.json();
        const mapped = Array.isArray(data) ? data.map(normalizePrompt) : [];
        setPrompts(mapped);
      } catch (e: any) {
        console.error("Error fetching prompts:", e);
        setError(e.message || "Failed to load prompts");
        toast({
          title: "Failed to load",
          description: e.message || "Unable to fetch prompts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, [toast]);

  const filteredPrompts = useMemo(() => {
    const byStatus =
      filter === "all"
        ? prompts
        : filter === "modified"
          ? prompts.filter((p) => p.status === "modified" || p.status === "modify")
          : prompts.filter((p) => p.status === filter);
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter((p) =>
      p.style_name?.toLowerCase().includes(q) ||
      p.unit_id?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [filter, prompts, search]);

  const activePromptCount = useMemo(
    () => prompts.filter((p) => {
      const status = String(p.status || "").toLowerCase();
      return status === "approved" || status === "delete_requested";
    }).length,
    [prompts]
  );

  const statsFor = (prompt: Prompt) => ({
    likes: Array.isArray(prompt.likes) ? prompt.likes.length : 0,
    comments: Array.isArray(prompt.comments) ? prompt.comments.length : 0,
    views: Array.isArray(prompt.views) ? prompt.views.length : 0,
    remixes: Array.isArray(prompt.remixes) ? prompt.remixes.length : 0,
  });

  const formatCount = (value: number) => {
    if (value < 1000) return `${value}`;
    if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  };

  useEffect(() => {
    const addView = async () => {
      if (!selectedPrompt) return;
      const user = auth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/ai-creator/prompts/${selectedPrompt._id}/view`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to add view");
        setSelectedPrompt((prev) => {
          if (!prev) return prev;
          const views = new Set(prev.views || []);
          views.add(user.uid);
          return { ...prev, views: Array.from(views) };
        });
        setPrompts((prev) =>
          prev.map((prompt) => {
            if (prompt._id !== selectedPrompt._id) return prompt;
            const views = new Set(prompt.views || []);
            views.add(user.uid);
            return { ...prompt, views: Array.from(views) };
          })
        );
      } catch (e) {
        // Keep UI silent for view failures.
      }
    };

    addView();
  }, [selectedPrompt]);

  const loadPromptDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      setCommentsLoading(true);
      setPostComments([]);
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/ai-creator/prompts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch prompt details");
      const data = await res.json();
      const prompt = normalizePrompt(data);
      setSelectedPrompt(prompt);

      // If this prompt has a linked post, fetch comments from posts API.
      if (prompt.post_id) {
        try {
          const postRes = await fetch(`${API_BASE}/posts/comments/${prompt.post_id}`);
          if (postRes.ok) {
            const postData = await postRes.json();
            setPostComments(Array.isArray(postData.comments) ? postData.comments : []);
          } else {
            setPostComments([]);
          }
        } catch {
          setPostComments([]);
        }
      } else {
        setPostComments([]);
      }
    } catch (e: any) {
      toast({
        title: "Failed to open prompt",
        description: e.message || "Could not load prompt details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
      setCommentsLoading(false);
    }
  };

  const requestPromptDelete = async (promptId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();
      const reason = window.prompt("Reason for deleting this prompt post (optional)") || "";
      const url = reason.trim()
        ? `${API_BASE}/ai-creator/prompts/${promptId}/request-delete?reason=${encodeURIComponent(reason.trim())}`
        : `${API_BASE}/ai-creator/prompts/${promptId}/request-delete`;

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.detail || "Failed to submit delete request");

      setPrompts((prev) =>
        prev.map((item) => (item._id === promptId ? { ...item, status: "delete_requested" } : item))
      );
      setSelectedPrompt((prev) => (prev && prev._id === promptId ? { ...prev, status: "delete_requested" } : prev));

      toast({
        title: "Delete request submitted",
        description: "Admin approval is required before the prompt post is removed.",
      });
    } catch (e: any) {
      toast({
        title: "Delete request failed",
        description: e.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (selectedPrompt) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden">
          <button 
            onClick={() => setSelectedPrompt(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Prompts
          </button>

          {/* Prompt Header */}
          <div className="relative rounded-2xl overflow-hidden mb-6 bg-muted/50">
            {getPromptImage(selectedPrompt) && !brokenImages[selectedPrompt._id] ? (
              <img
                src={getPromptImage(selectedPrompt)}
                alt={selectedPrompt.style_name}
                className="w-full h-48 md:h-64 object-cover"
                onError={() => setBrokenImages((prev) => ({ ...prev, [selectedPrompt._id]: true }))}
              />
            ) : (
              <div className="w-full h-48 md:h-64 flex items-center justify-center text-sm text-muted-foreground">
                No image available
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold">{selectedPrompt.style_name}</h1>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full mt-1 inline-block",
                    selectedPrompt.status === "approved" 
                      ? "bg-green-500/20 text-green-500" 
                      : selectedPrompt.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : selectedPrompt.status === "delete_requested"
                          ? "bg-red-500/20 text-red-400"
                          : selectedPrompt.status === "deleted"
                            ? "bg-zinc-500/20 text-zinc-400"
                        : selectedPrompt.status === "modify" || selectedPrompt.status === "modified"
                          ? "bg-orange-500/20 text-orange-500"
                          : "bg-red-500/20 text-red-500"
                  )}>
                    {selectedPrompt.status === "modify" ? "modified" : selectedPrompt.status}
                  </span>
                  {selectedPrompt.unit_id && (
                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedPrompt.unit_id}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">AI Model</p>
                  <p className="text-sm font-semibold capitalize">{selectedPrompt.ai_model || "-"}</p>
                </div>
              </div>
              {selectedPrompt.status === "approved" && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                  onClick={() => requestPromptDelete(selectedPrompt._id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Request Delete
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {([
              { icon: Heart, value: statsFor(selectedPrompt).likes, label: "Likes", color: "text-pink-500" },
              { icon: MessageCircle, value: statsFor(selectedPrompt).comments, label: "Comments", color: "text-primary" },
              { icon: Eye, value: statsFor(selectedPrompt).views, label: "Views", color: "text-secondary" },
              { icon: TrendingUp, value: statsFor(selectedPrompt).remixes, label: "Remixes", color: "text-green-500" },
            ]).map((stat, i) => (
              <div key={i} className="p-3 bg-card border border-border rounded-xl text-center">
                <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
                <p className="font-bold text-lg">{formatCount(stat.value)}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {selectedPrompt.reason && (
            <div className="bg-muted/40 border border-border rounded-2xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">Reason: {selectedPrompt.reason}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              Recent Comments
            </h2>
            <div className="space-y-3">
              {commentsLoading ? (
                <p className="text-xs text-muted-foreground">Loading comments...</p>
              ) : (selectedPrompt.post_id ?
                (postComments.length > 0 ? (
                  postComments.map((comment) => (
                    <div key={comment.comment_id || `${comment.user_id}-${comment.created_at || "x"}`} className="flex gap-3 p-3 bg-muted/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                        {(comment.username || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{comment.username || "User"}</p>
                        <p className="text-sm text-muted-foreground">{comment.text || "No text"}</p>
                        {comment.created_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                ))
                :
                ((selectedPrompt.comments || []).length > 0 ? (
                  (selectedPrompt.comments || []).map((comment) => (
                    <div key={comment.comment_id || `${comment.user_id}-${comment.created_at || "x"}`} className="flex gap-3 p-3 bg-muted/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                        {(comment.username || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{comment.username || "User"}</p>
                        <p className="text-sm text-muted-foreground">{comment.text || "No text"}</p>
                        {comment.created_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                ))
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-display font-bold">My Prompts</h1>
            <p className="text-sm text-muted-foreground">{activePromptCount} active prompts</p>
          </div>
          <Link 
            to="/ai-creator/add-prompt"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            + Add New
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm"
            />
          </div>
          <button className="p-2.5 bg-muted/50 border border-border rounded-xl">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {["all", "approved", "pending", "modified", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors",
                filter === f 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Prompts List */}
        <div className="space-y-3">
          {loading && (
            <div className="text-sm text-muted-foreground">Loading prompts...</div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && filteredPrompts.map((prompt) => (
            <div 
              key={prompt._id}
              onClick={() => loadPromptDetail(prompt._id)}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all cursor-pointer group"
            >
              {getPromptImage(prompt) && !brokenImages[prompt._id] ? (
                <img
                  src={getPromptImage(prompt)}
                  alt={prompt.style_name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover bg-muted"
                  onError={() => setBrokenImages((prev) => ({ ...prev, [prompt._id]: true }))}
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  No image
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{prompt.style_name}</h3>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    prompt.status === "approved" 
                      ? "bg-green-500/20 text-green-500" 
                      : prompt.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : prompt.status === "delete_requested"
                          ? "bg-red-500/20 text-red-400"
                          : prompt.status === "deleted"
                            ? "bg-zinc-500/20 text-zinc-400"
                        : prompt.status === "modify" || prompt.status === "modified"
                          ? "bg-orange-500/20 text-orange-500"
                          : "bg-red-500/20 text-red-500"
                  )}>
                    {prompt.status === "modify" ? "modified" : prompt.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {Array.isArray(prompt.likes) ? prompt.likes.length : 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {Array.isArray(prompt.comments) ? prompt.comments.length : 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {Array.isArray(prompt.remixes) ? prompt.remixes.length : 0}
                  </span>
                </div>
                {prompt.unit_id && (
                  <p className="text-[10px] text-muted-foreground mt-1">ID: {prompt.unit_id}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          ))}
        </div>
        {loadingDetail && <div className="text-xs text-muted-foreground mt-2">Opening prompt details...</div>}
      </div>
    </MainLayout>
  );
};

export default CreatorPrompts;
