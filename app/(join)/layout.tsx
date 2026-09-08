export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
      {children}
    </div>
  );
}
