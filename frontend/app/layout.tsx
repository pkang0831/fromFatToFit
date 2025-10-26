import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "From Fat To Fit Dashboard",
  description: "Track meals and stay motivated"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
