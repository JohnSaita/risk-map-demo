/** Who made the map and how to reach them, shown in the page header and About dialog. */
export const SITE = {
  title: 'Transmission Risk Map',
  author: 'John S Nkaiwatei',
  role: 'GIS & web mapping',
  /** A mailto: or profile link from VITE_CONTACT_URL; the contact button is hidden without one. */
  contactUrl: import.meta.env.VITE_CONTACT_URL || null,
} as const;

export const TECH_STACK = ['React', 'TypeScript', 'Mapbox GL JS', 'geoBoundaries', 'Vite'] as const;
