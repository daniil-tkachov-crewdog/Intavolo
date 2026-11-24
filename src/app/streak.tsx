import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { SCALE, Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useActivity } from '../lib/activity';
import { permissionGranted } from '../lib/reminders';
import { dayKey, GOALS, MAX_FREEZES, FREEZE_EVERY } from '../lib/streak';
import { F, makeStyles, useTheme } from '../lib/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function Streak() {
  const s = useStyles();
  const { c } = useTheme();
  const { info, goal, done, setGoal, reminder, setReminder } = useActivity();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (reminder.enabled) permissionGranted().then((ok) => setBlocked(!ok));
  }, [reminder.enabled]);

  const subtitle = info.todayDone ? 'Goal done today ✓' : info.current > 0 ? 'Finish today’s goal to keep it going' : 'Finish today’s goal to start a streak';
  const toggle = async (on: boolean) => setBlocked(!(await setReminder({ ...reminder, enabled: on })) && on);
  const shiftTime = (mins: number) => {
    const t = (reminder.hour * 60 + reminder.minute + mins + 1440) % 1440;
    setReminder({ ...reminder, hour: Math.floor(t / 60), minute: t % 60 });
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={[s.card, s.hero]}>
        <Ionicons name={info.todayDone ? 'flame' : 'flame-outline'} size={56} color={info.todayDone ? c.accent.amber.fg : c.muted} />
        <View style={{ flex: 1 }}>
          <Text style={s.big} maxFontSizeMultiplier={SCALE.display}>
            {info.current}
          </Text>
          <Text style={s.bigLabel}>day streak</Text>
          <Text style={s.sub}>{subtitle}</Text>
        </View>
      </View>

      <View style={[s.card, s.pad]}>
        <View style={[s.between, { flexWrap: 'wrap', gap: 4 }]}>
          <Text style={s.h}>Today</Text>
          <Text style={s.muted}>
            {Math.min(done, goal)} / {goal} exercises
          </Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.min(1, done / goal) * 100}%`, backgroundColor: info.todayDone ? c.accent.amber.fg : c.primary }]} />
        </View>
        <View style={s.stats}>
          <Stat icon="trophy" color={c.accent.purple.fg} value={String(info.longest)} label="Longest streak" />
          <Stat icon="snow" color={c.accent.blue.fg} value={`${info.freezes} / ${MAX_FREEZES}`} label="Streak freezes" />
        </View>
        <Text style={s.note}>A freeze saves your streak on a missed day, automatically. Earn one every {FREEZE_EVERY} goal days.</Text>
      </View>

      <Calendar />

      <View style={[s.card, s.pad]}>
        <Text style={s.h}>Daily goal</Text>
        <View style={s.segments}>
          {GOALS.map((g) => {
            const on = goal === g;
            return (
              <Pressable key={g} onPress={() => setGoal(g)} style={[s.seg, on && { backgroundColor: c.primary }]}>
                <Text maxFontSizeMultiplier={SCALE.ui} numberOfLines={1} style={[s.segText, on && { ...F.semibold, color: '#FFFFFF' }]}>{g}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.note}>Exercises per day: any answer in Test, Learn, Sentences or Grammar counts.</Text>
      </View>

      <View style={[s.card, s.pad]}>
        <View style={[s.between, { gap: 12 }]}>
          <Text style={[s.h, { flexShrink: 1 }]}>Daily reminder</Text>
          <Switch value={reminder.enabled} onValueChange={toggle} trackColor={{ true: c.primary }} />
        </View>
        {reminder.enabled && (
          <View style={s.time}>
            <Round icon="remove" onPress={() => shiftTime(-15)} />
            <Text style={s.timeText} maxFontSizeMultiplier={SCALE.title}>
              {pad(reminder.hour)}:{pad(reminder.minute)}
            </Text>
            <Round icon="add" onPress={() => shiftTime(15)} />
          </View>
        )}
        {blocked ? (
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={[s.note, { color: c.accent.red.text }]}>Notifications are turned off for Intavolo. Tap to open Settings.</Text>
          </Pressable>
        ) : (
          <Text style={s.note}>Skipped on days you’ve already hit your goal. Plus an evening nudge if your streak is at risk.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function Calendar() {
  const s = useStyles();
  const { c } = useTheme();
  const { info, today } = useActivity();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const lead = (month.getDay() + 6) % 7; // Monday first
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const isCurrent = dayKey(month).slice(0, 7) === today.slice(0, 7);

  return (
    <View style={[s.card, s.pad]}>
      <View style={s.between}>
        <Round icon="chevron-back" onPress={() => shift(-1)} />
        <Text style={[s.h, { flex: 1, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={SCALE.title}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Round icon="chevron-forward" onPress={() => shift(1)} disabled={isCurrent} />
      </View>
      <View style={s.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={s.weekday} maxFontSizeMultiplier={SCALE.ui}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const key = dayKey(d);
          const st = info.status.get(key);
          const bg = st === 'done' ? c.accent.amber.fg : st === 'frozen' ? c.accent.blue.soft : 'transparent';
          return (
            <View key={i} style={s.cell}>
              <View style={[s.dot, { backgroundColor: bg }, key === today && !st && { borderWidth: 2, borderColor: c.primary }]}>
                {st === 'frozen' ? (
                  <Ionicons name="snow" size={14} color={c.accent.blue.fg} />
                ) : (
                  <Text maxFontSizeMultiplier={SCALE.ui} adjustsFontSizeToFit numberOfLines={1} style={[s.dayNum, st === 'done' && { ...F.bold, color: '#FFFFFF' }, key > today && { opacity: 0.35 }]}>{d.getDate()}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: string; label: string }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flexShrink: 1 }}>
        <Text style={s.statNum} maxFontSizeMultiplier={SCALE.ui}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Round({ icon, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }): ReactNode {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={({ pressed }) => [s.round, (pressed || disabled) && { opacity: 0.35 }]}>
      <Ionicons name={icon} size={18} color={c.text} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 22 },
  pad: { padding: 16, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 26 },
  big: { ...F.bold, fontSize: 44, letterSpacing: -1, color: c.text, lineHeight: 48 },
  bigLabel: { ...F.semibold, fontSize: 16, color: c.text },
  sub: { ...F.regular, fontSize: 14, color: c.muted, marginTop: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h: { ...F.semibold, fontSize: 16, color: c.text },
  muted: { ...F.regular, fontSize: 14, color: c.muted },
  track: { height: 12, borderRadius: 6, backgroundColor: c.surface, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 16, padding: 12 },
  statNum: { ...F.bold, fontSize: 18, color: c.text },
  statLabel: { ...F.regular, fontSize: 12, color: c.muted },
  note: { ...F.regular, fontSize: 13, lineHeight: 18, color: c.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { ...F.medium, width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: c.muted, paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, paddingHorizontal: 1 },
  dot: { width: '100%', maxWidth: 34, aspectRatio: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayNum: { ...F.medium, fontSize: 14, color: c.text },
  segments: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 3, gap: 3 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, minHeight: 36 },
  segText: { ...F.medium, fontSize: 14, color: c.muted },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  timeText: { ...F.bold, fontSize: 32, color: c.text, minWidth: 100, textAlign: 'center' },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
}));
