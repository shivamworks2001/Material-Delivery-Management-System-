import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Sunshine Engineering | Delivery Workspace", description: "Sunshine Engineering material delivery management" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
