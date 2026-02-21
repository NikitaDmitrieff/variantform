import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1a1c20]">
      <Sidebar />
      <div className="pl-[68px]">
        <Header />
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
