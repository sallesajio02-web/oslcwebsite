import { useState, type ImgHTMLAttributes } from "react";

/** Display a clearly labelled local placeholder for missing or broken photos. */
export function SiteImage({ src, alt, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string>();
  const placeholder = !src?.trim() || failedSource === src;
  return <img {...props} src={placeholder ? "/placeholder.svg" : src}
    alt={placeholder ? `Image placeholder${alt ? ` for ${alt}` : ""}` : alt}
    onError={event => {
      if (!placeholder) setFailedSource(src);
      onError?.(event);
    }} />;
}
