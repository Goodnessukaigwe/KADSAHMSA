export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3 text-sm font-medium">
        Organisation
      </div>
      {children}
    </div>
  );
}
