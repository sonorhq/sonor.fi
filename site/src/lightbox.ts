// The lightbox's rules with no DOM or React in them, so the tests can run them in Node.

export const ZOOM_SELECTOR = "a[data-zoom]";
export const GROUP_SELECTOR = "[data-zoom-group]";

export interface ZoomItem {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/** The next index when stepping by delta, wrapping at both ends. */
export function wrapIndex(index: number, count: number, delta: number): number {
  return (index + delta + count) % count;
}

/** A plain left click. Clicks with a modifier or another button keep the browser's own behaviour (new tab, save). */
export function isPlainClick(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
