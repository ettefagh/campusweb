type LinkIconSource = {
  id: string;
  title: string;
  description?: string;
  category_name?: string;
};

type LinkIconTheme = {
  background: string;
  border: string;
  shadow: string;
  hoverBackground: string;
  accent: string;
};

const ICON_THEMES = {
  purple: {
    background: "linear-gradient(135deg, #7678ed, #3d348b)",
    border: "#d7d5ff",
    shadow: "rgba(61, 52, 139, 0.24)",
    hoverBackground: "rgba(118, 120, 237, 0.08)",
    accent: "#3d348b"
  },
  green: {
    background: "linear-gradient(135deg, #63D471, #2FB344)",
    border: "#BBF7D0",
    shadow: "rgba(47, 179, 68, 0.22)",
    hoverBackground: "rgba(47, 179, 68, 0.07)",
    accent: "#2FB344"
  },
  orange: {
    background: "linear-gradient(135deg, #f7b801, #f18701)",
    border: "#ffe1a1",
    shadow: "rgba(241, 135, 1, 0.24)",
    hoverBackground: "rgba(247, 184, 1, 0.09)",
    accent: "#f18701"
  },
  deepOrange: {
    background: "linear-gradient(135deg, #f18701, #f35b04)",
    border: "#ffc29a",
    shadow: "rgba(243, 91, 4, 0.24)",
    hoverBackground: "rgba(243, 91, 4, 0.08)",
    accent: "#f35b04"
  },
  blue: {
    background: "linear-gradient(135deg, #7CC8F2, #2FA4D7)",
    border: "#BFE9FA",
    shadow: "rgba(47, 164, 215, 0.22)",
    hoverBackground: "rgba(47, 164, 215, 0.07)",
    accent: "#2FA4D7"
  },
  navy: {
    background: "linear-gradient(135deg, #7678ed, #14213D)",
    border: "#cfd1ff",
    shadow: "rgba(20, 33, 61, 0.22)",
    hoverBackground: "rgba(61, 52, 139, 0.07)",
    accent: "#14213D"
  },
  brown: {
    background: "linear-gradient(135deg, #C9A27F, #3E2C23)",
    border: "#E6D5C4",
    shadow: "rgba(62, 44, 35, 0.18)",
    hoverBackground: "rgba(62, 44, 35, 0.06)",
    accent: "#3E2C23"
  }
} satisfies Record<string, LinkIconTheme>;

const LINK_ICON_CLASSES: Record<string, string> = {
  campusweb: "ph-fill ph-graduation-cap",
  "my-profile": "ph-fill ph-user-circle",
  "my-contacts": "ph-fill ph-users",
  "my-documents": "ph-fill ph-file-text",
  schedule: "ph-fill ph-calendar",
  courses: "ph-fill ph-book-open",
  "course-selection": "ph-fill ph-check-square",
  "exam-registration": "ph-fill ph-note-pencil",
  grades: "ph-fill ph-chart-bar",
  submissions: "ph-fill ph-upload-simple",
  "course-catalog": "ph-fill ph-books",

  ecampus: "ph-fill ph-laptop",
  "ecampus-news": "ph-fill ph-newspaper",
  "career-center-events": "ph-fill ph-briefcase",
  "ecampus-tools": "ph-fill ph-wrench",
  "ecampus-regulations": "ph-fill ph-clipboard-text",
  "student-handbook": "ph-fill ph-book-bookmark",
  "srh-padlet": "ph-fill ph-folders",

  "library-catalogue": "ph-fill ph-books",
  "team-directory": "ph-fill ph-bank",
  "university-website": "ph-fill ph-globe",
  accommodation: "ph-fill ph-house",
  "study-advisors": "ph-fill ph-chats",
  "our-campuses": "ph-fill ph-buildings",
  financing: "ph-fill ph-wallet",
  "library-campus": "ph-fill ph-books",

  "welcome-week-berlin": "ph-fill ph-map-pin",
  "welcome-week-cologne": "ph-fill ph-bank",
  "welcome-week-fuerth": "ph-fill ph-map-pin",
  "welcome-week-dresden": "ph-fill ph-buildings",
  "welcome-week-hamburg": "ph-fill ph-anchor",
  "welcome-week-heidelberg": "ph-fill ph-bank",
  "welcome-week-leipzig": "ph-fill ph-microphone-stage",
  "welcome-week-munich": "ph-fill ph-graduation-cap",
  "welcome-week-stuttgart": "ph-fill ph-car",

  "study-abroad": "ph-fill ph-globe-hemisphere-east",
  "semester-abroad": "ph-fill ph-airplane-takeoff",
  scholarships: "ph-fill ph-wallet",
  "partner-universities": "ph-fill ph-handshake",
  "visa-residence": "ph-fill ph-identification-card",

  email: "ph-fill ph-envelope",
  onedrive: "ph-fill ph-cloud",
  "brand-store": "ph-fill ph-shopping-cart",
  "equipment-rental": "ph-fill ph-camera",

  "pdf-tools": "ph-fill ph-archive",
  "calendar-enhancer": "ph-fill ph-magic-wand",
  "department-directory": "ph-fill ph-magnifying-glass",
  "calendar-app": "ph-fill ph-calendar-check",
  "settings-app": "ph-fill ph-gear",
  "accessibility-app": "ios-accessibility",
  "social-medias": "ph-fill ph-device-mobile",
  "student-clubs": "ph-fill ph-users-three"
};

