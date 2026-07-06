import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "กบห-ธ. | ระบบบันทึกการฝึกงาน กฟผ. สำนักงานไทรน้อย",
  description: "ระบบบันทึกรายงานประจำวันสำหรับนักศึกษาฝึกงาน กองบริหาร การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย สำนักงานไทรน้อย",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={geist.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
