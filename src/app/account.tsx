import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, type Provider } from '../lib/auth';
import { syncNow, useSyncStatus } from '../lib/sync';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { F, makeStyles, useTheme } from '../lib/theme';

const PROVIDER: Record<Provider, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  email: { label: 'Email and password', icon: 'mail-outline' },
  google: { label: 'Google', icon: 'logo-google' },
  apple: { label: 'Apple', icon: 'logo-apple' },
};

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString();
}

export default function Account() {
  const s = useStyles();
  const { c } = useTheme();
  const { session, provider, changePassword, signOut, deleteAccount } = useAuth();
  const sync = useSyncStatus();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const p = PROVIDER[provider] ?? PROVIDER.email;

  const savePassword = async () => {
    if (pw.length < 6) return setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' });
    if (pw !== pw2) return setPwMsg({ ok: false, text: 'Passwords do not match.' });
    setBusy(true);
    try {
      await changePassword(pw);
      setPw('');
      setPw2('');
      setPwMsg({ ok: true, text: 'Password updated.' });
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not update password.' });
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    const ok = await signOut();
    setBusy(false);
    if (!ok)
      Alert.alert('Some progress is not synced', 'You seem to be offline. Signing out now will lose changes made since the last sync.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out anyway', style: 'destructive', onPress: () => signOut(true) },
      ]);
  };

  const onDelete = () =>
    Alert.alert('Delete account?', 'Your account and all saved progress will be permanently deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteAccount();
          } catch (e) {
            setBusy(false);
            Alert.alert('Could not delete account', e instanceof Error ? e.message : 'Check your connection and try again.');
          }
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <View style={[s.card, s.list]}>
        <Row label="Email" value={session?.user.email ?? '—'} />
        <View style={s.sep} />
        <View style={s.item}>
          <Text style={s.itemText}>Signed in with</Text>
          <Ionicons name={p.icon} size={15} color={c.muted} />
          <Text style={s.value}>{p.label}</Text>
        </View>
      </View>

      <View style={[s.card, s.pad]}>
        <View style={s.syncRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.title}>Sync</Text>
            <Text style={[s.small, sync.error && { color: c.accent.red.text }]}>
              {sync.syncing
                ? 'Syncing…'
                : sync.error
                  ? 'Offline — changes are saved on this phone'
                  : sync.lastSyncedAt
                    ? `Last synced ${ago(sync.lastSyncedAt)}`
                    : 'Not synced yet'}
            </Text>
          </View>
          <Pressable onPress={() => syncNow()} disabled={sync.syncing} hitSlop={8} style={({ pressed }) => [s.pill, pressed && { opacity: 0.6 }]}>
            {sync.syncing ? <ActivityIndicator size="small" color={c.accent.purple.text} /> : <Text style={s.pillText}>Sync now</Text>}
          </Pressable>
        </View>
      </View>

      {provider === 'email' && (
        <View style={[s.card, s.pad, { gap: 10 }]}>
          <Text style={s.title}>Change password</Text>
          <Field icon="lock-closed-outline" placeholder="New password" value={pw} onChangeText={setPw} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
          <Field icon="lock-closed-outline" placeholder="Repeat new password" value={pw2} onChangeText={setPw2} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
          {pwMsg && <Text style={[s.small, { color: pwMsg.ok ? c.accent.green.text : c.accent.red.text }]}>{pwMsg.text}</Text>}
          <View style={{ flexDirection: 'row' }}>
            <Button label="Update password" onPress={savePassword} disabled={busy || !pw} />
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row' }}>
        <Button label="Sign out" icon="log-out-outline" variant="secondary" onPress={onSignOut} disabled={busy} />
      </View>

      <Pressable onPress={onDelete} disabled={busy} style={({ pressed }) => [s.delete, pressed && { opacity: 0.6 }]}>
        <Text style={s.deleteText}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.item}>
      <Text style={s.itemText}>{label}</Text>
      <Text style={s.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 22 },
  list: { paddingVertical: 4 },
  pad: { padding: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16 },
  itemText: { ...F.regular, flex: 1, fontSize: 16, color: c.text },
  value: { ...F.regular, flexShrink: 1, fontSize: 15, color: c.muted },
  sep: { height: 1, backgroundColor: c.border, marginLeft: 16 },
  title: { ...F.semibold, fontSize: 15, color: c.text },
  small: { ...F.regular, fontSize: 13, color: c.muted },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { minWidth: 92, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.accent.purple.soft },
  pillText: { ...F.semibold, fontSize: 14, color: c.accent.purple.text },
  delete: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  deleteText: { ...F.semibold, fontSize: 16, color: c.accent.red.text },
}));
