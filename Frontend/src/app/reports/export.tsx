import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

const RESOURCES = ['customers', 'leads', 'followups', 'bookings', 'calls', 'tasks'];

export default function ReportExportScreen() {
  const { exportReport } = useStore();
  const [resource, setResource] = useState('calls');
  const [dateFrom, setDateFrom] = useState(ymd(new Date(Date.now() - 30 * 86400000)));
  const [dateTo, setDateTo] = useState(ymd(new Date()));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title="Export report" subtitle="CSV from GET /reports/export.php" back />
      <View style={{ padding: 20 }}>
        <ChoiceRow label="Resource" options={RESOURCES} value={resource} onChange={setResource} />
        <Field label="From" value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" />
        <Field label="To" value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
        {message ? <Text style={{ color: colors.forest, fontFamily: fonts.medium, marginBottom: 8 }}>{message}</Text> : null}
        <Button
          label="Download CSV"
          onPress={async () => {
            setError('');
            setMessage('');
            try {
              const csv = await exportReport({ resource, dateFrom, dateTo });
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${resource}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }
              setMessage(`Received ${csv.split(/\r?\n/).filter(Boolean).length} CSV lines.`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Export failed.');
            }
          }}
        />
      </View>
    </Screen>
  );
}
