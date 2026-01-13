// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import EntryTagInput from "../../src/components/entries/entry-tag-input";
import { LocaleProvider } from "../../src/utils/locale-context";
import { useTranslation } from "../../src/utils/use-translation";

const TagHarness = ({
  suggestions,
  initialTags = [],
}: {
  suggestions: string[];
  initialTags?: string[];
}) => {
  const { t } = useTranslation();
  const [tags, setTags] = useState<string[]>(initialTags);
  return (
    <EntryTagInput
      value={tags}
      onChange={setTags}
      suggestions={suggestions}
      t={t}
    />
  );
};

const renderWithLocale = (component: JSX.Element) =>
  render(<LocaleProvider>{component}</LocaleProvider>);

describe("EntryTagInput", () => {
  it("adds tags and prevents duplicates", () => {
    renderWithLocale(<TagHarness suggestions={["Beach", "Sunset"]} />);

    const input = screen.getByLabelText(/tags/i);
    const addButton = screen.getByRole("button", { name: /add tag/i });

    fireEvent.change(input, { target: { value: "Beach" } });
    fireEvent.click(addButton);

    expect(screen.getByText("Beach")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "beach" } });
    fireEvent.click(addButton);

    expect(screen.getAllByText("Beach")).toHaveLength(1);
    expect(screen.getByText("Tag already added.")).toBeInTheDocument();
  });

  it("allows selecting a suggestion", () => {
    renderWithLocale(<TagHarness suggestions={["Sunset", "Forest"]} />);

    const input = screen.getByLabelText(/tags/i);
    fireEvent.change(input, { target: { value: "Sun" } });

    const suggestion = screen.getByRole("button", { name: "Sunset" });
    fireEvent.click(suggestion);

    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });
});
