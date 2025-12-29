type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "creator" | "viewer";
  isActive: boolean;
  createdAt: string;
};

type UserListProps = {
  users: UserListItem[];
};

const formatDate = (value: string) => value.slice(0, 10);

const UserList = ({ users }: UserListProps) => {
  if (users.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-[#2D2A26]">No users yet</h2>
        <p className="mt-2 text-sm text-[#6B635B]">
          Create the first account to invite someone into TravelBlogs.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {users.map((user) => (
        <article
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-5 py-4"
        >
          <div>
            <h3 className="text-base font-semibold text-[#2D2A26]">
              {user.name}
            </h3>
            <p className="text-sm text-[#6B635B]">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#2D2A26]">
            <span className="rounded-full border border-[#1F6F78]/20 bg-[#1F6F78]/10 px-3 py-1 text-[#1F6F78]">
              {user.role}
            </span>
            <span className="rounded-full border border-black/10 bg-[#F2ECE3] px-3 py-1 text-[#2D2A26]">
              {user.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-[#6B635B]">
              Added {formatDate(user.createdAt)}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
};

export default UserList;
