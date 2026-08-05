// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./Confirm-dialog";

// Mock dependencies for isolated testing
const mockOnConfirm = vi.fn();
const mockOnCancel = vi.fn();

describe("ConfirmDialog", () => {
  const defaultProps = {
    message: "Are you sure you want to perform this action?",
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  // Utility function to render the component with standard props
  const renderComponent = (props = defaultProps) =>
    render(<ConfirmDialog {...props} />);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders correctly with default values", () => {
    renderComponent(defaultProps);

    // Check if the message is displayed
    expect(screen.getByText(defaultProps.message)).toBeTruthy();

    // Check for Confirm Button (Default label: Delete)
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    expect(confirmButton).toBeTruthy();

    // Check for Cancel Button
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeTruthy();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    renderComponent(defaultProps);

    // Querying by the default label text name
    const confirmButton = screen.getByRole("button", { name: "Delete" });

    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    renderComponent(defaultProps);

    // Querying by visible text name
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when pressing the Escape key", () => {
    renderComponent(defaultProps);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("handles custom confirm labels correctly", () => {
    const customProps = {
      ...defaultProps,
      message: "Are you sure?",
      confirmLabel: "Yes, proceed!",
    };

    renderComponent(customProps);

    // Check if the message is updated
    expect(screen.getByText("Are you sure?")).toBeTruthy();

    // Querying by the custom label text name
    const confirmButton = screen.getByRole("button", { name: "Yes, proceed!" });
    expect(confirmButton).toBeTruthy();
  });
});
