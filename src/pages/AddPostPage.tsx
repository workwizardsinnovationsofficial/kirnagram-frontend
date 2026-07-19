import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import CropModal from "@/components/crop/CropModal";
import { cn } from "@/lib/utils";
import { auth } from "@/firebase";
import { getAuthToken } from "@/lib/auth-utils";
import { ArrowLeft, ArrowRight, Crop, ImagePlus, Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveUploadRatio, type CropRatioOption } from "@/lib/cropImage";

const API_BASE = "http://localhost:8000";

const AddPostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isCropEnabled, setIsCropEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [draftZoom, setDraftZoom] = useState(1);
  const [draftOffsetX, setDraftOffsetX] = useState(0);
  const [draftOffsetY, setDraftOffsetY] = useState(0);
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [mediaRatio, setMediaRatio] = useState<string>("");
  const [selectedRatio, setSelectedRatio] = useState<CropRatioOption>("4:5");
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const pinchRef = useRef({ distance: 0, zoom: 1 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [previewBaseScale, setPreviewBaseScale] = useState(1);
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  const imageAspect = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return 4 / 5;
    return imageSize.width / imageSize.height;
  }, [imageSize.width, imageSize.height]);

  const cropAspectRatio = useMemo(() => {
    switch (selectedRatio) {
      case "4:5":
        return "4 / 5";
      case "1:1":
        return "1 / 1";
      case "16:9":
        return "16 / 9";
      case "9:16":
        return "9 / 16";
      default:
        return "auto";
    }
  }, [selectedRatio]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const imageUrl = (location.state as any)?.imageUrl as string | undefined;
    if (!imageUrl || prefillLoaded) return;

    const loadFromUrl = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        let response: Response | null = null;
        const proxyRes = await fetch(
          `${API_BASE}/posts/image-proxy?url=${encodeURIComponent(imageUrl)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (proxyRes.ok) {
          response = proxyRes;
        } else {
          try {
            response = await fetch(imageUrl);
          } catch {
            response = null;
          }
        }
        if (!response || !response.ok) return;

        const blob = await response.blob();
        const file = new File([blob], "remix.jpg", { type: blob.type || "image/jpeg" });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setSelectedFile(file);
        setPreviewUrl(url);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setDraftZoom(1);
        setDraftOffsetX(0);
        setDraftOffsetY(0);
        setIsCropEnabled(false);
        setIsCropOpen(false);
        setPrefillLoaded(true);
        // Detect image ratio after load
        const img = new window.Image();
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            setMediaRatio(`${img.naturalWidth}:${img.naturalHeight}`);
          }
        };
        img.src = url;
      } catch {
        setPrefillLoaded(true);
      }
    };
    loadFromUrl();
  }, [location.state, prefillLoaded, previewUrl]);

  useEffect(() => {
    if (!isCropOpen) return;
    setDraftZoom(zoom);
    setDraftOffsetX(offsetX);
    setDraftOffsetY(offsetY);
  }, [isCropOpen, zoom, offsetX, offsetY]);

  useEffect(() => {
    if (!previewUrl) return;
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    if (!cropContainerRef.current || !imageSize.width || !imageSize.height) return;
    const container = cropContainerRef.current;
    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const nextBase = Math.max(rect.width / imageSize.width, rect.height / imageSize.height);
      setBaseScale(nextBase);
      setDraftOffsetX((prev) => {
        const { x } = clampOffsets(prev, draftOffsetY, rect.width, rect.height, nextBase, draftZoom);
        return x;
      });
      setDraftOffsetY((prev) => {
        const { y } = clampOffsets(draftOffsetX, prev, rect.width, rect.height, nextBase, draftZoom);
        return y;
      });
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [imageSize, draftZoom, draftOffsetX, draftOffsetY]);

  useEffect(() => {
    if (!previewContainerRef.current || !imageSize.width || !imageSize.height) return;
    const container = previewContainerRef.current;
    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const nextBase = Math.max(rect.width / imageSize.width, rect.height / imageSize.height);
      setPreviewBaseScale(nextBase);
      setOffsetX((prev) => {
        const { x } = clampOffsets(prev, offsetY, rect.width, rect.height, nextBase, zoom);
        return x;
      });
      setOffsetY((prev) => {
        const { y } = clampOffsets(offsetX, prev, rect.width, rect.height, nextBase, zoom);
        return y;
      });
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [imageSize, zoom, offsetX, offsetY]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setIsVideo(false);
      setIsCropEnabled(false);
      setIsCropOpen(false);
      setSelectedRatio("4:5");
    } else if (file.type.startsWith("video/")) {
      setIsVideo(true);
      setIsCropEnabled(false);
      setIsCropOpen(false); // No crop for video
    } else {
      toast({
        title: "Unsupported file",
        description: "Please select an image or video file to continue.",
        variant: "destructive",
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDraftZoom(1);
    setDraftOffsetX(0);
    setDraftOffsetY(0);
  };

  const handleTagAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleTagAdd(tagInput.replace(/,$/, ""));
      setTagInput("");
    }
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const clampOffsets = (
    nextX: number,
    nextY: number,
    containerWidth: number,
    containerHeight: number,
    currentBaseScale: number,
    currentZoom: number,
  ) => {
    if (!imageSize.width || !imageSize.height) {
      return { x: nextX, y: nextY };
    }

    const scaledWidth = imageSize.width * currentBaseScale * currentZoom;
    const scaledHeight = imageSize.height * currentBaseScale * currentZoom;
    const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);
    return {
      x: clamp(nextX, -maxX, maxX),
      y: clamp(nextY, -maxY, maxY),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropContainerRef.current) return;
    cropContainerRef.current.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: draftOffsetX,
      offsetY: draftOffsetY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    const nextX = dragStartRef.current.offsetX + deltaX;
    const nextY = dragStartRef.current.offsetY + deltaY;
    const { x, y } = clampOffsets(nextX, nextY, rect.width, rect.height, baseScale, draftZoom);
    setDraftOffsetX(x);
    setDraftOffsetY(y);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropContainerRef.current) return;
    cropContainerRef.current.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY * -0.0015;
    const nextZoom = clamp(Number((draftZoom + delta).toFixed(3)), 1, 3);
    if (cropContainerRef.current) {
      const rect = cropContainerRef.current.getBoundingClientRect();
      const { x, y } = clampOffsets(draftOffsetX, draftOffsetY, rect.width, rect.height, baseScale, nextZoom);
      setDraftOffsetX(x);
      setDraftOffsetY(y);
    }
    setDraftZoom(nextZoom);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      pinchRef.current = {
        distance: Math.hypot(dx, dy),
        zoom: draftZoom,
      };
    } else if (event.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        offsetX: draftOffsetX,
        offsetY: draftOffsetY,
      };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!cropContainerRef.current) return;
    if (event.touches.length === 2) {
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const scale = distance / Math.max(pinchRef.current.distance, 1);
      const nextZoom = clamp(pinchRef.current.zoom * scale, 1, 3);
      const rect = cropContainerRef.current.getBoundingClientRect();
      const { x, y } = clampOffsets(draftOffsetX, draftOffsetY, rect.width, rect.height, baseScale, nextZoom);
      setDraftOffsetX(x);
      setDraftOffsetY(y);
      setDraftZoom(Number(nextZoom.toFixed(3)));
    } else if (event.touches.length === 1 && isDragging) {
      const rect = cropContainerRef.current.getBoundingClientRect();
      const deltaX = event.touches[0].clientX - dragStartRef.current.x;
      const deltaY = event.touches[0].clientY - dragStartRef.current.y;
      const nextX = dragStartRef.current.offsetX + deltaX;
      const nextY = dragStartRef.current.offsetY + deltaY;
      const { x, y } = clampOffsets(nextX, nextY, rect.width, rect.height, baseScale, draftZoom);
      setDraftOffsetX(x);
      setDraftOffsetY(y);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCropComplete = (file: File, ratio: CropRatioOption) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreviewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
    setSelectedRatio(ratio);
    setIsCropEnabled(true);
    setIsCropOpen(false);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDraftZoom(1);
    setDraftOffsetX(0);
    setDraftOffsetY(0);
  };

  const optimizeImageForUpload = async (file: File): Promise<File> => {
    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to read image'));
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      const maxDimension = 1600;
      let { width, height } = image;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height, 1);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to create canvas");
      ctx.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), file.type.includes("png") ? "image/png" : "image/jpeg", 0.92);
      });
      URL.revokeObjectURL(imageUrl);
      if (!blob) throw new Error("Unable to compress image");
      return new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch (error) {
      console.warn("AddPostPage: image compression failed", error);
      return file;
    }
  };

  const handleSendPost = async () => {
    if (!selectedFile && !caption.trim()) {
      toast({
        title: "Add text or media",
        description: "Please add a caption or select an image/video before posting.",
        variant: "destructive",
      });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        title: "Please login",
        description: "You need to be signed in to create a post.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const isVideoFile = selectedFile?.type.startsWith("video/") ?? false;
      let fileToUpload: File | null = selectedFile;
      let ratioToUpload = resolveUploadRatio(selectedRatio, imageAspect, mediaRatio);
      let fieldName = "";

      if (selectedFile) {
        ratioToUpload = isVideoFile ? "9:16" : resolveUploadRatio(selectedRatio, imageAspect, mediaRatio);
        fieldName = isVideoFile ? "video" : "image";
      }

      if (isVideo) {
        fieldName = "video";
      } else {
        fieldName = "image";
      }

      if (selectedFile && !isVideoFile) {
        fileToUpload = await optimizeImageForUpload(fileToUpload);
      }

      const formData = new FormData();
      if (selectedFile && fileToUpload) {
        formData.append(fieldName, fileToUpload);
      }

      // Always send ratio to avoid backend missing ratio errors
      const resolvedRatio = mediaRatio || ratioToUpload || selectedRatio || "1:1";
      formData.append("ratio", resolvedRatio);
      formData.append("caption", caption);
      formData.append("tags", tags.join(","));

      const response = await fetch(`${API_BASE}/posts/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create post");
      }

      let createdPost: any = null;
      try {
        createdPost = await response.json();
      } catch {
        createdPost = null;
      }

      if (createdPost && (createdPost._id || createdPost.image_url || createdPost.video_url)) {
        const targetId = createdPost.user_id || currentUser.uid;
        const cacheKey = `posts:${targetId}`;
        const cached = sessionStorage.getItem(cacheKey);
        const normalizedPost = {
          ...createdPost,
          user_id: createdPost.user_id || currentUser.uid,
          ratio: createdPost.ratio || ratioToUpload,
          likes: createdPost.likes || [],
          comments: createdPost.comments || [],
          views: createdPost.views || [],
        };
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              sessionStorage.setItem(cacheKey, JSON.stringify([normalizedPost, ...parsed]));
            } else {
              sessionStorage.setItem(cacheKey, JSON.stringify([normalizedPost]));
            }
          } catch {
            sessionStorage.setItem(cacheKey, JSON.stringify([normalizedPost]));
          }
        } else {
          sessionStorage.setItem(cacheKey, JSON.stringify([normalizedPost]));
        }
      }

      toast({
        title: "Post uploaded",
        description: `Your ${isVideoFile ? "video" : "image"} post has been created successfully.`,
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setTagInput("");
      setTags([]);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setIsCropEnabled(false);
      setIsVideo(false);
      setCurrentStep(1);
      navigate("/profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToDetails = () => {
    if (!selectedFile) {
      toast({
        title: "Select media first",
        description: "Please choose an image or video before continuing.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-2 sm:px-4 lg:px-6">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-4 sm:p-6 lg:p-7 shadow-xl shadow-black/10">
          <div className="space-y-6">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">Create</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Add Post</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Step 1: choose media. Step 2: add description and publish.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/60 p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className={cn("font-semibold", currentStep === 1 ? "text-foreground" : "text-muted-foreground")}>1. Media</span>
                <span className="h-px flex-1 mx-3 bg-border" />
                <span className={cn("font-semibold", currentStep === 2 ? "text-foreground" : "text-muted-foreground")}>2. Details</span>
              </div>
            </div>

            <div className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {currentStep === 1 && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Select Media
                      </div>
                      {previewUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change File
                        </Button>
                      )}
                    </div>

                    <div
                      className={cn(
                        "relative overflow-hidden rounded-2xl border border-dashed border-border bg-background/50 flex items-center justify-center",
                        previewUrl ? "min-h-[340px] lg:min-h-[520px]" : "min-h-[360px] lg:min-h-[520px]",
                      )}
                    >
                      {previewUrl ? (
                        isVideo ? (
                          <div className="relative w-full" style={{ aspectRatio: "9/16" }}>
                            <video
                              src={previewUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              controls
                              className="w-full h-full rounded-2xl object-contain bg-black"
                              style={{ aspectRatio: "9/16" }}
                            />
                          </div>
                        ) : isCropEnabled ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-4 w-full px-2">
                            <div
                              className="relative rounded-xl overflow-hidden border-2 border-primary/30 shadow-md bg-black"
                              style={{
                                aspectRatio: cropAspectRatio,
                                width: "100%",
                                maxWidth: "min(320px, 100%)",
                                height: "auto",
                              }}
                              ref={previewContainerRef}
                            >
                              <img
                                src={previewUrl}
                                alt="Cropped preview"
                                className="absolute top-1/2 left-1/2 object-cover max-w-none"
                                style={{
                                  width: imageSize.width ? `${imageSize.width}px` : undefined,
                                  height: imageSize.height ? `${imageSize.height}px` : undefined,
                                  transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${zoom * previewBaseScale})`,
                                  transformOrigin: "center",
                                }}
                              />
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{selectedRatio}</p>
                              <p className="text-[11px] text-muted-foreground max-w-xs">Final preview</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCropOpen(true)}
                                className="mt-1 h-9 px-4 text-sm font-medium"
                              >
                                <Crop className="w-4 h-4 mr-2" />
                                Adjust
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2" ref={previewContainerRef}>
                            <img
                              src={previewUrl}
                              alt="Selected"
                              className="max-h-[520px] w-auto max-w-full rounded-2xl object-contain"
                            />
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center px-6">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <ImagePlus className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">Select an image or video to start</p>
                            <p className="text-sm text-muted-foreground">
                              Choose a photo, artwork, or video. {" "}
                              {isVideo ? "Video preview keeps vertical format." : "Original image size is kept by default."}
                            </p>
                          </div>
                          <Button
                            className="rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Plus className="w-4 h-4" />
                            Choose File
                          </Button>
                        </div>
                      )}
                    </div>

                    {previewUrl && !isVideo && (
                      <div className="mt-3 flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => setIsCropOpen(true)}
                          className="w-full sm:w-auto rounded-full gap-2 h-11 text-base font-semibold"
                        >
                          <Crop className="w-5 h-5" />
                          {isCropEnabled ? "Edit Crop" : "Crop"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full rounded-full gap-2 h-11 text-sm font-semibold"
                    onClick={handleContinueToDetails}
                    disabled={!selectedFile}
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="rounded-2xl border border-border bg-background/50 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Media selected</p>
                      <p className="text-xs text-muted-foreground">You can still replace the file before posting.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Change
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Description</h2>
                    <Textarea
                      placeholder="Write a caption that tells your story..."
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      className="min-h-[140px] lg:min-h-[180px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Tags</h2>
                      <span className="text-xs text-muted-foreground">Press Enter to add</span>
                    </div>
                    <Input
                      placeholder="Add tags (e.g., cyberpunk, neon)"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={handleTagKeyDown}
                    />
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} className="flex items-center gap-1 pr-1" variant="secondary">
                          <span>#{tag}</span>
                          <button
                            type="button"
                            className="rounded-full p-1 hover:bg-muted"
                            onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Post Settings</h2>
                    <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                      <p>Make sure your image is centered and looks great in the preview.</p>
                      <p className="mt-1">Use the crop button anytime to adjust the framing.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full rounded-full gap-2 h-11 text-sm font-semibold"
                      onClick={() => setCurrentStep(1)}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      className="w-full rounded-full gap-2 h-11 text-sm font-semibold"
                      onClick={handleSendPost}
                      disabled={isSubmitting || !selectedFile}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isSubmitting ? "Uploading..." : "Post"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
      {!isVideo && (
        <CropModal
          open={isCropOpen}
          imageUrl={previewUrl}
          initialRatio={selectedRatio}
          originalAspect={imageAspect || null}
          onClose={() => setIsCropOpen(false)}
          onComplete={handleCropComplete}
        />
      )}
    </MainLayout>
  );
};

export default AddPostPage;