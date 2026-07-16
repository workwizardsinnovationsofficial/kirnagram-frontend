import { useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import type { CroppedAreaPixels } from "react-easy-crop";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { cropImageToFile, type CropRatioOption, getAspectRatioValue, CROP_RATIO_OPTIONS } from "@/lib/cropImage";

interface CropModalProps {
  open: boolean;
  imageUrl: string | null;
  initialRatio: CropRatioOption;
  originalAspect: number | null;
  onClose: () => void;
  onComplete: (file: File, ratio: CropRatioOption) => void;
}

const CropModal = ({ open, imageUrl, initialRatio, originalAspect, onClose, onComplete }: CropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [activeRatio, setActiveRatio] = useState<CropRatioOption>(initialRatio);
  const [showGrid, setShowGrid] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const aspect = useMemo(() => getAspectRatioValue(activeRatio, originalAspect), [activeRatio, originalAspect]);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setActiveRatio(initialRatio);
    setShowGrid(true);
  }, [open, initialRatio, imageUrl]);

  const resetViewport = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setShowGrid(true);
  };

  const handleComplete = async () => {
    if (!imageUrl || !croppedAreaPixels) {
      onComplete(new File([""], "cropped.jpg", { type: "image/jpeg" }), activeRatio);
      return;
    }

    try {
      setIsProcessing(true);
      const file = await cropImageToFile({
        imageUrl,
        croppedAreaPixels,
        rotation,
        fileName: "cropped.jpg",
        mimeType: "image/jpeg",
      });
      onComplete(file, activeRatio);
    } catch (error) {
      console.error("CropModal: unable to create cropped file", error);
      onComplete(new File([""], "cropped.jpg", { type: "image/jpeg" }), activeRatio);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="h-[100dvh] w-full max-w-none border-0 bg-[#050505] p-0 text-gray-900 dark:text-white shadow-none sm:h-[92dvh] sm:max-w-[900px] sm:rounded-[28px]">
        <div className="flex h-full flex-col">
          {/* Desktop Header Only */}
          <div className="hidden items-center justify-between gap-4 border-b border-white/10 px-5 py-3 sm:flex">
            <button type="button" className="flex-shrink-0 rounded-full p-2 transition hover:bg-white/10" onClick={onClose}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">Crop</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-gray-900 dark:text-white/60">Instagram style</p>
            </div>
            <Button type="button" size="sm" className="flex-shrink-0 rounded-full bg-white text-base font-medium text-black hover:bg-white/90" onClick={handleComplete} disabled={isProcessing}>
              {isProcessing ? "..." : "Next"}
            </Button>
          </div>

          {/* Mobile Header Only - Minimal */}
          <div className="flex items-center border-b border-white/10 px-3 py-2 sm:hidden">
            <button type="button" className="flex-shrink-0 rounded-full p-2 transition hover:bg-white/10" onClick={onClose}>
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-[#050505] px-3 py-3 sm:px-5 sm:py-4">
            <div className="mx-auto flex h-full max-w-[720px] flex-col justify-center">
              <div className="relative flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-black/90">
                {imageUrl ? (
                  <>
                    <Cropper
                      image={imageUrl}
                      crop={crop}
                      zoom={zoom}
                      rotation={rotation}
                      aspect={aspect ?? undefined}
                      onCropChange={setCrop}
                      onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                      onZoomChange={setZoom}
                      onRotationChange={setRotation}
                      minZoom={1}
                      maxZoom={4}
                      zoomWithScroll
                      cropShape="rect"
                      showGrid={showGrid}
                      objectFit="contain"
                      style={{ containerStyle: { backgroundColor: "#050505" } }}
                      onDoubleClick={resetViewport}
                    />
                    <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_72%,rgba(0,0,0,0.45)_100%)]" />
                    {showGrid && (
                      <div className="pointer-events-none absolute inset-0 z-20">
                        <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
                        <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
                        <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
                        <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-900 dark:text-white/60">Select an image to begin cropping</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/95 px-3 py-3 sm:px-4">
            <div className="mx-auto flex max-w-[720px] flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CROP_RATIO_OPTIONS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setActiveRatio(ratio)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-all",
                      activeRatio === ratio
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-white/5 text-gray-900 dark:text-white/80 hover:bg-white/10",
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button type="button" className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white/80 transition hover:bg-white/10" onClick={resetViewport}>
                  <RefreshCw className="h-4 w-4" /> Reset
                </button>
                <button type="button" className="text-sm text-gray-900 dark:text-white/70 transition hover:text-gray-900 dark:text-white" onClick={() => setShowGrid((value) => !value)}>
                  {showGrid ? "Hide grid" : "Show grid"}
                </button>
              </div>

              {/* Mobile Next Button - Full Width at Bottom */}
              <Button type="button" className="mt-2 w-full rounded-full bg-white py-2 text-base font-semibold text-black hover:bg-white/90 sm:hidden" onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? "Preparing..." : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CropModal;
