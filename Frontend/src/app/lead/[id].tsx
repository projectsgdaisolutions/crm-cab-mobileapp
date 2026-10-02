import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HistorySections } from '../../components/HistorySections';
import { Card, ChoiceRow, Muted, PageHeader, Pill, Screen } from '../../components/ui';
import { formatDay } from '../../lib/dates';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { LEAD_STATUSES, type LeadStatus } from '../../types';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveLead } = useStore();
  const router = useRouter();
  const lead = data.leads.find((item) => item.id === id);
  if (!lead) {
    return (
      <Screen>
        <PageHeader title="Lead" back />
        <Muted style={{ margin: 20 }}>This lead is not on the desk.</Muted>
      </Screen>
    );
  }
  return (
    <Screen>
      <PageHeader
        title={lead.name}
        subtitle={lead.id}
        back
        right={
          <Pressable onPress={() => router.push(`/lead/new?id=${lead.id}`)}>
            <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Edit</Text>
          </Pressable>
        }
      />
      <Card style={{ margin: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pill label={lead.status} />
          <Pill label={lead.priority} />
        </View>
        <Text style={{ marginTop: 10, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{formatPhone(lead.mobile)}</Text>
        {lead.email ? <Muted>{lead.email}</Muted> : null}
        <Text style={{ marginTop: 10, fontFamily: fonts.medium, color: colors.ink }}>{lead.requirement}</Text>
        <Text style={{ marginTop: 8, fontFamily: fonts.medium, color: colors.ink }}>{lead.pickup} → {lead.drop}</Text>
        <Muted>{formatDay(lead.travelDate)} at {lead.travelTime} · {lead.source}</Muted>
      </Card>
      <View style={{ marginHorizontal: 20 }}>
        <ChoiceRow
          label="Lead status"
          options={LEAD_STATUSES}
          value={lead.status}
          onChange={(status: LeadStatus) => void saveLead({ ...lead, status }, false)}
        />
      </View>
      <HistorySections entityType="lead" entityId={lead.id} name={lead.name} mobile={lead.mobile} />
    </Screen>
  );
}
