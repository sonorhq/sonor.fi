import { useEffect, useRef, useState, type ReactNode } from "react";
import { GROUP_SELECTOR, ZOOM_SELECTOR, isPlainClick, wrapIndex, type ZoomItem } from "../lightbox";

/**
 * A screenshot that opens large. It is a real link to the image file, so it works without JavaScript;
 * the Lightbox in the layout takes the click over once the page has hydrated.
 */
export function Zoomable({ className, src, alt, caption, children }: { className?: string; src: string; alt: string; caption?: string; children: ReactNode }) {
  return (
    // data-vike="false" keeps Vike's router from taking the click first: the lightbox takes it instead.
    <a className={["zoom", className].filter(Boolean).join(" ")} href={src} data-zoom="" data-caption={caption} aria-label={`Enlarge: ${alt}`} data-vike="false">
      {children}
      <span className="zoom-hint" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5" />
        </svg>
      </span>
    </a>
  );
}

// What the dialog shows for a trigger, read from its markup so the triggers need no state of their own.
function itemOf(anchor: HTMLAnchorElement): ZoomItem {
  const img = anchor.querySelector("img");
  return {
    src: anchor.getAttribute("href") ?? "",
    alt: img?.getAttribute("alt") ?? "",
    caption: anchor.dataset.caption ?? "",
    width: Number(img?.getAttribute("width")) || 0,
    height: Number(img?.getAttribute("height")) || 0,
  };
}

/** The one dialog of the site, mounted in the layout. It listens on the document, so every Zoomable works. */
export function Lightbox() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement | null>(null);
  const [items, setItems] = useState<ZoomItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const open = (anchor: HTMLAnchorElement) => {
      const group = anchor.closest(GROUP_SELECTOR);
      const anchors = group ? Array.from(group.querySelectorAll<HTMLAnchorElement>(ZOOM_SELECTOR)) : [anchor];
      trigger.current = anchor;
      setIndex(Math.max(0, anchors.indexOf(anchor)));
      setItems(anchors.map(itemOf));
    };
    const triggerOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLAnchorElement>(ZOOM_SELECTOR) : null);
    const onClick = (event: MouseEvent) => {
      const anchor = triggerOf(event.target);
      // Without showModal the link keeps working as a link.
      if (!anchor || !isPlainClick(event) || typeof dialog.current?.showModal !== "function") return;
      event.preventDefault();
      open(anchor);
    };
    // Enter on a link is a click already; Space is not, so it is handled here.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " || !(event.target instanceof HTMLAnchorElement) || !event.target.matches(ZOOM_SELECTOR)) return;
      if (typeof dialog.current?.showModal !== "function") return;
      event.preventDefault();
      open(event.target);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Opened after the render that put the picture and the Close button in, so the button takes the focus.
  useEffect(() => {
    if (items.length === 0 || !dialog.current || dialog.current.open) return;
    document.documentElement.classList.add("lightbox-open");
    dialog.current.showModal();
  }, [items]);

  const item = items[index];
  const close = () => dialog.current?.close();
  const step = (delta: number) => setIndex((current) => wrapIndex(current, items.length, delta));
  // Runs for the button, the backdrop and Esc alike: the dialog's own close event.
  const onClose = () => {
    // The close event is queued, so it can arrive after a reopen; the open dialog keeps its picture.
    if (dialog.current?.open) return;
    document.documentElement.classList.remove("lightbox-open");
    setItems([]);
    trigger.current?.focus();
    trigger.current = null;
  };

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label={item?.caption ? `Enlarged screenshot: ${item.caption}` : "Enlarged screenshot"}
      onClose={onClose}
      onClick={(event) => {
        const target = event.target as Element;
        if (target === event.currentTarget || target.classList.contains("lightbox-figure")) close();
      }}
      onKeyDown={(event) => {
        if (items.length < 2) return;
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
      }}
    >
      {item ? (
        <>
          <button type="button" className="lightbox-close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
          <figure className="lightbox-figure">
            <img
              className={item.height > item.width ? "lightbox-img is-phone" : "lightbox-img"}
              src={item.src}
              alt={item.alt}
              width={item.width || undefined}
              height={item.height || undefined}
              decoding="async"
            />
            <figcaption className="lightbox-caption" aria-live="polite">
              {item.caption}
              {items.length > 1 ? ` (${index + 1} of ${items.length})` : ""}
            </figcaption>
          </figure>
          {items.length > 1 ? (
            <>
              <button type="button" className="lightbox-nav lightbox-prev" aria-label="Previous screenshot" onClick={() => step(-1)}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4l-6 6 6 6" />
                </svg>
              </button>
              <button type="button" className="lightbox-nav lightbox-next" aria-label="Next screenshot" onClick={() => step(1)}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 4l6 6-6 6" />
                </svg>
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}
