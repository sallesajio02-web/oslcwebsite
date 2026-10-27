import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import type { Site } from "./api";

const navigationGroups = [
  { id: "company", label: "Company", links: [
    ["/about", "About OSLC"], ["/leadership", "Leadership & Team"], ["/teams", "Teams"],
  ] },
  { id: "capabilities", label: "Capabilities", links: [
    ["/capabilities", "Our Capabilities"], ["/manufacturing", "Manufacturing"], ["/quality", "Quality & Values"],
  ] },
  { id: "updates", label: "Updates", links: [
    ["/gallery", "Gallery"], ["/news", "Company News & Events"],
  ] },
];
export function SiteHeader({ site }: { site: Site }) {
  const [menu, setMenu] = useState(false),
    [dropdown, setDropdown] = useState<string | false>(false),
    [mobile, setMobile] = useState(
      () => window.matchMedia("(max-width: 1100px)").matches,
    ),
    [scrolled, setScrolled] = useState(false);
  const header = useRef<HTMLElement>(null),
    sentinel = useRef<HTMLDivElement>(null),
    toggle = useRef<HTMLButtonElement>(null),
    collectionToggle = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    setDropdown(false);
  }, [location.key]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1100px)");
    const change = () => {
      setMobile(media.matches);
      setMenu(false);
      setDropdown(false);
    };
    media.addEventListener("change", change);
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setMenu(false);
        setDropdown(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) =>
            setScrolled(!entry.isIntersecting),
          )
        : null;
    if (sentinel.current) observer?.observe(sentinel.current);
    return () => {
      media.removeEventListener("change", change);
      document.removeEventListener("pointerdown", outside);
      observer?.disconnect();
    };
  }, []);
  return (
    <>
      <div className="nav-sentinel" ref={sentinel} aria-hidden="true" />
      <header
        className={"header" + (scrolled ? " scrolled" : "")}
        ref={header}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (dropdown) {
              setDropdown(false);
              collectionToggle.current?.focus();
            } else {
              setMenu(false);
              toggle.current?.focus();
            }
          }
        }}
      >
        <Link className="wordmark" to="/" aria-label={site.company + " home"}>
          {site.logoImage ? (
            <img
              className="brand-logo"
              src={site.logoImage}
              alt={site.company + " — Om Sai Latest Creation"}
              width={180}
              height={80}
            />
          ) : (
            <>
              {site.company}
              <small>OM SAI LATEST CREATION</small>
            </>
          )}
        </Link>
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="site-navigation"
          onClick={() => {
            setMenu(!menu);
            setDropdown(false);
          }}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav
          id="site-navigation"
          className={menu ? "open" : ""}
          aria-label="Main navigation"
          inert={mobile && !menu}
          aria-hidden={mobile && !menu ? true : undefined}
        >
          <NavLink to="/" end>Home</NavLink>
          {navigationGroups.map(group => {
            const open = dropdown === group.id;
            const active = group.links.some(([url]) =>
              location.pathname === url || location.pathname.startsWith(url + "/"));
            return (
              <div key={group.id} className="header-nav-group"
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDropdown(current => current === group.id ? false : current);
                }}>
                <button type="button"
                  className={"header-submenu-toggle" + (active ? " active" : "")}
                  aria-expanded={open}
                  aria-controls={`header-submenu-${group.id}`}
                  onClick={event => {
                    collectionToggle.current = event.currentTarget;
                    setDropdown(open ? false : group.id);
                  }}
                  onKeyDown={event => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      collectionToggle.current = event.currentTarget;
                      setDropdown(group.id);
                      requestAnimationFrame(() => {
                        document.getElementById(`header-submenu-${group.id}`)?.querySelector("a")?.focus();
                      });
                    }
                  }}>
                  {group.label} <ChevronDown size={14} aria-hidden="true" />
                </button>
                <div id={`header-submenu-${group.id}`}
                  className="header-submenu" hidden={!open}>
                  {group.links.map(([url, name]) => (
                    <NavLink key={url} to={url}>{name}<ArrowUpRight size={14} aria-hidden="true" /></NavLink>
                  ))}
                </div>
              </div>
            );
          })}
          <NavLink to="/careers">Careers</NavLink>
          <Link className="button" to="/contact">
            Get in Touch <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
    </>
  );
}
