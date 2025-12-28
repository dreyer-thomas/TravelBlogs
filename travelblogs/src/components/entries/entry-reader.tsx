import Image from "next/image";

import MediaGallery from "../media/media-gallery";
import { parseEntryContent } from "../../utils/entry-content";
import type { EntryReaderData } from "../../utils/entry-reader";

type EntryReaderProps = {
  entry: EntryReaderData;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryReader = ({ entry }: EntryReaderProps) => {
  const heroMedia = entry.media[0];
  const galleryItems = entry.media.slice(1);
  const contentBlocks = parseEntryContent(entry.body ?? "");
  const hasBodyContent =
    contentBlocks.some(
      (block) => block.type === "text" && block.value.trim(),
    ) || contentBlocks.some((block) => block.type === "image");

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            {formatDate(entry.createdAt)}
          </p>
          <h1 className="text-4xl font-semibold text-[#2D2A26] sm:text-5xl">
            {entry.title || "Daily entry"}
          </h1>
        </header>

        <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          {heroMedia ? (
            <Image
              src={heroMedia.url}
              alt={heroMedia.alt ?? "Entry hero media"}
              width={heroMedia.width ?? 1600}
              height={heroMedia.height ?? 1000}
              sizes="(min-width: 1024px) 960px, 100vw"
              className="h-auto w-full object-cover"
              loading="lazy"
              unoptimized={!isOptimizedImage(heroMedia.url)}
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center bg-[#F2ECE3] text-sm text-[#6B635B]">
              No media available for this entry yet.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-[42rem] space-y-5">
            {hasBodyContent ? (
              contentBlocks.map((block, index) => {
                if (block.type === "image") {
                  return (
                    <div
                      key={`entry-inline-image-${block.url}-${index}`}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-[#F2ECE3]"
                    >
                      <Image
                        src={block.url}
                        alt={block.alt || "Entry photo"}
                        width={1200}
                        height={800}
                        sizes="100vw"
                        className="h-auto w-full object-cover"
                        loading="lazy"
                        unoptimized={!isOptimizedImage(block.url)}
                      />
                    </div>
                  );
                }

                return block.value
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, paragraphIndex) => (
                    <p
                      key={`entry-paragraph-${index}-${paragraphIndex}`}
                      className="text-[17px] leading-7 text-[#2D2A26]"
                    >
                      {paragraph}
                    </p>
                  ));
              })
            ) : (
              <p className="text-[17px] leading-7 text-[#6B635B]">
                No entry text yet.
              </p>
            )}
          </div>
        </section>

        {galleryItems.length > 0 ? (
          <MediaGallery items={galleryItems} />
        ) : null}
      </main>
    </div>
  );
};

export default EntryReader;