const LINK_ICON_THEME_KEYS: Record<string, keyof typeof ICON_THEMES> = {
  campusweb: "navy",
  "my-profile": "navy",
  "my-contacts": "blue",
  "my-documents": "brown",
  schedule: "green",
  courses: "blue",
  "course-selection": "green",
  "exam-registration": "deepOrange",
  grades: "orange",
  submissions: "deepOrange",
  "course-catalog": "brown",

  ecampus: "blue",
  "ecampus-news": "orange",
  "career-center-events": "deepOrange",
  "ecampus-tools": "blue",
  "ecampus-regulations": "brown",
  "student-handbook": "brown",
  "srh-padlet": "purple",

  "library-catalogue": "purple",
  "team-directory": "purple",
  "university-website": "navy",
  accommodation: "green",
  "study-advisors": "blue",
  "our-campuses": "navy",
  financing: "orange",
  "library-campus": "purple",

  "welcome-week-berlin": "orange",
  "welcome-week-cologne": "purple",
  "welcome-week-fuerth": "green",
  "welcome-week-dresden": "brown",
  "welcome-week-hamburg": "blue",
  "welcome-week-heidelberg": "navy",
  "welcome-week-leipzig": "orange",
  "welcome-week-munich": "orange",
  "welcome-week-stuttgart": "blue",

  "study-abroad": "blue",
  "semester-abroad": "blue",
  scholarships: "orange",
  "partner-universities": "purple",
  "visa-residence": "brown",

  email: "blue",
  onedrive: "blue",
  "brand-store": "deepOrange",
  "equipment-rental": "orange",

  "pdf-tools": "brown",
  "calendar-enhancer": "orange",
  "department-directory": "purple",
  "calendar-app": "green",
  "settings-app": "navy",
  "accessibility-app": "blue",
  "social-medias": "orange",
  "student-clubs": "purple"
};

const KEYWORD_ICON_CLASSES: Array<[RegExp, string]> = [
  [/\b(calendar|schedule|timetable|events?|exam date)\b/i, "ph-fill ph-calendar"],
  [/\b(grade|progress|stats|overview|result)\b/i, "ph-fill ph-chart-bar"],
  [/\b(library|books?|journal|catalogue|catalog)\b/i, "ph-fill ph-books"],
  [/\b(document|certificate|transcript|pdf|form)\b/i, "ph-fill ph-file-text"],
  [/\b(course|class|module|study|handbook)\b/i, "ph-fill ph-book-open"],
  [/\b(email|mail|inbox|message)\b/i, "ph-fill ph-envelope"],
  [/\b(contact|directory|faculty|staff|advisor|team)\b/i, "ph-fill ph-users"],
  [/\b(news|announcement|feed|social|post)\b/i, "ph-fill ph-newspaper"],
  [/\b(tool|service|settings|equipment|rental)\b/i, "ph-fill ph-wrench"],
  [/\b(financing|funding|scholarship|fee|tuition|money)\b/i, "ph-fill ph-wallet"],
  [/\b(campus|university|school|portal)\b/i, "ph-fill ph-bank"],
  [/\b(visa|residence|international|abroad|partner)\b/i, "ph-fill ph-globe-hemisphere-east"]
];

const KEYWORD_ICON_THEME_KEYS: Array<[RegExp, keyof typeof ICON_THEMES]> = [
  [/\b(calendar|schedule|timetable|select)\b/i, "green"],
  [/\b(grade|progress|scholarship|financing|funding|money|register|submit|store|career|event|welcome|social)\b/i, "orange"],
  [/\b(email|mail|cloud|digital|portal|tool|international|abroad)\b/i, "blue"],
  [/\b(regulation|policy|visa|residence|accessibility|document|pdf|handbook)\b/i, "brown"],
  [/\b(library|book|catalogue|catalog|directory|partner|team|club)\b/i, "purple"],
  [/\b(campus|university|profile|school)\b/i, "navy"],
  [/\b(accommodation|housing|home)\b/i, "green"]
];

function searchableText(link: LinkIconSource): string {
  return `${link.title} ${link.description ?? ""} ${link.category_name ?? ""}`;
}

export function getLinkIconClass(link: LinkIconSource): string {
  const exact = LINK_ICON_CLASSES[link.id];
  if (exact) return exact;

  const searchable = searchableText(link);
  const keywordMatch = KEYWORD_ICON_CLASSES.find(([pattern]) => pattern.test(searchable));
  return keywordMatch?.[1] ?? "ph-fill ph-link";
}

export function getLinkIconTheme(link: LinkIconSource): LinkIconTheme {
  const exact = LINK_ICON_THEME_KEYS[link.id];
  if (exact) return ICON_THEMES[exact];

  const searchable = searchableText(link);
  const keywordMatch = KEYWORD_ICON_THEME_KEYS.find(([pattern]) => pattern.test(searchable));
  return ICON_THEMES[keywordMatch?.[1] ?? "orange"];
}
