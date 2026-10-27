import { useState } from "react";
import brandConfig from "../public/brands/brands.json";
export interface Brand {
  id: string;
  name: string;
  logo: string;
  placeholder?: boolean;
  href?: string;
  image?: string;
  imageAlt?: string;
}
function BrandImage({ brand }: { brand: Brand }) {
  const [failedSource, setFailedSource] = useState("");
  return failedSource === brand.logo ? (
    <span className="our-brand-fallback">
      <span>{brand.name}</span>
      <small>Logo awaiting upload</small>
    </span>
  ) : (
    <img
      src={brand.logo}
      alt={
        brand.placeholder
          ? brand.name + " logo placeholder - official artwork awaiting upload"
          : brand.name + " logo"
      }
      width={320}
      height={160}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSource(brand.logo)}
    />
  );
}
function safeLink(href: string | undefined) {
  if (!href) return undefined;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function BrandPanel({ brand, index }: { brand: Brand; index: number }) {
  return (
    <>
      <div className="our-brand-visual">
        {brand.image && (
          <img
            src={brand.image}
            alt={brand.imageAlt || brand.name + " editorial visual"}
            width={500}
            height={650}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="our-brand-number" aria-hidden="true">
          0{index + 1}
        </span>
      </div>
      <div className="our-brand-identity">
        {brand.placeholder ? (
          <>
            <h3>{brand.name}</h3>
            <span className="our-brand-pending">Official logo pending</span>
          </>
        ) : (
          <BrandImage brand={brand} />
        )}
      </div>
    </>
  );
}
export function OurBrands({ brands = brandConfig }: { brands?: Brand[] }) {
  return (
    <section className="our-brands" aria-labelledby="our-brands-title">
      <div className="container">
        <header className="section-heading">
          <div>
            <p className="eyebrow">OUR BRANDS</p>
            <h2 id="our-brands-title">Discover Our Family of Fashion Brands.</h2>
          </div>
        </header>
        <ul
          className="our-brands-row"
          tabIndex={0}
          aria-label="Our six fashion brands; scroll horizontally on smaller screens"
        >
          {brands.map((brand, index) => {
            const href = safeLink(brand.href);
            return (
              <li key={brand.id} className="animated-reveal">
                {href ? (
                  <a
                    className="our-brand-panel"
                    href={href}
                    aria-label={"Explore " + brand.name}
                    {...(href.startsWith("https:")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    <BrandPanel brand={brand} index={index} />
                  </a>
                ) : (
                  <div className="our-brand-panel">
                    <BrandPanel brand={brand} index={index} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="our-brands-note">
          Fashion photographs are illustrative stock images, not verified brand
          products.
          {brands.some((b) => b.placeholder)
            ? " Official brand logos are awaiting upload."
            : ""}
        </p>
      </div>
    </section>
  );
}
