import { AuthGate } from "../../components/AuthGate";
import { Sidebar } from "../../components/Sidebar";
import { TopBar } from "../../components/TopBar";
import { SidebarProvider } from "../../components/SidebarContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <SidebarProvider>
        <div className="flex min-h-screen bg-slate-100">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGate>
  );
}
