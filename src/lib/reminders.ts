// Local daily reminders. Re-planned whenever activity or settings change, so a finished day never gets a nudge.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, parseDay } from './streak';

const CHANNEL = 'reminders';
const RISK_HOUR = 21;
/** Days ahead that get a reminder. Gaps = backoff, so ignored nudges don't turn into spam. */
const PLAN = [0, 1, 2, 3, 5, 7, 14];

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export interface ReminderPlan {
  enabled: boolean;
  hour: number;
  minute: number;
  today: string;
  todayDone: boolean;
  streak: number;
}

const DAILY = [
  ['Ciao! 👋', 'Your Italian practice is waiting. Just a few minutes today.'],
  ['Time for Italian ☕', 'A quick round keeps the words fresh.'],
  ['Pronto? 🇮🇹', 'Your daily goal takes only a few minutes.'],
  ['Andiamo! 🚀', 'Small steps every day make you fluent.'],
];
const STREAK = [
  ['🔥 {n}-day streak', 'Keep it going. Practise today to make it {next}.'],
  ['Don’t break the chain 🔥', 'Your {n}-day streak needs today’s lesson.'],
];
const RISK = [
  ['Your streak is about to end 😱', 'Only a few hours left to save your {n}-day streak.'],
  ['Last call! 🔥', 'Finish today’s goal before midnight to keep your {n}-day streak.'],
];
const COMEBACK = [
  ['We miss you 🥺', 'Your Italian is getting rusty. Come back for a quick round?'],
  ['Still there? 👀', 'Five minutes of Italian today, that’s all.'],
];

const pick = (list: string[][], seed: number, n: number) =>
  list[seed % list.length].map((t) => t.replace('{n}', String(n)).replace('{next}', String(n + 1)));

/** Ask for permission (iOS prompt / Android 13+). Returns whether notifications are allowed. */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Daily reminders', importance: Notifications.AndroidImportance.HIGH });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function permissionGranted() {
  return supported && (await Notifications.getPermissionsAsync()).granted;
}

export async function cancelReminders() {
  if (supported) await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function planReminders(p: ReminderPlan) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!p.enabled || !(await permissionGranted())) return;

  const now = Date.now();
  const seed = parseDay(p.today).getDate();
  const at = (key: string, hour: number, minute: number) => {
    const d = parseDay(key);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const schedule = (date: Date, [title, body]: string[]) =>
    date.getTime() > now + 60_000 &&
    Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: '/exercise' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });

  // Streak alive tomorrow only if today is done; otherwise it rides on today.
  const streakFor = (offset: number) => (offset === 0 ? p.streak : offset === 1 && p.todayDone ? p.streak : 0);
  const jobs: unknown[] = [];
  for (const offset of PLAN) {
    if (offset === 0 && p.todayDone) continue;
    const key = addDays(p.today, offset);
    const n = streakFor(offset);
    const copy = offset >= 3 ? pick(COMEBACK, seed + offset, n) : n > 0 ? pick(STREAK, seed + offset, n) : pick(DAILY, seed + offset, n);
    jobs.push(schedule(at(key, p.hour, p.minute), copy));
    // Evening rescue for a live streak, if the normal reminder is earlier.
    if (n > 0 && p.hour < RISK_HOUR) {
      jobs.push(schedule(at(key, RISK_HOUR, 0), pick(RISK, seed + offset, n)));
    }
  }
  await Promise.all(jobs);
}
