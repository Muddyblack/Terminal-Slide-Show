/** Slides of the GitHub Pages demo. Generated placeholder graphics in public/demo, no real content. */
export const DEMO_MEDIA = [
  ...['01-welcome', '02-menu', '03-events', '04-wifi', '05-library'].map((name) => ({
    id: name,
    name: `${name}.svg`,
    path: `${name}.svg`,
    type: 'image',
    duration: 7000,
  })),
  // As on a real device, the daily view is part of the rotation
  { id: 'dynamic-view', name: 'dynamic-view', path: '', type: 'dynamic', duration: 30000, isDynamicView: true },
];

/** Where a demo slide is served from; base-aware because Pages hosts the site in a sub-path */
export const demoMediaUrl = (name: string): string => `${import.meta.env.BASE_URL}demo/${encodeURIComponent(name)}`;
