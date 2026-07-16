import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignupNew from "@/pages/SignupNew";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("Signup flow", () => {
  beforeEach(() => {
    mockToast.mockReset();
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
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByPlaceholderText("Enter 10-digit mobile"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));

    expect(await screen.findByText(/enter otp/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile/i)).toBeInTheDocument();
  });
});
