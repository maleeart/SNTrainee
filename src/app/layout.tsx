import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "SNTrainee — บันทึกการฝึกงาน กฟผ. สำนักงานไทรน้อย",
  description: "ระบบบันทึกรายงานประจำวันสำหรับนักศึกษาฝึกงาน กองบริหาร การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย สำนักงานไทรน้อย",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={geist.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
