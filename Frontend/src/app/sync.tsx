import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, PageHeader, Pill, Screen } from '../components/ui';
import { formatDuration, formatWhen } from '../lib/dates';
import { formatPhone } from '../lib/phone';
import { matchDeviceCalls, type DeviceCall, type MatchedDeviceCall } from '../lib/syncCalls';
import { inspectCallLogAccess, readDeviceCallLog, requestCallLogAccess, type CallLogAccess } from '../native/callLog';
import { useStore } from '../state/store';
import { colors, fonts } from '../theme';

function previewLog(now = Date.now()): DeviceCall[] {
  return [
    { number: '+91 98450 11220', name: 'Ananya Iyer', direction: 'incoming', status: 'Answered', startedAt: now - 20 * 60_000, durationSec: 76 },
    { number: '9988776655', name: 'Kabir', direction: 'outgoing', status: 'Missed', startedAt: now - 50 * 60_000, durationSec: 0 },
    { number: '9811120394', direction: 'outgoing', status: 'Answered', startedAt: now - 26 * 60 * 60_000, durationSec: 40 },
    { number: '+91 93220 10001', name: null, direction: 'incoming', status: 'Missed', startedAt: now - 3 * 60 * 60_000, durationSec: 0 },
  ];
}

export default function SyncScreen() {
  const { data, importDeviceCalls } = useStore();
  const [access, setAccess] = useState<CallLogAccess | null>(null);
  const [rows, setRows] = useState<MatchedDeviceCall[]>([]);
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [createUnknown, setCreateUnknown] = useState(true);
  const [result, setResult] = useState('');

  async function load(kind: 'device' | 'preview') {
    let calls: DeviceCall[] = [];
    if (kind === 'device') {
      const permission = await requestCallLogAccess();
      setAccess(permission);
      if (permission.available && permission.granted) {
        const read = await readDeviceCallLog(40);
        calls = read.calls;
        setSource(read.detail);
      } else {
        calls = previewLog();
        setSource(permission.detail + ' Showing a preview log so matching can be checked.');
      }
    } else {
      const permission = await inspectCallLogAccess();
      setAccess(permission);
      calls = previewLog();
      setSource('Preview handset log. An Android development build reads the real call log after permission.');
    }
    const matched = matchDeviceCalls(data.calls, calls, data.customers, data.leads);
    setRows(matched);
    const initial: Record<string, boolean> = {};
    matched.forEach((row) => {
      initial[row.key] = !row.duplicate;
    });
    setSelected(initial);
    setResult('');
  }

  return (
    <Screen>
      <PageHeader title="Call log sync" subtitle="Match handset calls to the desk" back />
      <View style={{ padding: 20, gap: 12 }}>
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>What gets synced</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            Outgoing calls start in the native dialer. When the call ends, log the outcome. This screen also reads recent calls from the Android call log, matches numbers to customers and leads, and posts them in one request to POST /calls/bulk-sync.php.
          </Text>
          {access ? <Text style={{ marginTop: 8, fontFamily: fonts.medium, color: colors.forest }}>{access.detail}</Text> : null}
        </Card>
        <Button label="Read Android call log" tone="forest" onPress={() => load('device')} />
        <Button label="Preview matching" tone="ghost" onPress={() => load('preview')} />
        {source ? <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>{source}</Text> : null}
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
            label="Sync selected calls"
            onPress={async () => {
              const chosen = rows.filter((row) => selected[row.key]);
              const summary = await importDeviceCalls(chosen, createUnknown);
              setResult(`Added ${summary.added} calls${summary.leads ? ` and ${summary.leads} leads` : ''}.`);
              setRows([]);
            }}
          />
        ) : null}
        {result ? <Text style={{ fontFamily: fonts.semibold, color: colors.forest }}>{result}</Text> : null}
      </View>
    </Screen>
  );
}
