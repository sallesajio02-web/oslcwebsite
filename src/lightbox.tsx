import { SiteImage } from "./site-image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Entry } from "./api";

export function PhotoLightbox({
  images,
  selected,
  onSelect,
}: {
  images: Entry[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  const index = images.findIndex((image) => image.id === selected);
  const photo = images[index];
  useEffect(() => {
    if (photo && !dialog.current?.open) {
      trigger.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
      document.body.classList.add("lightbox-open");
    }
  }, [photo]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      document.body.classList.remove("lightbox-open");
    },
    [],
  );
  function close() {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(
      () => {
        dialog.current?.close();
        document.body.classList.remove("lightbox-open");
        onSelect(null);
        setClosing(false);
        trigger.current?.focus({ preventScroll: true });
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160,
    );
  }
  const move = (offset: number) => {
    if (!closing && images.length)
      onSelect(images[(index + offset + images.length) % images.length].id);
  };
  return (
    <dialog
      ref={dialog}
      className={"photo-lightbox" + (closing ? " closing" : "")}
      aria-labelledby="lightbox-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      {photo && (
        <div className="lightbox-panel">
          <div className="lightbox-toolbar">
            <span>
              {index + 1} / {images.length}
            </span>
            <button
              autoFocus
              type="button"
              onClick={close}
              aria-label="Close photograph"
            >
              <X size={22} />
            </button>
          </div>
          <SiteImage key={photo.id} src={photo.image} alt={photo.name} />
          <div className="lightbox-caption">
            <button
              type="button"
              disabled={images.length < 2 || closing}
              onClick={() => move(-1)}
              aria-label="Previous photograph"
            >
              <ChevronLeft />
            </button>
            <div>
              <h2 id="lightbox-title">{photo.name}</h2>
              <p>{photo.description}</p>
            </div>
            <button
              type="button"
              disabled={images.length < 2 || closing}
              onClick={() => move(1)}
              aria-label="Next photograph"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
