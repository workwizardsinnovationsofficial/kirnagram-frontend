import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginNew from "@/pages/LoginNew";

const { mockNavigate, mockToast, mockGetGoogleAuthProfile } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockGetGoogleAuthProfile: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/firebase", async () => {
  const actual = await vi.importActual<typeof import("@/firebase")>("@/firebase");
  return {
    ...actual,
    getGoogleAuthProfile: mockGetGoogleAuthProfile,
  };
});

describe("Login flow", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockToast.mockReset();
    mockGetGoogleAuthProfile.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    (global.fetch as unknown as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, needs_mobile_verification: true }),
    });
  });

  it("does not prompt for mobile before Google login and sends the Google profile as-is", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockImplementation(() => "9876543210");

    mockGetGoogleAuthProfile.mockResolvedValue({
      idToken: "google-token",
      profile: { name: "Google User", email: "google@example.com" },
    });

    render(
      <MemoryRouter>
        <LoginNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, options] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.kirnagram.com/auth/google-login");

    const body = JSON.parse(options.body as string);
    expect(body.mobile).toBeUndefined();
    expect(promptSpy).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });
});