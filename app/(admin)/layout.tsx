export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 bg-sidebar text-sidebar-foreground md:block">
        <div className="px-4 py-4 font-heading text-sm font-semibold">
          Admin
        </div>
        <nav className="space-y-1 px-2 text-sm">
          <a className="block rounded-md px-2 py-1.5 hover:bg-sidebar-accent" href="/admin">
            Dashboard
          </a>
          <a
            className="block rounded-md px-2 py-1.5 text-sidebar-foreground/80"
            href="/admin"
          >
            Courses
          </a>
          <a
            className="block rounded-md px-2 py-1.5 text-sidebar-foreground/80"
            href="/admin"
          >
            Users
          </a>
          <a
            className="block rounded-md px-2 py-1.5 text-sidebar-foreground/80"
            href="/admin"
          >
            Offers
          </a>
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
