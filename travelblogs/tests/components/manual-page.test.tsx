// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

type Role = "administrator" | "creator" | "viewer";

const ManualPageContent = ({ role }: { role: Role }) => {
  const isAdmin = role === "administrator";
  const isCreator = role === "creator" || isAdmin;
  const isViewer = role === "viewer";
  const showContributorSection = true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-3xl space-y-8 rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            Help & Guidance
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">User Manual</h1>
          <p className="text-sm text-[#6B635B]">
            Navigate and use TravelBlogs based on your role and permissions.
          </p>
        </header>

        {isViewer && (
          <section className="space-y-4 border-t border-black/10 pt-6">
            <h2 className="text-xl font-semibold text-[#2D2A26]">
              Viewer Actions
            </h2>
            <p className="text-sm leading-relaxed text-[#6B635B]">
              As a viewer, you can access trips you&apos;ve been invited to and
              explore their content.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
              <li>
                <strong>View Trips:</strong> Navigate to{" "}
                <code className="rounded bg-[#FBF7F1] px-1 py-0.5 text-xs">
                  /trips
                </code>{" "}
                to see trips you have access to.
              </li>
              <li>
                <strong>View Entries:</strong> Click on a trip to see all blog
                entries and media.
              </li>
              <li>
                <strong>Full-Screen Viewer:</strong> Click on an entry or photo
                to view it in full-screen mode with navigation controls.
              </li>
              <li>
                <strong>Trip Overview:</strong> Access the trip overview page
                to see latest entries and trip details.
              </li>
            </ul>
          </section>
        )}

        {showContributorSection && (
          <section className="space-y-4 border-t border-black/10 pt-6">
            <h2 className="text-xl font-semibold text-[#2D2A26]">
              Contributor Actions
            </h2>
            <p className="text-sm leading-relaxed text-[#6B635B]">
              If you have contributor access to a trip (granted by the trip
              owner), you can add and edit blog entries on that trip.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
              <li>
                <strong>Add Entry:</strong> Navigate to the trip page and use
                the &quot;Add Entry&quot; button to create a new blog post with
                title, content, and media.
              </li>
              <li>
                <strong>Edit Entry:</strong> Click on an entry you created or
                have permission to edit, then use the edit controls.
              </li>
              <li>
                <strong>Upload Media:</strong> Use the media upload controls to
                add photos and files to your entries.
              </li>
              <li>
                <strong>Delete Entry:</strong> Remove entries you created using
                the delete option (if permitted by trip owner).
              </li>
            </ul>
          </section>
        )}

        {isCreator && (
          <section className="space-y-4 border-t border-black/10 pt-6">
            <h2 className="text-xl font-semibold text-[#2D2A26]">
              Creator Actions
            </h2>
            <p className="text-sm leading-relaxed text-[#6B635B]">
              As a creator, you can manage your trips, invite users, and
              control sharing settings.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
              <li>
                <strong>Create Trip:</strong> Navigate to{" "}
                <code className="rounded bg-[#FBF7F1] px-1 py-0.5 text-xs">
                  /trips
                </code>{" "}
                and use the &quot;Create Trip&quot; button to start a new
                travel blog.
              </li>
              <li>
                <strong>Edit Trip:</strong> Modify trip metadata like title,
                description, and cover image.
              </li>
              <li>
                <strong>Delete Trip:</strong> Remove trips you own permanently.
              </li>
              <li>
                <strong>Invite Viewers:</strong> Share trips by inviting users
                as viewers or contributors from the trip settings.
              </li>
              <li>
                <strong>Manage Sharing:</strong> Create, regenerate, or revoke
                shareable links for public access.
              </li>
              <li>
                <strong>Transfer Ownership:</strong> Transfer trip ownership to
                another creator.
              </li>
            </ul>
          </section>
        )}

        {isAdmin && (
          <section className="space-y-4 border-t border-black/10 pt-6">
            <h2 className="text-xl font-semibold text-[#2D2A26]">
              Administrator Actions
            </h2>
            <p className="text-sm leading-relaxed text-[#6B635B]">
              As an administrator, you have full access to user management and
              system-wide controls.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
              <li>
                <strong>Create User Accounts:</strong> Add new users to the
                system with assigned roles.
              </li>
              <li>
                <strong>Change User Roles:</strong> Promote or change user
                roles (viewer, creator, administrator).
              </li>
              <li>
                <strong>Deactivate Users:</strong> Disable user accounts to
                revoke access without deletion.
              </li>
              <li>
                <strong>Access All Trips:</strong> View and manage all trips in
                the system regardless of ownership.
              </li>
            </ul>
          </section>
        )}

        <section className="space-y-4 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold text-[#2D2A26]">
            Navigation Tips
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-[#2D2A26]">
            <li>
              Use the <strong>back</strong> buttons to return to previous pages
              (trips list, trip overview).
            </li>
            <li>
              The <strong>shared view</strong> button lets you preview how
              public visitors see your trip.
            </li>
            <li>
              Full-screen viewer includes segmented progress indicators and
              minimal chrome for immersive viewing.
            </li>
          </ul>
        </section>

        <footer className="border-t border-black/10 pt-6 text-center">
          <p className="text-xs text-[#6B635B]">
            Need more help? Contact your administrator or trip owner for
            assistance.
          </p>
        </footer>
      </main>
    </div>
  );
};

