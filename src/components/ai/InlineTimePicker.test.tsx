import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineTimePicker } from "./InlineTimePicker";

afterEach(() => {
  cleanup();
});

describe("InlineTimePicker", () => {
  it("renderiza apenas o campo de horario especifico", () => {
    render(<InlineTimePicker onSelect={vi.fn()} />);

    expect(screen.getByLabelText("Horário específico")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar horário" })).toBeTruthy();
    expect(screen.queryByText("Manhã")).toBeNull();
    expect(screen.queryByText("Tarde")).toBeNull();
    expect(screen.queryByText("Noite")).toBeNull();
  });

  it("envia o horario selecionado", () => {
    const onSelect = vi.fn();
    render(<InlineTimePicker onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("Horário específico"), {
      target: { value: "13:21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar horário" }));

    expect(onSelect).toHaveBeenCalledWith("13:21", "13:21");
    expect(screen.getByText("Horário selecionado ✓")).toBeTruthy();
  });
});
