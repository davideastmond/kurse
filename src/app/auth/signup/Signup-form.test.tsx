// @vitest-environment jsdom

import type { SignupActionState } from "@/app/auth/signup/definitions";
import { cleanup, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/auth", () => ({
  registerUserAction: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

const mockAction = vi.fn();

function renderWithState(state: SignupActionState, isPending = false) {
  return import("react").then(({ useActionState }) => {
    (useActionState as Mock).mockReturnValue([state, mockAction, isPending]);
    return import("./Signup-form").then(({ SignupForm }) =>
      render(<SignupForm />),
    );
  });
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders core signup fields and actions", async () => {
    await renderWithState({ status: "idle" });

    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /sign in/i }).getAttribute("href"),
    ).toBe("/auth/signin");
  });

  it("shows a success alert when action state is successful", async () => {
    await renderWithState({
      status: "success",
      message: "Account created successfully.",
    });

    expect(screen.getByText("Account created successfully.")).toBeTruthy();
  });

  it("shows an error alert when action state fails", async () => {
    await renderWithState({
      status: "error",
      message: "Unable to create account.",
    });

    expect(screen.getByText("Unable to create account.")).toBeTruthy();
  });

  it("renders field-level errors with accessibility wiring", async () => {
    await renderWithState({
      status: "error",
      fieldErrors: {
        name: "Name is required",
        email: "Please enter a valid email",
        password: "Password is too short",
        confirmPassword: "Passwords do not match",
      },
    });

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    expect(screen.getByText("Name is required")).toBeTruthy();
    expect(screen.getByText("Please enter a valid email")).toBeTruthy();
    expect(screen.getByText("Password is too short")).toBeTruthy();
    expect(screen.getByText("Passwords do not match")).toBeTruthy();

    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(nameInput.getAttribute("aria-describedby")).toBe("name-error");
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-describedby")).toBe("email-error");
    expect(passwordInput.getAttribute("aria-invalid")).toBe("true");
    expect(passwordInput.getAttribute("aria-describedby")).toBe(
      "password-error",
    );
    expect(confirmPasswordInput.getAttribute("aria-invalid")).toBe("true");
    expect(confirmPasswordInput.getAttribute("aria-describedby")).toBe(
      "confirm-password-error",
    );
  });

  it("disables submit button and updates label while pending", async () => {
    await renderWithState({ status: "idle" }, true);

    const submitButton = screen.getByRole("button", {
      name: /creating account/i,
    });

    expect(submitButton.hasAttribute("disabled")).toBe(true);
  });
});
