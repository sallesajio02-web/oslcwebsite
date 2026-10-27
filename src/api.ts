import { useEffect, useState } from "react";
let csrf = "";
export async function api<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (csrf) headers.set("x-csrf-token", csrf);
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Unexpected server response" }));
  if (!response.ok) throw new Error(data.error || "Request failed");
  if (data.csrf) csrf = data.csrf;
  return data;
}
export function useApi<T = any>(url: string, revision = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<T>(url)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [url, revision]);
  return { data, error, loading };
}
export interface Image {
  url: string;
  alt: string;
  position: number;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category_id: string | null;
  category_name: string;
  sizes: string;
  colours: string;
  fabric: string;
  customization: string;
  moq: string;
  images: Image[];
  published: boolean;
  featured: boolean;
  demo: boolean;
}
export interface Entry {
  operation?: "In-house" | "Managed externally" | "To be confirmed";
  id: string;
  name: string;
  slug?: string;
  description: string;
  image: string;
  position: number;
  published: boolean;
  category?: string;
  department?: 'Men' | 'Women' | 'Kids';
}
export interface Site {
  [key: string]: any;
  company: string;
  heroTitle: string;
  heroDescription: string;
  tagline: string;
  about: string;
  quality: string;
  address: string;
  categories: Entry[];
  capabilities: Entry[];
  gallery: Entry[];
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
