import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: { default: "Pleiades — News for your agents", template: "%s · Pleiades" },
    description: "Connect your agent to fresh news. Follow the topics that matter, catch new developments, and go straight to the original reporting.",
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
