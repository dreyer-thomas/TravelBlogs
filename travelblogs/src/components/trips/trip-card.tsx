import Image from "next/image";
import Link from "next/link";

import { isCoverImageUrl } from "../../utils/media";

type TripCardProps = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const TripCard = ({
  id,
  title,
  startDate,
  endDate,
  coverImageUrl,
}: TripCardProps) => {
  return (
    <Link
      href={`/trips/${id}`}
      className="group rounded-2xl border border-black/10 bg-white p-5 transition hover:border-[#1F6F78]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40"
    >
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-[#F2ECE3]">
          {coverImageUrl && isCoverImageUrl(coverImageUrl) ? (
            <Image
              src={coverImageUrl}
              alt={`Cover for ${title}`}
              fill
              sizes="112px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
              Trip
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[#2D2A26]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#6B635B]">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
        </div>
        <span className="rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
          Active
        </span>
      </div>
    </Link>
  );
};

export default TripCard;
