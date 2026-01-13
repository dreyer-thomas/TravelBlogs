"use client";

import { useMemo, useState } from "react";

import { normalizeTagName, tagMaxLength } from "../../utils/entry-tags";

type EntryTagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  t: (key: string) => string;
};

const EntryTagInput = ({
  value,
  onChange,
  suggestions,
  t,
}: EntryTagInputProps) => {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizedSelected = useMemo(() => {
    const set = new Set<string>();
    value.forEach((tag) => set.add(normalizeTagName(tag)));
    return set;
  }, [value]);

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = normalizeTagName(query);
    const matches = suggestions.filter((tag) => {
      const normalized = normalizeTagName(tag);
      if (!normalized || normalizedSelected.has(normalized)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return normalized.includes(normalizedQuery);
    });
    return matches.slice(0, 6);
  }, [normalizedSelected, query, suggestions]);

  const commitTag = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }
    const normalized = normalizeTagName(trimmed);
    if (normalizedSelected.has(normalized)) {
      setError(t("entries.tagAlreadyAdded"));
      return;
    }
    setError(null);
    onChange([...value, trimmed]);
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTag(query);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
    setError(null);
  };

  return (
    <label className="block text-sm text-[#2D2A26]">
      {t("entries.tags")}
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            maxLength={tagMaxLength}
            placeholder={t("entries.addTagPlaceholder")}
            className="min-w-[12rem] flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          />
          <button
            type="button"
            onClick={() => commitTag(query)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-black/5"
          >
            {t("entries.addTag")}
          </button>
        </div>
        {filteredSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => commitTag(suggestion)}
                className="rounded-full border border-[#1F6F78]/30 bg-[#1F6F78]/10 px-3 py-1 text-xs font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/20"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`${t("entries.removeTag")} ${tag}`}
                  className="text-[#B34A3C] transition hover:text-[#8F3328]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-xs text-[#B34A3C]">{error}</p> : null}
      </div>
    </label>
  );
};

export default EntryTagInput;
