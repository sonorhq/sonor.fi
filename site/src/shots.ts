// The phone shots that sit beside a desktop one, on the home page and in the feature pictures. A phone shot
// shows only when its `ready` flag is true, like the desktop shot it goes with, so the file can come later.

/** The size of a phone shot file: 9:19.5, made by scripts/phone-shot.sh. */
export const PHONE_SIZE = { width: 900, height: 1950 };

export interface PhoneShot {
  /** The file under public/screenshots/phone/, WebP. */
  src: string;
  /** Describes what the phone shot shows; read by screen readers, so never empty. */
  alt: string;
  ready: boolean;
}

/** The phone shot, when it is ready to show. */
export function readyPhone(phone?: PhoneShot): PhoneShot | undefined {
  return phone?.ready ? phone : undefined;
}