describe("ManualPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows viewer and contributor actions for viewer role", () => {
    render(<ManualPageContent role="viewer" />);

    expect(screen.getByText("Viewer Actions")).toBeInTheDocument();
    expect(screen.getByText("Contributor Actions")).toBeInTheDocument();
    expect(screen.queryByText("Creator Actions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Administrator Actions"),
    ).not.toBeInTheDocument();
  });

  it("shows contributor and creator actions for creator role", () => {
    render(<ManualPageContent role="creator" />);

    expect(screen.queryByText("Viewer Actions")).not.toBeInTheDocument();
    expect(screen.getByText("Contributor Actions")).toBeInTheDocument();
    expect(screen.getByText("Creator Actions")).toBeInTheDocument();
    expect(
      screen.queryByText("Administrator Actions"),
    ).not.toBeInTheDocument();
  });

  it("shows all actions except viewer for administrator role", () => {
    render(<ManualPageContent role="administrator" />);

    expect(screen.queryByText("Viewer Actions")).not.toBeInTheDocument();
    expect(screen.getByText("Contributor Actions")).toBeInTheDocument();
    expect(screen.getByText("Creator Actions")).toBeInTheDocument();
    expect(screen.getByText("Administrator Actions")).toBeInTheDocument();
  });

  it("shows viewer-specific content correctly", () => {
    render(<ManualPageContent role="viewer" />);

    expect(screen.getByText(/View Trips:/)).toBeInTheDocument();
    expect(screen.getByText(/View Entries:/)).toBeInTheDocument();
    expect(screen.getByText(/Full-Screen Viewer:/)).toBeInTheDocument();
    expect(screen.getByText(/Trip Overview:/)).toBeInTheDocument();
  });

  it("shows contributor-specific content for creator role", () => {
    render(<ManualPageContent role="creator" />);

    expect(screen.getByText(/Add Entry:/)).toBeInTheDocument();
    expect(screen.getByText(/Edit Entry:/)).toBeInTheDocument();
    expect(screen.getByText(/Upload Media:/)).toBeInTheDocument();
    expect(screen.getByText(/Delete Entry:/)).toBeInTheDocument();
  });

  it("shows creator-specific content for creator role", () => {
    render(<ManualPageContent role="creator" />);

    expect(screen.getByText(/Create Trip:/)).toBeInTheDocument();
    expect(screen.getByText(/Edit Trip:/)).toBeInTheDocument();
    expect(screen.getByText(/Delete Trip:/)).toBeInTheDocument();
    expect(screen.getByText(/Invite Viewers:/)).toBeInTheDocument();
    expect(screen.getByText(/Manage Sharing:/)).toBeInTheDocument();
    expect(screen.getByText(/Transfer Ownership:/)).toBeInTheDocument();
  });

  it("shows administrator-specific content for administrator role", () => {
    render(<ManualPageContent role="administrator" />);

    expect(screen.getByText(/Create User Accounts:/)).toBeInTheDocument();
    expect(screen.getByText(/Change User Roles:/)).toBeInTheDocument();
    expect(screen.getByText(/Deactivate Users:/)).toBeInTheDocument();
    expect(screen.getByText(/Access All Trips:/)).toBeInTheDocument();
  });

  it("shows navigation tips for all authenticated users", () => {
    render(<ManualPageContent role="viewer" />);

    expect(screen.getByText("Navigation Tips")).toBeInTheDocument();
    expect(screen.getByText(/back/i)).toBeInTheDocument();
    expect(screen.getByText(/shared view/i)).toBeInTheDocument();
  });

  it("shows support footer for all authenticated users", () => {
    render(<ManualPageContent role="creator" />);

    expect(
      screen.getByText(/Need more help\? Contact your administrator/),
    ).toBeInTheDocument();
  });

  it("shows manual header for all authenticated users", () => {
    render(<ManualPageContent role="viewer" />);

    expect(screen.getByText("User Manual")).toBeInTheDocument();
    expect(
      screen.getByText(/Navigate and use TravelBlogs based on your role/),
    ).toBeInTheDocument();
  });
});
