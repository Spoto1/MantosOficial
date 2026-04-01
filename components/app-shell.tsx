"use client";

import { usePathname } from "next/navigation";

import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CartProvider } from "@/providers/cart-provider";
import { CustomerSessionProvider } from "@/providers/customer-session-provider";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="min-h-screen">
        <main id="main-content">{children}</main>
      </div>
    );
  }

  return (
    <CustomerSessionProvider>
      <CartProvider>
        <div className="min-h-screen">
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
          <CartDrawer />
        </div>
      </CartProvider>
    </CustomerSessionProvider>
  );
}
