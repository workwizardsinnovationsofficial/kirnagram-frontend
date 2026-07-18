import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignupNew from "@/pages/SignupNew";

const { mockToast, mockGetGoogleAuthProfile } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockGetGoogleAuthProfile: vi.fn(),
}));

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

describe("Signup flow", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGetGoogleAuthProfile.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    window.localStorage.clear();
  });

  it("moves from mobile input to OTP verification after sending an OTP", async () => {
    render(
      <MemoryRouter>
        <SignupNew />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter your full name"), {
      target: { value: "Test User" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /continue/i })[0]);

    fireEvent.change(screen.getByPlaceholderText("Enter 10-digit mobile"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));

    expect(await screen.findByText(/verify mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/9876543210/i)).toBeInTheDocument();
  });

  it("offers Google signup and starts the flow", async () => {
    mockGetGoogleAuthProfile.mockResolvedValue({
      idToken: "google-token",
      profile: { name: "Google User", email: "google@example.com" },
    });

    render(
      <MemoryRouter>
        <SignupNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByPlaceholderText("Enter 10-digit mobile")).toBeInTheDocument();
    expect(mockGetGoogleAuthProfile).toHaveBeenCalled();
  });
});
