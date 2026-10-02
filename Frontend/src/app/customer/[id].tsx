import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HistorySections } from '../../components/HistorySections';
import { Card, ChoiceRow, Muted, PageHeader, Screen } from '../../components/ui';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { CUSTOMER_STATUSES, type CustomerStatus } from '../../types';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveCustomer } = useStore();
  const router = useRouter();
  const customer = data.customers.find((item) => item.id === id);
  if (!customer) {
    return (
      <Screen>
        <PageHeader title="Customer" back />
        <Muted style={{ margin: 20 }}>This customer is not on the desk.</Muted>
      </Screen>
    );
  }
  return (
    <Screen>
      <PageHeader
        title={customer.name}
        subtitle={customer.id}
        back
        right={
          <Pressable onPress={() => router.push(`/customer/new?id=${customer.id}`)}>
            <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Edit</Text>
          </Pressable>
        }
      />
      <Card style={{ margin: 20 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{formatPhone(customer.mobile)}</Text>
        {customer.alternate ? <Muted>Alt {formatPhone(customer.alternate)}</Muted> : null}
        {customer.email ? <Muted>{customer.email}</Muted> : null}
        {customer.city ? <Muted>{customer.city}</Muted> : null}
        <Text style={{ marginTop: 10, fontFamily: fonts.medium, color: colors.ink }}>{customer.pickup} → {customer.drop}</Text>
        {customer.address ? <Muted>{customer.address}</Muted> : null}
        <Muted style={{ marginTop: 8 }}>Source {customer.source} · Assigned {customer.assignedTo}</Muted>
        {customer.notes ? <Text style={{ marginTop: 8, fontFamily: fonts.regular, color: colors.ink }}>{customer.notes}</Text> : null}
      </Card>
      <View style={{ marginHorizontal: 20 }}>
        <ChoiceRow
          label="Customer status"
          options={CUSTOMER_STATUSES}
          value={customer.status}
          onChange={(status: CustomerStatus) => void saveCustomer({ ...customer, status }, false)}
        />
      </View>
      <HistorySections entityType="customer" entityId={customer.id} name={customer.name} mobile={customer.mobile} />
    </Screen>
  );
}
