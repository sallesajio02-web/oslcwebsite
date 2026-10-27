import { SiteImage } from "./site-image";
import { Pagination as PageNavigation } from "./ui";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Swiper as SwiperInstance } from "swiper";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import { A11y, Autoplay, Pagination, Keyboard } from "swiper/modules";
import { useSite, Meta, PageHead, Banner } from "./public";
interface Employee {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
}
const samples: Employee[] = [
  ["Nisha Mehta", "Production Coordinator"],
  ["Vikram Joshi", "Quality Associate"],
  ["Priya Shah", "Design Associate"],
  ["Karan Desai", "Operations Associate"],
  ["Anjali Patel", "People & Administration"],
  ["Riya Shah", "Merchandising Associate"],
  ["Dev Mehta", "Warehouse Coordinator"],
  ["Kavya Joshi", "Fabric Associate"],
  ["Arjun Patel", "Finishing Associate"],
  ["Neha Desai", "Accounts Associate"],
  ["Rahul Shah", "Packing Coordinator"],
  ["Isha Mehta", "Team Support Associate"],
].map(([name, role], i) => ({
  id: "demo-employee-" + i,
  name,
  role,
  image: `/demo/portraits/employee-${i}.webp`,
  description:
    "Fictional sample profile: supporting collaboration, thoughtful workmanship and everyday progress. Replace with a company-approved biography.",
}));
export function EmployeesSection({ fullPage = false }: { fullPage?: boolean }) {
  const site = useSite();
  const [page, setPage] = useState(1);
  const slider = useRef<SwiperInstance | null>(null);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const swiper = slider.current;
    if (!swiper || swiper.destroyed) return;
    if (reduced || paused || focused || hovered) swiper.autoplay.stop();
    else swiper.autoplay.start();
  }, [reduced, paused, focused, hovered]);
  const real: Employee[] = site.employees || [];
  const demo = !!import.meta.env?.DEV && site.demoMode && !real.length;
  const people = demo ? samples : real;
  const pages = Math.ceil(people.length / 9);
  const currentPage = Math.min(page, Math.max(1, pages));
  const visiblePeople = people.slice((currentPage - 1) * 9, currentPage * 9);
  return (
    <section
      className="employees-section section"
      aria-labelledby="employees-heading"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUR PEOPLE / OUR STRENGTH</p>
            <h2 id="employees-heading">The team behind every detail.</h2>
            <p>People, perspectives and a shared commitment to the work.</p>
          </div>
          {!fullPage && (
            <Link className="text-link" to="/teams">
              Meet Our Teams
            </Link>
          )}
        </div>
        {demo && (
          <p className="team-demo-note">
            DEMO PROFILES - Fictional names and roles for local preview. These
            are not OSLC employees.
          </p>
        )}
        {people.length ? (
          fullPage ? (
            <>
              <div className="employees-grid">
                {visiblePeople.map((person, index) => (
                  <EmployeeCard
                    key={person.id}
                    person={person}
                    index={index}
                    demo={demo}
                  />
                ))}
              </div>
              <PageNavigation
                page={currentPage}
                pages={pages}
                onChange={(next) => {
                  setPage(next);
                  document
                    .getElementById("employees-heading")
                    ?.scrollIntoView({
                      block: "start",
                      behavior: reduced ? "instant" : "smooth",
                    });
                }}
              />
            </>
          ) : (
            <Swiper
              className="employee-swiper"
              modules={[Autoplay, Pagination, A11y, Keyboard]}
              onSwiper={(instance) => {
                slider.current = instance;
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setFocused(false);
              }}
              autoplay={
                reduced
                  ? false
                  : {
                      delay: 3500,
                      disableOnInteraction: false,
                      pauseOnMouseEnter: true,
                    }
              }
              rewind
              slidesPerView={1}
              spaceBetween={28}
              pagination={{ clickable: true }}
              keyboard={{ enabled: true, onlyInViewport: true }}
              speed={reduced ? 0 : 450}
              watchOverflow
              breakpoints={{
                560: { slidesPerView: 2 },
                1000: { slidesPerView: 3 },
                1400: { slidesPerView: 4 },
              }}
              a11y={{
                containerMessage: "OSLC employee profiles",
                prevSlideMessage: "Previous employee profiles",
                nextSlideMessage: "Next employee profiles",
                paginationBulletMessage: "Go to employee group {{index}}",
              }}
            >
              {people.map((p, i) => (
                <SwiperSlide key={p.id}>
                  <EmployeeCard person={p} index={i} demo={demo} />
                </SwiperSlide>
              ))}
              <EmployeeControls
                slot="container-end"
                paused={paused}
                reduced={reduced}
                onToggle={() => setPaused((value) => !value)}
              />
            </Swiper>
          )
        ) : (
          <div className="people-placeholder">
            <h3>Meet our team, soon.</h3>
            <p>
              Company-approved employee profiles will appear here when
              available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
function EmployeeCard({
  person: p,
  index: i,
  demo,
}: {
  person: Employee;
  index: number;
  demo: boolean;
}) {
  return (
    <article className="employee-profile">
      <div className={"employee-portrait tone-" + (i % 4)}>
        {p.image ? (
          <SiteImage
            src={p.image}
            alt={demo ? "Stock portrait for fictional demo profile " + p.name : p.name}
            width={500}
            height={600}
            loading="lazy"
          />
        ) : (
          <SiteImage src="" alt={`${p.name} portrait`} width={500} height={600} loading="lazy" />
        )}
      </div>
      <div className="employee-copy">
        {demo && <p className="sample-photo-caption">Sample portrait - not an OSLC employee</p>}
        <p className="eyebrow">{p.role}</p>
        <h3>{p.name}</h3>
        <p>{p.description}</p>
      </div>
    </article>
  );
}
function EmployeeControls({
  paused,
  reduced,
  onToggle,
}: {
  slot?: string;
  paused: boolean;
  reduced: boolean;
  onToggle: () => void;
}) {
  const swiper = useSwiper();
  return (
    <div className="employee-controls">
      {!reduced && (
        <button
          className="employee-autoplay"
          type="button"
          onClick={onToggle}
          aria-label={
            paused
              ? "Start automatic employee scrolling"
              : "Pause automatic employee scrolling"
          }
        >
          {paused ? (
            <Play size={17} aria-hidden="true" />
          ) : (
            <Pause size={17} aria-hidden="true" />
          )}
        </button>
      )}
      <div className="employee-arrows">
        <button
          type="button"
          onClick={() => swiper.slidePrev()}
          aria-label="Previous employee profiles"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => swiper.slideNext()}
          aria-label="Next employee profiles"
        >
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
export function Teams() {
  return (
    <>
      <Meta title="Teams" />
      <PageHead
        label="TOGETHER AT OSLC"
        title="Our people. Our teams."
        description="Meet the people who bring care and collaboration to our company."
      />
      <EmployeesSection fullPage />
      <Banner />
    </>
  );
}
