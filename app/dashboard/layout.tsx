import AnimatedBackgroundDashboard from "../components/AnimatedBackgroundDashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnimatedBackgroundDashboard />
      {children}
    </>
  );
}
