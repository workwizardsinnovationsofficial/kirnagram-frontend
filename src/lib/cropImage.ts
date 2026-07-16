import type { CroppedAreaPixels } from "react-easy-crop";

export type CropRatioOption = "Free" | "Original" | "4:5" | "1:1" | "16:9" | "9:16";

export const CROP_RATIO_OPTIONS: CropRatioOption[] = ["Free", "Original", "4:5", "1:1", "16:9", "9:16"];

const parseAspectRatio = (ratio: string | undefined) => {
  if (!ratio) return null;
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return null;
  return width / height;
};

export const getAspectRatioValue = (ratio: CropRatioOption, originalAspect: number | null): number | null => {
  switch (ratio) {
    case "Free":
      return null;
    case "Original":
      return originalAspect ?? null;
    case "4:5":
      return 4 / 5;
    case "1:1":
      return 1;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
    default:
      return null;
  }
};

export const resolveUploadRatio = (ratio: CropRatioOption, originalAspect: number | null, mediaRatio?: string): string => {
  if (ratio === "4:5") return "9:16";

  if (ratio === "9:16" || ratio === "16:9" || ratio === "1:1") {
    return ratio;
  }

  if (ratio === "Original") {
    const parsed = parseAspectRatio(mediaRatio ?? "") ?? originalAspect;
    if (parsed && parsed > 1.2) return "16:9";
    if (parsed && parsed < 0.85) return "9:16";
    return "1:1";
  }

  if (ratio === "Free") {
    const parsed = parseAspectRatio(mediaRatio ?? "") ?? originalAspect;
    if (parsed && parsed > 1.2) return "16:9";
    if (parsed && parsed < 0.85) return "9:16";
    return "1:1";
  }

  return "1:1";
};

export const cropImageToFile = async ({
  imageUrl,
  croppedAreaPixels,
  rotation,
  fileName,
  mimeType,
}: {
  imageUrl: string;
  croppedAreaPixels: CroppedAreaPixels;
  rotation: number;
  fileName: string;
  mimeType: string;
}): Promise<File> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(croppedAreaPixels.width));
  canvas.height = Math.max(1, Math.round(croppedAreaPixels.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType.includes("png") ? "image/png" : "image/jpeg", 1);
  });

  if (!blob) throw new Error("Unable to export image");

  return new File([blob], fileName.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
};
