import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "KinSvarmo",
  description: "Scientific agent marketplace and execution platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
