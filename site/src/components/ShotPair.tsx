import type { ReactNode } from "react";
import { PHONE_SIZE, type PhoneShot } from "../shots";

/**
 * A desktop picture (the child) with its phone shot beside it, bottom-aligned. Without a phone shot it is the
 * desktop picture alone. Width and height come from the phone file's size, so its space is reserved before it loads.
 */
export function ShotPair({ className, phone, children }: { className?: string; phone?: PhoneShot; children: ReactNode }) {
  return (
    <div className={["shot-pair", phone ? "with-phone" : "", className].filter(Boolean).join(" ")}>
      {children}
      {phone ? (
        <img
          className="shot-phone"
          src={phone.src}
          width={PHONE_SIZE.width}
          height={PHONE_SIZE.height}
          loading="lazy"
          decoding="async"
          alt={phone.alt}
        />
      ) : null}
    </div>
  );
}
