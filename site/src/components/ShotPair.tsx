import { PHONE_SIZE, type PhoneShot } from "../shots";
import { Zoomable } from "./Zoomable";

export interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * The one way a screenshot is drawn: the desktop picture, with its phone shot over the lower right corner
 * when there is one. Both open in the lightbox as a pair. `priority` is for the hero only (the LCP image).
 */
export function ShotPair({ className, desktop, phone, caption, priority = false }: { className?: string; desktop: Shot; phone?: PhoneShot; caption?: string; priority?: boolean }) {
  return (
    <div className={["stage", phone ? "with-phone" : "", className].filter(Boolean).join(" ")} data-zoom-group="">
      <Zoomable className="stage-desk" src={desktop.src} alt={desktop.alt} caption={caption}>
        {priority ? (
          <img src={desktop.src} width={desktop.width} height={desktop.height} alt={desktop.alt} fetchPriority="high" />
        ) : (
          <img src={desktop.src} width={desktop.width} height={desktop.height} alt={desktop.alt} loading="lazy" decoding="async" />
        )}
      </Zoomable>
      {phone ? (
        <Zoomable className="stage-phone" src={phone.src} alt={phone.alt} caption={caption}>
          <img src={phone.src} width={PHONE_SIZE.width} height={PHONE_SIZE.height} alt={phone.alt} loading={priority ? undefined : "lazy"} decoding="async" />
        </Zoomable>
      ) : null}
    </div>
  );
}
