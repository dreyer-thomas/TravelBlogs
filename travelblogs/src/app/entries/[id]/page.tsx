import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import EntryReader from "../../../components/entries/entry-reader";
import type { EntryApiData } from "../../../utils/entry-reader";
import { mapEntryToReader } from "../../../utils/entry-reader";

export const dynamic = "force-dynamic";

type EntryPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse = {
  data: EntryApiData | null;
  error: ApiError | null;
};

const loadEntry = async (
  baseUrl: string,
  cookieHeader: string,
  id: string,
): Promise<ApiResponse> => {
  const response = await fetch(`${baseUrl}/api/entries/${id}`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    return {
      data: null,
      error: {
        code: body?.error?.code ?? "UNKNOWN_ERROR",
        message: body?.error?.message ?? "Unable to load entry.",
      },
    };
  }

  return {
    data: (body?.data ?? null) as EntryApiData | null,
    error: null,
  };
};

const EntryPage = async ({ params }: EntryPageProps) => {
  noStore();

  const { id } = await params;

  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  const { data, error } = await loadEntry(baseUrl, cookieHeader, id);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              {error?.message ?? "Unable to load this entry."}
            </p>
          </section>
        </main>
      </div>
    );
  }

  return <EntryReader entry={mapEntryToReader(data)} />;
};

export default EntryPage;
