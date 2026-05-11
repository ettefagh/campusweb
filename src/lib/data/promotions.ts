export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl: string;
  sponsorName: string;
  campusIds: string[]; // ["all"] or specific
  startsAt?: string;
  expiresAt?: string;
  label: "Promotion" | "Student Offer" | "Official Offer";
  priority: number;
}

export const promotions: Promotion[] = [
  {
    id: "srh-store-2024",
    title: "Official SRH Merchandise",
    subtitle: "Get your official university hoodies, shirts and more at the SRH Store.",
    linkUrl: "https://srh-store.de/employees/bildung.html",
    sponsorName: "SRH Store",
    campusIds: ["all"],
    label: "Official Offer",
    priority: 10,
  }
];
