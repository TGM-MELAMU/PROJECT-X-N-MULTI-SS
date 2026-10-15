import Image from "next/image";
import { canOptimise } from "@/lib/images";
import { cn } from "@/lib/cn";

/**
 * A product photo that fills its parent (the parent must be `position: relative` and have a size).
 * Photos on a host listed in NEXT_PUBLIC_IMAGE_HOSTS (or in /public) are resized and served as AVIF/WebP;
 * any other https photo is shown as a normal lazy-loaded image so an unlisted host never breaks the page.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (canOptimise(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className={cn("absolute inset-0", className)} />
  );
}
