import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ระบบบันทึกการฝึกงาน กบห-ธ. กฟผ.",
    short_name: "กบห-ธ.",
    description: "ระบบบันทึกรายงานการฝึกงาน สำนักงานไทรน้อย กฟผ.",
    start_url: "/",
    display: "standalone",
    background_color: "#003E8E",
    theme_color: "#003E8E",
    icons: [
      { src: "/logi.png", sizes: "192x192", type: "image/png" },
      { src: "/logi.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
