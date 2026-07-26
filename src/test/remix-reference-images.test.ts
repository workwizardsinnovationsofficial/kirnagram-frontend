import { describe, expect, it } from "vitest";
import { collectPromptImageGroups } from "../pages/Remix";

describe("collectPromptImageGroups", () => {
  it("groups creator reference images into right and wrong variants", () => {
    const prompt = {
      image_url: "https://example.com/main.jpg",
      sample_image_url: "https://example.com/sample.jpg",
      sample_image_urls: ["https://example.com/sample-2.jpg"],
      reference_correct_image_urls: ["https://example.com/reference-correct.jpg"],
      reference_wrong_image_urls: ["https://example.com/reference-wrong.jpg"],
    };

    expect(collectPromptImageGroups(prompt as any)).toEqual({
      orderedImages: [
        "https://example.com/main.jpg",
        "https://example.com/sample.jpg",
        "https://example.com/sample-2.jpg",
        "https://example.com/reference-correct.jpg",
        "https://example.com/reference-wrong.jpg",
      ],
      referenceCorrectImages: ["https://example.com/reference-correct.jpg"],
      referenceWrongImages: ["https://example.com/reference-wrong.jpg"],
    });
  });

  it("deduplicates repeated image URLs while preserving separate variant groups", () => {
    const prompt = {
      image_url: "https://example.com/main.jpg",
      sample_image_url: "https://example.com/main.jpg",
      sample_image_urls: ["https://example.com/main.jpg"],
      reference_correct_image_urls: ["https://example.com/ref.jpg"],
      reference_wrong_image_urls: ["https://example.com/ref.jpg"],
    };

    expect(collectPromptImageGroups(prompt as any)).toEqual({
      orderedImages: ["https://example.com/main.jpg", "https://example.com/ref.jpg"],
      referenceCorrectImages: ["https://example.com/ref.jpg"],
      referenceWrongImages: ["https://example.com/ref.jpg"],
    });
  });
});
