import { SiteImage } from "./site-image";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Site } from "./api";
import { CreativeScene, TextReveal } from "./creative";
export function Collections({ site }: { site: Site }) {
  return (
    <section
      className="container section collections"
      aria-labelledby="collections-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">THREE DEPARTMENTS. ONE CONVERSATION.</p>
          <h2 id="collections-title">
            <TextReveal text="Explore the collections." />
          </h2>
        </div>
        <Link className="text-link" to="/products">
          View all products <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="collection-grid">
        {(["Men", "Women", "Kids"] as const).map((department, i) => {
          const image =
            site["collection" + department + "Image"] ||
            site.categories.find(
              (category) => category.department === department,
            )?.image;
          const count = site.categories.filter(
            (category) => category.department === department,
          ).length;
          return (
            <Link
              key={department}
              className={
                "collection-card collection-" + department.toLowerCase()
              }
              to={"/products?department=" + department}
            >
              <div className="collection-visual">
                {image ? (
                  <SiteImage
                    src={image}
                    alt={
                      site.demoMode
                        ? `Stock ${department.toLowerCase()} apparel photograph for demonstration only`
                        : `${department} apparel collection`
                    }
                    width={700}
                    height={900}
                    loading="lazy"
                  />
                ) : (
                  <SiteImage src="" alt={`${department} collection`} width={700} height={900} loading="lazy" />
                )}
                <span className="collection-index">0{i + 1}</span>
              </div>
              <CreativeScene
                variant={department.toLowerCase() as "men" | "women" | "kids"}
                className="department-accent"
                size={department === "Women" ? 86 : 64}
                intensity={0.6}
                speed={0.8}
              />
              <div className="collection-caption">
                <div>
                  <h3>{department}</h3>
                  <p>
                    {count
                      ? "Explore the published collection"
                      : "Discuss your collection requirements"}
                  </p>
                </div>
                <span className="collection-arrow" aria-hidden="true">
                  <ArrowUpRight size={24} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
