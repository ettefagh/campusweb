// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateGreeting, RULES, type GreetingContext } from './greetingEngine';

describe('greetingEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const tGreetings = {
    generic_morning: [{ headline: "Good morning", subline: "Morning" }],
    class_today: [{ headline: "Class today: {courseName}", subline: "At {classTime}" }],
    weather_alert: [{ headline: "Alert on {campusName}", subline: "Active alerts" }],
    urgent_class_upcoming: [{ headline: "Starting soon: {courseName}", subline: "Quick!" }]
  };

  it('selects generic morning greeting when no class or weather alerts exist', () => {
    vi.setSystemTime(new Date('2023-10-10T09:00:00Z')); // Morning time
    
    const ctx: GreetingContext = {
      userId: 'test1',
      dayPeriod: 'morning',
      recentGreetingIds: []
    };

    const decision = evaluateGreeting(ctx, tGreetings);
    expect(decision.ruleId).toBe('generic_morning');
    expect(decision.headline).toBe('Good morning');
  });

  it('prioritizes class_today over generic morning if a class is later today', () => {
    // Current time is 9 AM
    vi.setSystemTime(new Date('2023-10-10T09:00:00Z'));
    
    // Class is at 2 PM today
    const classTime = new Date('2023-10-10T14:00:00Z').toISOString();

    const ctx: GreetingContext = {
      userId: 'test1',
      dayPeriod: 'morning',
      recentGreetingIds: [],
      nextClass: { courseName: 'CS 101', startTimeIso: classTime }
    };

    const decision = evaluateGreeting(ctx, tGreetings);
    expect(decision.ruleId).toBe('class_today');
    expect(decision.headline).toBe('Class today: CS 101');
  });

  it('prioritizes urgent_class_upcoming if class is within 60 minutes', () => {
    // Current time is 1:30 PM
    vi.setSystemTime(new Date('2023-10-10T13:30:00Z'));
    
    // Class is at 2 PM today (30 mins from now)
    const classTime = new Date('2023-10-10T14:00:00Z').toISOString();

    const ctx: GreetingContext = {
      userId: 'test1',
      dayPeriod: 'afternoon',
      recentGreetingIds: [],
      nextClass: { courseName: 'CS 101', startTimeIso: classTime }
    };

    const decision = evaluateGreeting(ctx, tGreetings);
    expect(decision.ruleId).toBe('urgent_class_upcoming');
    expect(decision.headline).toBe('Starting soon: CS 101');
  });

  it('prioritizes weather_alert over class_today', () => {
    // Current time is 9 AM
    vi.setSystemTime(new Date('2023-10-10T09:00:00Z'));
    
    // Class is at 2 PM today
    const classTime = new Date('2023-10-10T14:00:00Z').toISOString();

    const ctx: GreetingContext = {
      userId: 'test1',
      dayPeriod: 'morning',
      recentGreetingIds: [],
      nextClass: { courseName: 'CS 101', startTimeIso: classTime },
      weather: { alertCount: 1, campusName: 'Heidelberg' }
    };

    const decision = evaluateGreeting(ctx, tGreetings);
    expect(decision.ruleId).toBe('weather_alert');
    expect(decision.headline).toBe('Alert on Heidelberg');
  });

  it('skips a rule if it is in recentGreetingIds', () => {
    vi.setSystemTime(new Date('2023-10-10T09:00:00Z'));
    const classTime = new Date('2023-10-10T14:00:00Z').toISOString();

    const ctx: GreetingContext = {
      userId: 'test1',
      dayPeriod: 'morning',
      recentGreetingIds: ['class_today'], // User already saw it
      nextClass: { courseName: 'CS 101', startTimeIso: classTime }
    };

    const decision = evaluateGreeting(ctx, tGreetings);
    // Should fallback to generic morning since class_today is skipped
    expect(decision.ruleId).toBe('generic_morning');
  });
});
