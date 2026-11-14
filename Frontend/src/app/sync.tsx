import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SyncGlyph, Toast } from '../components/Motion';
import { Button, Card, PageHeader, Pill, Screen } from '../components/ui';
import { formatDuration, formatWhen } from '../lib/dates';
import { formatPhone } from '../lib/phone';
import { matchDeviceCalls, type DeviceCall, type MatchedDeviceCall } from '../lib/syncCalls';
import { openCallLogSettings, readDeviceCallLog, requestCallLogAccess, type CallLogAccess } from '../native/callLog';
import { useStore } from '../state/store';
import { fonts, useColors } from '../theme';

export default function SyncScreen() {
  const colors = useColors();
  const { data, importDeviceCalls } = useStore();
  const [access, setAccess] = useState<CallLogAccess | null>(null);
  const [rows, setRows] = useState<MatchedDeviceCall[]>([]);
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [createUnknown, setCreateUnknown] = useState(true);
  const [result, setResult] = useState('');
  const [failures, setFailures] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState('');

  const matchedCount = rows.filter((row) => Boolean(row.entityId) && !row.duplicate).length;
  const unmatchedCount = rows.filter((row) => !row.entityId).length;
  const selectedCount = rows.filter((row) => selected[row.key]).length;

  async function load() {
    setResult('');
    setFailures([]);
    setSynced(false);
    const permission = await requestCallLogAccess();
    setAccess(permission);
    let calls: DeviceCall[] = [];
    if (permission.available && permission.granted) {
      const read = await readDeviceCallLog(40);
      calls = read.calls;
      setSource(read.detail);
    } else {
      calls = [];
      setSource(permission.detail);
    }
    const matched = matchDeviceCalls(data.calls, calls, data.customers, data.leads);
    setRows(matched);
    const initial: Record<string, boolean> = {};
    matched.forEach((row) => {
      initial[row.key] = !row.duplicate;
    });
    setSelected(initial);
  }

  return (
    <Screen overlay={toast ? <Toast message={toast} onDone={() => setToast('')} /> : null}>
      <PageHeader title="Call log sync" subtitle="Match handset calls to the desk" back />
      <View style={{ padding: 20, gap: 12 }}>
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>What gets synced</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            The app reads recent calls from your Android device after call-log permission is granted. It matches phone numbers with CRM customers and leads, then syncs selected calls.
          </Text>
          {access ? (
            <Text style={{ marginTop: 8, fontFamily: fonts.medium, color: access.granted ? colors.forest : colors.clay }}>
              Permission: {access.state === 'granted' ? 'granted' : access.state === 'permanently_denied' ? 'blocked in Android settings' : access.state === 'denied' ? 'denied' : 'unavailable'}
            </Text>
          ) : null}
        </Card>
        <Button label="Read Android call log" tone="forest" onPress={() => void load()} />
        {access?.state === 'permanently_denied' ? (
          <Button label="Open Android settings" tone="ghost" onPress={openCallLogSettings} />
        ) : null}
        {source ? <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>{source}</Text> : null}
        {rows.length > 0 ? (
          <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>
            {rows.length} retrieved · {matchedCount} matched · {unmatchedCount} unmatched · {selectedCount} selected
          </Text>
        ) : null}
        {rows.map((row) => {
          const on = selected[row.key];
          return (
            <Pressable key={row.key} onPress={() => setSelected((current) => ({ ...current, [row.key]: !current[row.key] }))}>
              <Card style={{ borderColor: on ? colors.forest : colors.line }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink, flex: 1 }}>{row.entityName || row.name || 'Unknown number'}</Text>
                  <Pill label={row.duplicate ? 'Already saved' : row.entityId ? 'Matched' : 'Unknown'} />
                </View>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
                  {formatPhone(row.number)} · {row.direction} · {row.status} · {formatDuration(row.durationSec)}
                </Text>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>{formatWhen(new Date(row.startedAt).toISOString())}</Text>
                <Text style={{ marginTop: 6, fontFamily: fonts.semibold, color: on ? colors.forest : colors.faint }}>{on ? 'Will sync' : 'Skipped'}</Text>
              </Card>
            </Pressable>
          );
        })}
        {rows.some((row) => !row.entityId) ? (
          <Pressable onPress={() => setCreateUnknown((value) => !value)}>
            <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>{createUnknown ? 'Unknown numbers will become new leads' : 'Unknown numbers stay unmatched'}</Text>
          </Pressable>
        ) : null}
        {rows.length > 0 ? (
          <Button
            label={syncing ? 'Syncing selected calls' : 'Sync selected calls'}
            onPress={async () => {
              if (syncing) return;
              const chosen = rows.filter((row) => selected[row.key]);
              if (chosen.length === 0) {
                setResult('Select at least one call before syncing.');
                return;
              }
              setSynced(false);
              setSyncing(true);
              setFailures([]);
              try {
                const summary = await importDeviceCalls(chosen, createUnknown);
                setSyncing(false);
                setSynced(summary.synced > 0 && summary.failed === 0);
                const lines = [
                  `Synced ${summary.synced} of ${summary.added} calls.`,
                  summary.leads ? `Created ${summary.leads} lead${summary.leads === 1 ? '' : 's'}.` : '',
                  summary.failed ? `${summary.failed} failed.` : '',
                  summary.skipped ? `${summary.skipped} not sent.` : '',
                ].filter(Boolean);
                setResult(lines.join(' '));
                setFailures(summary.errors);
                setToast(summary.synced > 0 ? `${summary.synced} calls synced` : 'No calls were synced');
                if (summary.synced > 0) setRows([]);
              } catch (error) {
                setSyncing(false);
                setSynced(false);
                const message = error instanceof Error ? error.message : 'Sync failed.';
                setResult(message);
                setFailures([message]);
                setToast(message);
              }
            }}
          />
        ) : null}
        {syncing || synced ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SyncGlyph spinning={syncing} done={synced} />
            {result ? <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>{result}</Text> : null}
          </View>
        ) : result ? <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>{result}</Text> : null}
        {failures.map((message, index) => (
          <Text key={`${index}-${message}`} style={{ fontFamily: fonts.medium, color: colors.clay }}>{message}</Text>
        ))}
      </View>
    </Screen>
  );
}
