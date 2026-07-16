import { describe, expect, it } from "vitest";
import { getAspectRatioValue, resolveUploadRatio, type CropRatioOption } from "./cropImage";

describe("crop image helpers", () => {
  it("maps the Instagram portrait default to the supported backend ratio", () => {
    expect(resolveUploadRatio("4:5", 1.25, "3:4")).toBe("9:16");
  });

  it("keeps supported ratios intact", () => {
    expect(resolveUploadRatio("9:16", 1.25, "3:4")).toBe("9:16");
    expect(resolveUploadRatio("16:9", 1.25, "3:4")).toBe("16:9");
    expect(resolveUploadRatio("1:1", 1.25, "3:4")).toBe("1:1");
  });

  it("returns the right aspect ratio for UI presets", () => {
    expect(getAspectRatioValue("4:5", 1.25)).toBe(4 / 5);
    expect(getAspectRatioValue("1:1", 1.25)).toBe(1);
    expect(getAspectRatioValue("Free", 1.25)).toBeNull();
  });
});
