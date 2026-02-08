"use client";

// Force recompile - video support added
import { useMemo } from "react";
import Image from "next/image";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

import type { EntryReaderMedia } from "../../utils/entry-reader";
import { getTiptapExtensions } from "../../utils/tiptap-config";
import { getMediaTypeFromUrl, shouldOptimizeImageUrl } from "../../utils/media";
import EntryImage from "../../utils/tiptap-entry-image-extension";
import EntryVideo from "../../utils/tiptap-entry-video-extension";

type EntryImageNodeOptions = {
  mediaMap: Map<string, EntryReaderMedia>;
  fallbackAlt: string;
  openImageLabel: string;
  resolveAltText: (alt?: string | null) => string | null;
  onImageClick?: (url: string) => void;
};

type EntryVideoNodeOptions = {
  mediaMap: Map<string, EntryReaderMedia>;
  onVideoClick?: (url: string) => void;
};

type EntryReaderRichTextProps = {
  content: string;
  media: EntryReaderMedia[];
  fallbackAlt: string;
  openImageLabel: string;
  onImageClick?: (url: string) => void;
  resolveAltText: (alt?: string | null) => string | null;
};

const isOptimizedImage = (url: string) => shouldOptimizeImageUrl(url);

const EntryImageNodeView = (props: NodeViewProps) => {
  const { entryMediaId, src, alt } = props.node.attrs as {
    entryMediaId?: string | null;
    src?: string | null;
    alt?: string | null;
  };
  const options = props.extension.options as EntryImageNodeOptions;
  const mediaItem =
    entryMediaId && options.mediaMap.has(entryMediaId)
      ? options.mediaMap.get(entryMediaId)
      : undefined;
  const imageUrl = mediaItem?.url ?? src ?? "";

  if (!imageUrl) {
    return null;
  }

  const resolvedAlt =
    options.resolveAltText(alt) ||
    options.resolveAltText(mediaItem?.alt) ||
    options.fallbackAlt;

  const isVideo = getMediaTypeFromUrl(imageUrl) === "video";

  return (
    <NodeViewWrapper className="my-5 overflow-hidden rounded-2xl border border-black/10 bg-[#F2ECE3]">
      <button
        type="button"
        onClick={() => options.onImageClick?.(imageUrl)}
        className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
        aria-label={options.openImageLabel}
      >
        {isVideo ? (
          <video
            src={imageUrl}
            className="h-auto w-full object-cover"
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              video.currentTime = 0.5;
            }}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={resolvedAlt}
            width={mediaItem?.width ?? 1200}
            height={mediaItem?.height ?? 800}
            sizes="100vw"
            className="h-auto w-full object-cover"
            loading="lazy"
            unoptimized={!isOptimizedImage(imageUrl)}
          />
        )}
      </button>
    </NodeViewWrapper>
  );
};

const EntryVideoNodeView = (props: NodeViewProps) => {
  const { entryMediaId, src } = props.node.attrs as {
    entryMediaId?: string | null;
    src?: string | null;
  };
  const options = props.extension.options as EntryVideoNodeOptions;
  const mediaItem =
    entryMediaId && options.mediaMap.has(entryMediaId)
      ? options.mediaMap.get(entryMediaId)
      : undefined;
  const videoUrl = mediaItem?.url ?? src ?? "";

  if (!videoUrl) {
    return null;
  }

  return (
    <NodeViewWrapper className="my-5 overflow-hidden rounded-2xl border border-black/10 bg-[#F2ECE3]">
      <video
        src={videoUrl}
        controls
        preload="metadata"
        playsInline
        className="h-auto w-full"
        onClick={(e) => {
          e.stopPropagation();
          options.onVideoClick?.(videoUrl);
        }}
      >
        Your browser does not support video playback.
      </video>
    </NodeViewWrapper>
  );
};

const buildEntryImageExtension = (options: EntryImageNodeOptions) => {
  return EntryImage.extend({
    addOptions() {
      return options;
    },
    addNodeView() {
      return ReactNodeViewRenderer(EntryImageNodeView);
    },
  }).configure(options);
};

const buildEntryVideoExtension = (options: EntryVideoNodeOptions) => {
  return EntryVideo.extend({
    addOptions() {
      return options;
    },
    addNodeView() {
      return ReactNodeViewRenderer(EntryVideoNodeView);
    },
  }).configure(options);
};

const parseContent = (content: string) => {
  if (!content || !content.trim()) {
    return { type: "doc", content: [] };
  }
  try {
    return JSON.parse(content);
  } catch {
    return { type: "doc", content: [] };
  }
};

const EntryReaderRichText = ({
  content,
  media,
  fallbackAlt,
  openImageLabel,
  onImageClick,
  resolveAltText,
}: EntryReaderRichTextProps) => {
  const mediaMap = useMemo(() => {
    const map = new Map<string, EntryReaderMedia>();
    media.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [media]);

  const entryImageExtension = useMemo(
    () =>
      buildEntryImageExtension({
        mediaMap,
        fallbackAlt,
        openImageLabel,
        onImageClick,
        resolveAltText,
      }),
    [fallbackAlt, mediaMap, onImageClick, openImageLabel, resolveAltText],
  );

  const entryVideoExtension = useMemo(
    () =>
      buildEntryVideoExtension({
        mediaMap,
        onVideoClick: onImageClick, // Reuse image click handler for videos
      }),
    [mediaMap, onImageClick],
  );

  const extensions = useMemo(() => {
    const baseExtensions = getTiptapExtensions().filter(
      (extension) => extension.name !== "entryImage" && extension.name !== "entryVideo",
    );
    return [...baseExtensions, entryImageExtension, entryVideoExtension];
  }, [entryImageExtension, entryVideoExtension]);

  const editor = useEditor({
    extensions,
    content: parseContent(content),
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose max-w-none text-[17px] leading-7 text-[#2D2A26] [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
};

export default EntryReaderRichText;
