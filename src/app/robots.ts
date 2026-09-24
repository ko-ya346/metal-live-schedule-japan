import type { MetadataRoute } from "next";
import { siteUrl } from "./site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: "/admin/",
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: "/admin/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: "/admin/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
