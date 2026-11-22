import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivity } from '../lib/activity';
import { Button } from './Button';
import { F, makeStyles, useTheme } from '../lib/theme';

/** Shown once when today's goal is reached. Offers reminders the first time. */
export function Celebration() {
  const s = useStyles();
  const { c } = useTheme();
  const { celebration, dismissCelebration, reminderUnset, reminder, setReminder } = useActivity();
  const scale = useRef(new Animated.Value(0.3)).current;
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    if (!celebration) return;
    setOffer(reminderUnset);
    scale.setValue(0.3);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
  }, [celebration]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!celebration) return null;
  const { streak, milestone, freezeEarned } = celebration;
  const title = milestone ? `${streak}-day milestone! 🎉` : streak === 1 ? 'Streak started!' : `${streak}-day streak!`;
  const text = milestone
    ? `${streak} days in a row. Bravissimo!`
    : streak === 1
      ? 'Daily goal done. Come back tomorrow to make it 2.'
      : 'Daily goal done. See you tomorrow!';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissCelebration}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Animated.View style={[s.flame, { transform: [{ scale }] }]}>
            <Ionicons name="flame" size={72} color={c.accent.amber.fg} />
            <Text style={s.num}>{streak}</Text>
          </Animated.View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.text}>{text}</Text>
          {freezeEarned && (
            <View style={s.freeze}>
              <Ionicons name="snow" size={16} color={c.accent.blue.fg} />
              <Text style={s.freezeText}>You earned a streak freeze</Text>
            </View>
          )}
          {offer ? (
            <View style={s.buttons}>
              <Text style={s.offer}>Want a daily reminder at {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}?</Text>
              <View style={s.row}>
                <Button
                  label="Not now"
                  variant="secondary"
                  onPress={() => {
                    setReminder({ ...reminder, enabled: false });
                    dismissCelebration();
                  }}
                />
                <Button
                  label="Remind me"
                  icon="notifications"
                  onPress={async () => {
                    await setReminder({ ...reminder, enabled: true });
                    dismissCelebration();
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={s.row}>
              <Button label="Continue" onPress={dismissCelebration} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: c.card, borderRadius: 28, padding: 24, alignItems: 'center', gap: 10 },
  flame: { alignItems: 'center', marginBottom: 4 },
  num: { ...F.bold, fontSize: 44, letterSpacing: -1, color: c.accent.amber.text, marginTop: -6 },
  title: { ...F.bold, fontSize: 24, color: c.text, textAlign: 'center' },
  text: { ...F.regular, fontSize: 15, color: c.muted, textAlign: 'center' },
  freeze: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent.blue.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  freezeText: { ...F.semibold, fontSize: 13, color: c.accent.blue.text },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 6 },
  offer: { ...F.medium, fontSize: 14, color: c.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 6 },
}));
