import { useEffect, useState, type ImgHTMLAttributes } from "react";
import udaipurFallback from "@/assets/dest-udaipur.jpg";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SafeImage({ src, fallbackSrc = udaipurFallback, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={failed || !src ? fallbackSrc : src}
      onError={() => setFailed(true)}
    />
  );
}