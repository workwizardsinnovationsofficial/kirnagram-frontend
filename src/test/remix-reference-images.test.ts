import { describe, expect, it } from "vitest";
import { collectPromptImages } from "../pages/Remix";

describe("collectPromptImages", () => {
  it("prioritizes the main sample image and includes creator reference images", () => {
    const prompt = {
      image_url: "https://example.com/main.jpg",
      sample_image_url: "https://example.com/sample.jpg",
      sample_image_urls: ["https://example.com/sample-2.jpg"],
      reference_correct_image_urls: ["https://example.com/reference-correct.jpg"],
      reference_wrong_image_urls: ["https://example.com/reference-wrong.jpg"],
    };

    expect(collectPromptImages(prompt as any)).toEqual([
      "https://example.com/main.jpg",
      "https://example.com/sample.jpg",
      "https://example.com/sample-2.jpg",
      "https://example.com/reference-correct.jpg",
      "https://example.com/reference-wrong.jpg",
    ]);
  });

  it("deduplicates repeated image URLs", () => {
    const prompt = {
      image_url: "https://example.com/main.jpg",
      sample_image_url: "https://example.com/main.jpg",
      sample_image_urls: ["https://example.com/main.jpg"],
      reference_correct_image_urls: ["https://example.com/ref.jpg"],
      reference_wrong_image_urls: ["https://example.com/ref.jpg"],
    };

    expect(collectPromptImages(prompt as any)).toEqual([
      "https://example.com/main.jpg",
      "https://example.com/ref.jpg",
    ]);
  });
});
