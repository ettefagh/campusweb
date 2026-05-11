export type SocialAccountType = "official" | "club";

export interface SocialAccount {
  id: string;
  type: SocialAccountType;
  name: string;
  handle: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin" | "whatsapp";
  url: string;
  campusIds: string[]; // ["all"] or specific campus ids
  schoolIds?: string[];
  categories?: string[];
  verified: boolean;
  priority: number;
}

export const socialAccounts: SocialAccount[] = [
  // Official Accounts
  {
    id: "srh-intl",
    type: "official",
    name: "SRH International",
    handle: "srh_university_international",
    platform: "instagram",
    url: "https://www.instagram.com/srh_university_international/",
    campusIds: ["all"],
    verified: true,
    priority: 100,
  },
  {
    id: "srh-fb",
    type: "official",
    name: "SRH University",
    handle: "srhuniversityinternational",
    platform: "facebook",
    url: "http://facebook.com/srhuniversityinternational",
    campusIds: ["all"],
    verified: true,
    priority: 90,
  },
  {
    id: "srh-tiktok",
    type: "official",
    name: "SRH University",
    handle: "srhuniversity",
    platform: "tiktok",
    url: "https://www.tiktok.com/@srhuniversity",
    campusIds: ["all"],
    verified: true,
    priority: 80,
  },
  {
    id: "srh-youtube",
    type: "official",
    name: "SRH University",
    handle: "srhuniversity",
    platform: "youtube",
    url: "https://www.youtube.com/@srhuniversity",
    campusIds: ["all"],
    verified: true,
    priority: 70,
  },
  {
    id: "srh-linkedin",
    type: "official",
    name: "SRH University",
    handle: "srh-university",
    platform: "linkedin",
    url: "https://www.linkedin.com/school/srh-university/posts/",
    campusIds: ["all"],
    verified: true,
    priority: 60,
  },

  // Student Clubs
  {
    id: "srh-students",
    type: "club",
    name: "SRH Students",
    handle: "srh.students",
    platform: "instagram",
    url: "https://www.instagram.com/srh.students/",
    campusIds: ["all"],
    categories: ["community"],
    verified: true,
    priority: 50,
  },
  {
    id: "srh-mun",
    type: "club",
    name: "SRH MUN",
    handle: "srh_mun",
    platform: "instagram",
    url: "https://www.instagram.com/srh_mun/",
    campusIds: ["berlin"],
    categories: ["culture", "politics"],
    verified: true,
    priority: 40,
  },
  {
    id: "srh-gdcoc",
    type: "club",
    name: "GDCoC SRH Berlin",
    handle: "gdcoc_srhberlin",
    platform: "instagram",
    url: "https://www.instagram.com/gdcoc_srhberlin/",
    campusIds: ["berlin"],
    categories: ["tech"],
    verified: true,
    priority: 30,
  },
];
