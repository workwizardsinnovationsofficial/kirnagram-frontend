import React, { useEffect, useState, useRef } from 'react';
import { X, Plus, Type, Smile, Download, Camera, Video, Volume2, VolumeX, Scissors, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const API_BASE = "http://127.0.0.1:8000";

interface StoryFile {
  file?: File | null;
  preview: string;
  type: 'image' | 'video';
}

const StoryUpload: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [story, setStory] = useState<StoryFile | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | undefined>(undefined);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [emojiStickers, setEmojiStickers] = useState<Array<{ emoji: string; x: number; y: number }>>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 20 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingEmojiIndex, setDraggingEmojiIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted so browser autoplay policies allow playback
  const [showTrimControls, setShowTrimControls] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [loadingFromPost, setLoadingFromPost] = useState(false);

  useEffect(() => {
    const imageUrl = (location.state as any)?.imageUrl as string | undefined;
    const videoUrl = (location.state as any)?.videoUrl as string | undefined;
    const posterUrl = (location.state as any)?.posterUrl as string | undefined;
    const initialText = (location.state as any)?.text as string | undefined;

    if (posterUrl) {
      setVideoPoster(posterUrl);
    }

    if (initialText && initialText.trim() && !imageUrl && !videoUrl) {
      setText(initialText.trim());
      setStep('edit');
      setMediaType('image');
      return;
    }

    const loadMediaFromUrl = async (url: string, type: 'image' | 'video') => {
      setStep('edit');
      setMediaType(type);
      setLoadingFromPost(true);
      try {
        let response: Response | null = null;
        const user = auth.currentUser;
        if (!user) throw new Error('Authentication required');
        const token = await user.getIdToken();

        // Use proxy to avoid CORS blocking for remote assets (image and video)
        const proxyRes = await fetch(`${API_BASE}/posts/image-proxy?url=${encodeURIComponent(url)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (proxyRes.ok) {
          response = proxyRes;
        }

        if (!response) {
          try {
            response = await fetch(url);
          } catch {
            response = null;
          }
        }

        if (!response || !response.ok) throw new Error(`Failed to load ${type}`);

        const blob = await response.blob();
        const extension = type === 'image' ? 'jpg' : 'mp4';
        const mime = blob.type || (type === 'image' ? 'image/jpeg' : 'video/mp4');
        const file = new File([blob], `story.${extension}`, { type: mime });
        const preview = URL.createObjectURL(blob);

        setStory({ file, preview, type });

        if (type === 'video') {
          // for video stories, assign defaults and allow trim updates
          setTrimStart(0);
          setTrimEnd(Math.min(75, 30));
        }
      } catch (error) {
        console.warn(`StoryUpload: failed to load ${type} via proxy/fetch`, error);

        // Fallback to direct URL playback to keep user in place when proxy fails.
        setStory({
          file: null,
          preview: url,
          type,
        });

        toast({
          title: `Unable to download story ${type}`,
          description:
            'Using direct source URL, playback may be delayed or blocked by CORS. Save after verifying.',
          variant: 'warning',
        });
      } finally {
        setLoadingFromPost(false);
      }
    };

    if (videoUrl) {
      console.log("StoryUpload: loading videoUrl", videoUrl);
      void loadMediaFromUrl(videoUrl, 'video');
      return;
    }

    if (imageUrl) {
      console.log("StoryUpload: loading imageUrl", imageUrl);
      void loadMediaFromUrl(imageUrl, 'image');
      return;
    }
  }, [location.state, toast]);

  const emojis = ['❤️', '😂', '😍', '😘', '🔥', '✨', '😎', '🤩', '😭', '😱', '🎉', '🎊'];

  const handleMediaSelect = async (type: 'image' | 'video') => {
    setMediaType(type);
    // Trigger the appropriate file input
    setTimeout(() => {
      if (type === 'image' && imageInputRef.current) {
        imageInputRef.current.value = '';
        imageInputRef.current.click();
      } else if (type === 'video' && videoInputRef.current) {
        videoInputRef.current.value = '';
        videoInputRef.current.click();
      }
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine which input was used based on the accept attribute
    const accept = e.target.accept;
    const isImageInput = accept.includes('image');
    const isVideoInput = accept.includes('video');

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm'];

    if (isImageInput && !validImageTypes.includes(file.type)) {
      toast({
        title: "Invalid image format",
        description: "Please select JPG, PNG, WebP, or GIF",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    if (isVideoInput) {
      if (!validVideoTypes.includes(file.type)) {
        toast({
          title: "Invalid video format",
          description: "Please select MP4 or WebM",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      // Check video duration
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        if (video.duration >= 120) {
          toast({
            title: "Video too long",
            description: "Video must be less than 2 minutes (120 seconds).",
            variant: "destructive",
          });
          e.target.value = '';
          return;
        }
        if (video.duration > 75) {
          toast({
            title: "Video too long",
            description: "Video must be 1 minute 15 seconds (75 seconds) or less.",
            variant: "destructive",
          });
          e.target.value = '';
          return;
        }
        // Video is valid, proceed with upload
        const preview = URL.createObjectURL(file);
        setStory({ file, preview, type: 'video' });
        setTrimEnd(Math.min(video.duration, 75));
        setStep('edit');
      };
      video.onerror = () => {
        toast({
          title: "Unable to load video",
          description: "Please try another video file",
          variant: "destructive",
        });
        e.target.value = '';
      };
      video.src = URL.createObjectURL(file);
      return; // Exit here, let metadata handler continue
    }

    // For images, proceed immediately
    const preview = URL.createObjectURL(file);
    setStory({ file, preview, type: 'image' });
    setStep('edit');
  };

  const handleAddEmoji = (emoji: string) => {
    setEmojiStickers([
      ...emojiStickers,
      { emoji, x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }
    ]);
    setShowEmojiPicker(false);
  };

  const handleTextMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingText(true);
  };

  const handleTextTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingText(true);
  };

  const handleEmojiMouseDown = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingEmojiIndex(index);
  };

  const handleEmojiTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    setDraggingEmojiIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    if (isDraggingText) {
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setTextPosition({ x, y });
    }

    if (draggingEmojiIndex !== null) {
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      setEmojiStickers(prev => 
        prev.map((sticker, idx) => 
          idx === draggingEmojiIndex ? { ...sticker, x, y } : sticker
        )
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];

    if (isDraggingText) {
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      setTextPosition({ x, y });
    }

    if (draggingEmojiIndex !== null) {
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      
      setEmojiStickers(prev => 
        prev.map((sticker, idx) => 
          idx === draggingEmojiIndex ? { ...sticker, x, y } : sticker
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsDraggingText(false);
    setDraggingEmojiIndex(null);
  };

  const handleTouchEnd = () => {
    setIsDraggingText(false);
    setDraggingEmojiIndex(null);
  };

  const optimizeImageForUpload = async (file: File): Promise<File> => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to read image'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const maxDimension = 1600;
      let { width, height } = image;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height, 1);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create canvas');
      ctx.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.9);
      });
      URL.revokeObjectURL(objectUrl);
      if (!blob) throw new Error('Unable to compress image');
      return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (error) {
      console.warn('StoryUpload: image compression failed', error);
      return file;
    }
  };

  const renderStoryToCanvas = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw text if present
        if (text && text.trim()) {
          const x = (textPosition.x / 100) * canvas.width;
          const y = (textPosition.y / 100) * canvas.height;

          // Calculate font size based on canvas size
          const fontSize = Math.max(32, canvas.width / 15);
          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Add text background with rounded corners
          const metrics = ctx.measureText(text);
          const padding = fontSize * 0.6;
          const bgWidth = metrics.width + padding * 2;
          const bgHeight = fontSize * 1.5;
          const radius = fontSize * 0.4;

          // Draw rounded rectangle background
          const bgX = x - bgWidth / 2;
          const bgY = y - bgHeight / 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.moveTo(bgX + radius, bgY);
          ctx.lineTo(bgX + bgWidth - radius, bgY);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
          ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
          ctx.lineTo(bgX + radius, bgY + bgHeight);
          ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
          ctx.lineTo(bgX, bgY + radius);
          ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
          ctx.closePath();
          ctx.fill();

          // Draw text with shadow for better readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, x, y);
          ctx.shadowColor = 'transparent';
        }

        // Draw emoji stickers
        if (emojiStickers.length > 0) {
          emojiStickers.forEach((sticker) => {
            const x = (sticker.x / 100) * canvas.width;
            const y = (sticker.y / 100) * canvas.height;
            const emojiSize = Math.max(60, canvas.width / 8);

            ctx.font = `${emojiSize}px Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.emoji, x, y);
          });
        }

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          0.95
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = story?.preview || '';
    });
  };

  const renderTextIntoImage = async (textValue: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 56px system-ui';
      const words = textValue.split(' ');
      const lineHeight = 70;
      const maxWidth = width - 120;
      let line = '';
      let lines: string[] = [];

      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      });
      if (line) lines.push(line);

      const startY = height / 2 - ((lines.length - 1) / 2) * lineHeight;
      lines.forEach((ln, idx) => {
        ctx.fillText(ln, width / 2, startY + idx * lineHeight);
      });

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image from text')); 
      }, 'image/jpeg', 0.95);
    });
  };

  const handleUpload = async () => {
    let currentStory = story;
    if (!currentStory && text.trim()) {
      const blob = await renderTextIntoImage(text.trim());
      const file = new File([blob], 'story-text.jpg', { type: 'image/jpeg' });
      currentStory = { file, preview: URL.createObjectURL(blob), type: 'image' };
      setStory(currentStory);
    }

    if (!currentStory) return;

    setUploading(true);
    try {
      // Get Firebase token
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to post a story",
          variant: "destructive",
        });
        return;
      }
      const token = await user.getIdToken();

      // Ensure we have file data for upload. If we only have remote URL fallback, re-fetch through proxy.
      let fileToUpload: File | Blob | null = currentStory.file || null;

      if (!fileToUpload && currentStory.preview) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const fetchUrl = `${API_BASE}/posts/image-proxy?url=${encodeURIComponent(currentStory.preview)}`;
          const res = await fetch(fetchUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);

          const blob = await res.blob();
          const extension = currentStory.type === 'image' ? 'jpg' : 'mp4';
          const mime = blob.type || (currentStory.type === 'image' ? 'image/jpeg' : 'video/mp4');
          fileToUpload = new File([blob], `story.${extension}`, { type: mime });
          setStory({ ...currentStory, file: fileToUpload });
        } catch (e) {
          console.warn('StoryUpload: cannot re-fetch file for upload', e);
        }
      }

      if (!fileToUpload) {
        throw new Error('No file available to upload. Please select media directly or refresh and retry.');
      }

      if (currentStory.type === 'image') {
        const maybeOptimized = await optimizeImageForUpload(fileToUpload as File);
        fileToUpload = maybeOptimized;
      }

      // For images with text or emojis, render them onto the image
      if (story.type === 'image' && (text || emojiStickers.length > 0)) {
        const compositeBlob = await renderStoryToCanvas();
        fileToUpload = new File([compositeBlob], (story.file?.name || 'story-image.jpg'), { type: 'image/jpeg' });
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append('media_type', story.type);
      
      // Use actual trim duration for videos
      const videoDuration = story.type === 'video' ? Math.round(trimEnd - trimStart) : 10;
      params.append('duration', videoDuration.toString());
      params.append('visibility', 'public');
      
      // Add trim info for videos
      if (story.type === 'video') {
        params.append('trim_start', trimStart.toFixed(1));
        params.append('trim_end', trimEnd.toFixed(1));
      }
      
      // Add text overlay for videos (images already have it baked in)
      if (story.type === 'video' && text) {
        params.append('text', text);
      }
      
      // Add emoji stickers for videos (images already have them baked in)
      if (story.type === 'video' && emojiStickers.length > 0) {
        params.append('emoji_stickers', JSON.stringify(emojiStickers));
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch(`http://127.0.0.1:8000/stories/create?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Upload failed ${response.status}:`, errorData);
        console.error('Full error response:', errorData);
        throw new Error(`Upload failed: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Story uploaded successfully:', data);
      
      // Get the new story ID from response
      const storyId = data.story_id;
      
      // Success notification
      toast({
        title: "Story posted! 🎉",
        description: "Your story is now live for your followers",
      });
      
      // Navigate directly to the new story viewer
      setTimeout(() => {
        if (storyId) {
          navigate(`/story/view/${storyId}`);
        } else {
          navigate('/');
        }
      }, 500);
    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload story",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-background via-black to-background flex flex-col items-center justify-center px-4">
        {/* Close Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 lg:top-6 lg:right-6 text-foreground hover:bg-muted/40 p-2 rounded-full transition z-10"
          aria-label="Close"
        >
          <X size={28} />
        </button>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-foreground text-2xl lg:text-3xl font-bold mb-2">Create Story</h1>
            <p className="text-muted-foreground text-sm lg:text-base">Share a moment with your followers</p>
          </div>

          {/* Media Selection */}
          <div className="space-y-4">
            {/* Image Option */}
            <button
              onClick={() => handleMediaSelect('image')}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-primary-foreground py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-3 transition transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
            >
              <Camera className="w-7 h-7" />
              <div className="text-left">
                <div className="text-base lg:text-lg">Photo Story</div>
                <div className="text-xs lg:text-sm font-normal opacity-90">Play for 10 seconds</div>
              </div>
            </button>

            {/* Video Option */}
            <button
              onClick={() => handleMediaSelect('video')}
              className="w-full bg-card border border-border hover:bg-gray-100 dark:hover:bg-muted/50 text-foreground py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-3 transition transform hover:scale-105 active:scale-95"
            >
              <Video className="w-7 h-7 text-primary" />
              <div className="text-left">
                <div className="text-base lg:text-lg">Video Story</div>
                <div className="text-xs lg:text-sm font-normal text-muted-foreground">Max 30 seconds</div>
              </div>
            </button>
          </div>

          {/* Hidden file inputs - separate for image and video */}
          <input
            ref={imageInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            onChange={handleFileChange}
            accept="video/mp4,video/webm"
            className="hidden"
          />
        </div>
      </div>
    );
  }

  if (loadingFromPost && step === 'edit' && !story) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-900 dark:text-white">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-gray-900 dark:text-white/70">Loading story...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col lg:flex-row">
      {/* Header - Mobile only */}
      <div className="flex lg:hidden justify-between items-center px-4 py-3 bg-card/95 border-b border-border w-full">
        <button
          onClick={() => {
            setStep('select');
            setStory(null);
            setText('');
            setEmojiStickers([]);
          }}
          className="text-foreground hover:bg-gray-100 dark:hover:bg-muted/50 p-2 rounded-full transition"
          title="Back"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-foreground font-semibold">Edit Story</h2>
        <button
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-gray-100 dark:hover:bg-muted/50 p-2 rounded-full transition"
          title="Close"
        >
          <X size={24} />
        </button>
      </div>

      {/* Desktop Header - Only on desktop */}
      <div className="hidden lg:flex absolute top-0 left-0 right-0 justify-between items-center px-6 py-4 bg-gradient-to-b from-background/90 to-transparent z-50">
        <h2 className="text-foreground font-semibold">Edit Story</h2>
        <button
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-muted/40 p-2 rounded-full transition"
          title="Close"
        >
          <X size={28} />
        </button>
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 flex items-center justify-center p-0 lg:p-8"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Story Preview Container - Desktop: 9:16 aspect ratio, Mobile: full screen */}
        <div className="relative w-full h-full lg:h-full lg:max-w-md lg:aspect-[9/16] lg:rounded-2xl overflow-hidden bg-black lg:shadow-2xl">
          
          {/* Video Timeline Trimmer - Top */}
          {story?.type === 'video' && (
            <div className="absolute top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm">
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => {
                      const newMutedState = !isMuted;
                      setIsMuted(newMutedState);
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.muted = newMutedState;
                      }
                    }}
                    className="bg-white/20 hover:bg-white/30 text-gray-900 dark:text-white p-2 rounded-full transition"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <span className="text-gray-900 dark:text-white text-xs font-medium">
                    {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s • {(trimEnd - trimStart).toFixed(1)}s
                  </span>
                </div>
                
                {/* Trim Range Slider */}
                <div className="relative h-12 bg-gray-700 rounded-lg overflow-hidden">
                  {/* Dimmed areas outside trim range */}
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-black/60"
                    style={{
                      width: `${(trimStart / (videoPreviewRef.current?.duration || 30)) * 100}%`
                    }}
                  />
                  <div 
                    className="absolute top-0 right-0 bottom-0 bg-black/60"
                    style={{
                      width: `${100 - (trimEnd / (videoPreviewRef.current?.duration || 30)) * 100}%`
                    }}
                  />
                  
                  {/* Selected/Active trim range */}
                  <div 
                    className="absolute top-0 bottom-0 border-t-2 border-b-2 border-orange-500"
                    style={{
                      left: `${(trimStart / (videoPreviewRef.current?.duration || 30)) * 100}%`,
                      right: `${100 - (trimEnd / (videoPreviewRef.current?.duration || 30)) * 100}%`
                    }}
                  />
                  
                  {/* Left trim handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-orange-500 cursor-ew-resize z-30 hover:w-3 transition-all"
                    style={{
                      left: `${(trimStart / (videoPreviewRef.current?.duration || 30)) * 100}%`,
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startTrim = trimStart;
                      const duration = videoPreviewRef.current?.duration || 30;
                      const sliderWidth = e.currentTarget.parentElement?.offsetWidth || 1;
                      
                      const handleMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaTime = (deltaX / sliderWidth) * duration;
                        const newTrimStart = Math.max(0, Math.min(trimEnd - 0.5, startTrim + deltaTime));
                        setTrimStart(newTrimStart);
                        if (videoPreviewRef.current) {
                          videoPreviewRef.current.currentTime = newTrimStart;
                        }
                      };
                      
                      const handleUp = () => {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      };
                      
                      document.addEventListener('mousemove', handleMove);
                      document.addEventListener('mouseup', handleUp);
                    }}
                    onTouchStart={(e) => {
                      const startX = e.touches[0].clientX;
                      const startTrim = trimStart;
                      const duration = videoPreviewRef.current?.duration || 30;
                      const sliderWidth = e.currentTarget.parentElement?.offsetWidth || 1;
                      
                      const handleMove = (moveEvent: TouchEvent) => {
                        const deltaX = moveEvent.touches[0].clientX - startX;
                        const deltaTime = (deltaX / sliderWidth) * duration;
                        const newTrimStart = Math.max(0, Math.min(trimEnd - 0.5, startTrim + deltaTime));
                        setTrimStart(newTrimStart);
                        if (videoPreviewRef.current) {
                          videoPreviewRef.current.currentTime = newTrimStart;
                        }
                      };
                      
                      const handleEnd = () => {
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                      };
                      
                      document.addEventListener('touchmove', handleMove);
                      document.addEventListener('touchend', handleEnd);
                    }}
                  >
                    <div className="absolute inset-y-1/3 left-1/2 transform -translate-x-1/2 w-0.5 bg-white rounded-full" />
                  </div>
                  
                  {/* Right trim handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-orange-500 cursor-ew-resize z-30 hover:w-3 transition-all"
                    style={{
                      left: `${(trimEnd / (videoPreviewRef.current?.duration || 30)) * 100}%`,
                      transform: 'translateX(-100%)'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startTrim = trimEnd;
                      const duration = videoPreviewRef.current?.duration || 30;
                      const sliderWidth = e.currentTarget.parentElement?.offsetWidth || 1;
                      
                      const handleMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaTime = (deltaX / sliderWidth) * duration;
                        const newTrimEnd = Math.max(trimStart + 0.5, Math.min(duration, Math.min(trimStart + 30, startTrim + deltaTime)));
                        setTrimEnd(newTrimEnd);
                      };
                      
                      const handleUp = () => {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      };
                      
                      document.addEventListener('mousemove', handleMove);
                      document.addEventListener('mouseup', handleUp);
                    }}
                    onTouchStart={(e) => {
                      const startX = e.touches[0].clientX;
                      const startTrim = trimEnd;
                      const duration = videoPreviewRef.current?.duration || 30;
                      const sliderWidth = e.currentTarget.parentElement?.offsetWidth || 1;
                      
                      const handleMove = (moveEvent: TouchEvent) => {
                        const deltaX = moveEvent.touches[0].clientX - startX;
                        const deltaTime = (deltaX / sliderWidth) * duration;
                        const newTrimEnd = Math.max(trimStart + 0.5, Math.min(duration, Math.min(trimStart + 30, startTrim + deltaTime)));
                        setTrimEnd(newTrimEnd);
                      };
                      
                      const handleEnd = () => {
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                      };
                      
                      document.addEventListener('touchmove', handleMove);
                      document.addEventListener('touchend', handleEnd);
                    }}
                  >
                    <div className="absolute inset-y-1/3 left-1/2 transform -translate-x-1/2 w-0.5 bg-white rounded-full" />
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center text-gray-900 dark:text-white text-xs font-medium pointer-events-none">
                    Drag handles to trim
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media Preview */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {!story ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900">
                <p className="text-gray-900 dark:text-white text-center text-lg px-6">Text story preview (tap Upload to create from text)</p>
              </div>
            ) : story.type === 'image' ? (
              <img
                src={story.preview}
                alt="Story"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                ref={videoPreviewRef}
                src={story?.preview}
                poster={videoPoster}
                className="w-full h-full object-contain"
                autoPlay
                muted={isMuted}
                loop
                controls
                playsInline
                onCanPlay={() => {
                  videoPreviewRef.current?.play().catch(() => {});
                }}
                onError={() => {
                  toast({
                    title: 'Video load failed',
                    description: 'Cannot load video preview, using fallback URL.',
                    variant: 'destructive',
                  });
                }}
              />
            )}

        {/* Text Overlay - Draggable */}
        {text && (
          <div
            ref={textOverlayRef}
            className={`absolute bg-black/60 backdrop-blur-sm text-gray-900 dark:text-white p-3 rounded-lg max-w-xs z-30 select-none transition-all duration-100 ${
              isDraggingText 
                ? 'cursor-grabbing bg-black/80 scale-110 shadow-2xl' 
                : 'cursor-grab hover:bg-black/70 hover:scale-105'
            }`}
            style={{
              left: `${textPosition.x}%`,
              top: `${textPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
            }}
            onMouseDown={handleTextMouseDown}
            onTouchStart={handleTextTouchStart}
          >
            <p className="text-sm lg:text-lg font-semibold break-words pointer-events-none">{text}</p>
          </div>
        )}

        {/* Emoji Stickers - Draggable */}
        {emojiStickers.map((sticker, idx) => (
          <div
            key={idx}
            className={`absolute text-4xl lg:text-5xl select-none transition-all duration-100 ${
              draggingEmojiIndex === idx
                ? 'cursor-grabbing scale-125 opacity-90 z-40'
                : 'cursor-grab hover:scale-110 z-35'
            }`}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
            }}
            onMouseDown={(e) => handleEmojiMouseDown(e, idx)}
            onTouchStart={(e) => handleEmojiTouchStart(e, idx)}
          >
            {sticker.emoji}
          </div>
        ))}

        {/* Tools Overlay */}
        <div className="absolute top-4 left-4 right-4 flex gap-2 z-40" style={{ marginTop: story?.type === 'video' ? '80px' : '0' }}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="bg-white/20 hover:bg-white/30 text-gray-900 dark:text-white p-3 rounded-full backdrop-blur-sm transition"
            title="Add emoji"
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute top-20 left-4 bg-card border border-border rounded-lg p-3 grid grid-cols-4 gap-2 w-48 z-50 shadow-2xl" style={{ marginTop: story?.type === 'video' ? '80px' : '0' }}>
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAddEmoji(emoji)}
                className="text-2xl hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
          </div>

          {/* Bottom Controls - Inside story container on desktop */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 space-y-3">
            {/* Text Input */}
            <input
              type="text"
              placeholder="Add text to your story..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 100))}
              className="w-full bg-card/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground rounded-lg px-4 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`relative w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition overflow-hidden ${
                uploading
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-primary-foreground shadow-lg shadow-primary/30'
              }`}
            >
              {/* Liquid fill animation */}
              {uploading && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary animate-fill-up origin-bottom" />
              )}
              <Download size={20} className="relative z-10" />
              <span className="relative z-10">{uploading ? 'Uploading...' : 'Share Story'}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
};

export default StoryUpload;