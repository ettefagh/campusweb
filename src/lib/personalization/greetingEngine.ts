export type WeatherContext = {
  condition?: string;
  tempC?: number;
  alertCount?: number;
  campusName?: string;
};

export type NextClassContext = {
  courseName: string;
  startTimeIso: string;
  room?: string;
};

export type GreetingContext = {
  userId?: string;
  firstName?: string | null;
  dayPeriod: "morning" | "afternoon" | "evening" | "night";
  weather?: WeatherContext | null;
  nextClass?: NextClassContext | null;
  streakDays?: number;
  recentGreetingIds: string[];
};

export type GreetingRule = {
  id: string;
  priority: number;
  enabled: boolean;
  cooldownHours: number;
  stickyScope: "session" | "daypart" | "day";
  when: (ctx: GreetingContext) => boolean;
  templates: { headline: string; subline?: string }[];
};

export type GreetingDecision = {
  ruleId: string;
  headline: string;
  subline?: string;
  expiresAtIso: string;
};

// Extremely simple hashing for deterministic picking
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return Math.abs(hash);
}

function calculateExpiry(scope: "session" | "daypart" | "day"): string {
  const now = new Date();
  if (scope === "daypart") {
    // Expires in 4 hours
    now.setHours(now.getHours() + 4);
    return now.toISOString();
  }
  if (scope === "day") {
    // Expires end of day
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }
  // Session expires in 1 hour approx
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

function interpolate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : '';
  });
}

export const RULES: GreetingRule[] = [
  {
    id: "weather_alert",
    priority: 5,
    enabled: true,
    cooldownHours: 4,
    stickyScope: "daypart",
    when: (ctx) => (ctx.weather?.alertCount ?? 0) > 0,
    templates: [
      { headline: "Weather alert for {campusName}", subline: "Check notifications for details" },
      { headline: "Stay safe on campus today", subline: "Active weather alerts" }
    ]
  },
  {
    id: "urgent_class_upcoming",
    priority: 10,
    enabled: true,
    cooldownHours: 1,
    stickyScope: "session",
    when: (ctx) => {
      if (!ctx.nextClass) return false;
      const classStart = new Date(ctx.nextClass.startTimeIso).getTime();
      const now = new Date().getTime();
      const diffMins = (classStart - now) / 1000 / 60;
      return diffMins > 0 && diffMins <= 60;
    },
    templates: [
      { headline: "You have {courseName} soon", subline: "Starts at {classTime}" },
      { headline: "Next up: {courseName}", subline: "Starting in a bit" }
    ]
  },
  {
    id: "class_today",
    priority: 20,
    enabled: true,
    cooldownHours: 12,
    stickyScope: "daypart",
    when: (ctx) => {
      if (!ctx.nextClass) return false;
      const classStart = new Date(ctx.nextClass.startTimeIso);
      const today = new Date();
      return classStart.getDate() === today.getDate() && classStart.getMonth() === today.getMonth();
    },
    templates: [
      { headline: "You have {courseName} today", subline: "At {classTime}" },
      { headline: "Campus day!", subline: "Next up: {courseName}" }
    ]
  },
  {
    id: "weather_sunny",
    priority: 50,
    enabled: true,
    cooldownHours: 24,
    stickyScope: "daypart",
    when: (ctx) => ctx.weather?.condition === "sunny" || ctx.weather?.condition === "clear",
    templates: [
      { headline: "Enjoy the sunny weather, {firstName}!", subline: "Beautiful day outside" },
      { headline: "It's beautiful outside today.", subline: "Perfect campus weather" }
    ]
  },
  {
    id: "weather_rainy",
    priority: 50,
    enabled: true,
    cooldownHours: 24,
    stickyScope: "daypart",
    when: (ctx) => ctx.weather?.condition === "rain",
    templates: [
      { headline: "Don't forget your umbrella, {firstName}.", subline: "It's raining outside" },
      { headline: "Stay dry out there today!", subline: "Rainy day on campus" }
    ]
  },
  {
    id: "generic_morning",
    priority: 100,
    enabled: true,
    cooldownHours: 0,
    stickyScope: "daypart",
    when: (ctx) => ctx.dayPeriod === "morning",
    templates: [
      { headline: "Good morning, {firstName}!", subline: "Morning" },
      { headline: "Ready for today's classes?", subline: "Morning" },
      { headline: "Morning, {firstName}! Have a great day.", subline: "Morning" }
    ]
  },
  {
    id: "generic_afternoon",
    priority: 100,
    enabled: true,
    cooldownHours: 0,
    stickyScope: "daypart",
    when: (ctx) => ctx.dayPeriod === "afternoon",
    templates: [
      { headline: "Good afternoon, {firstName}!", subline: "Afternoon" },
      { headline: "Hope your day is going well.", subline: "Afternoon" }
    ]
  },
  {
    id: "generic_evening",
    priority: 100,
    enabled: true,
    cooldownHours: 0,
    stickyScope: "daypart",
    when: (ctx) => ctx.dayPeriod === "evening" || ctx.dayPeriod === "night",
    templates: [
      { headline: "Good evening, {firstName}.", subline: "Evening" },
      { headline: "Time to wind down for the day.", subline: "Evening" }
    ]
  }
];

export function evaluateGreeting(ctx: GreetingContext, tGreetings?: Record<string, {headline: string, subline?: string}[]>): GreetingDecision {
  const eligibleRules = RULES.filter(r => 
    r.enabled && 
    !ctx.recentGreetingIds.includes(r.id) &&
    r.when(ctx)
  );
  
  eligibleRules.sort((a, b) => a.priority - b.priority);
  const selectedRule = eligibleRules[0] || RULES.find(r => r.id === 'generic_morning')!;
  
  const seedStr = (ctx.userId || "anon") + new Date().toISOString().split('T')[0];
  const seed = hashString(seedStr);
  const ruleTemplates = (tGreetings && tGreetings[selectedRule.id]) ? tGreetings[selectedRule.id] : selectedRule.templates;
  const templateObj = ruleTemplates[seed % ruleTemplates.length];

  const templateCtx = {
    firstName: ctx.firstName || "there",
    courseName: ctx.nextClass?.courseName,
    classTime: ctx.nextClass ? new Date(ctx.nextClass.startTimeIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
    campusName: ctx.weather?.campusName || "campus"
  };

  let processedHeadline = interpolate(templateObj.headline, templateCtx).trim();
  // Cleanup if fallback "there" looks awkward like "Good morning, there!"
  processedHeadline = processedHeadline.replace(/,\s*there/, "");

  return {
    ruleId: selectedRule.id,
    headline: processedHeadline,
    subline: templateObj.subline ? interpolate(templateObj.subline, templateCtx) : undefined,
    expiresAtIso: calculateExpiry(selectedRule.stickyScope)
  };
}
