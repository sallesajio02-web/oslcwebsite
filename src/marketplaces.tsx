import { useSite } from "./public";

export function MarketplaceStrip() {
  const site = useSite();
  const platforms = [
    {
      name: "Amazon",
      key: "marketplaceAmazonUrl",
      style: "amazon",
      url: "https://www.amazon.in/?utm_source=chatgpt.com",
      description: "Everyday finds & more",
    },
    {
      name: "Flipkart",
      key: "marketplaceFlipkartUrl",
      style: "flipkart",
      url: "https://www.flipkart.com/?utm_source=chatgpt.com",
      description: "Discover something new",
    },
    {
      name: "Myntra",
      key: "marketplaceMyntraUrl",
      style: "myntra",
      url: "https://www.myntra.com/?utm_source=chatgpt.com",
      description: "Fashion & personal style",
    },
    {
      name: "AJIO",
      key: "marketplaceAjioUrl",
      style: "ajio",
      url: "https://www.ajio.com/?utm_source=chatgpt.com",
      description: "Explore fashion & lifestyle",
    },
    {
      name: "Meesho",
      key: "marketplaceMeeshoUrl",
      style: "meesho",
      url: "https://www.meesho.com/?utm_source=chatgpt.com",
      description: "Fresh everyday inspiration",
    },
  ];
  return (
    <section
      className="marketplace-strip"
      aria-label="Explore e-commerce platforms"
    >
      <div className="marketplace-inner">
        <ul className="marketplace-platforms">
          {platforms.map((p) => (
            <li key={p.key}>
              <a
                href={site[p.key] || p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={"Visit " + p.name + " (opens in a new tab)"}
              >
                <img
                  className={"marketplace-logo " + p.style}
                  src={"/marketplaces/" + p.style + ".webp"}
                  alt={p.name + " logo"}
                  width={180}
                  height={100}
                  loading="lazy"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
