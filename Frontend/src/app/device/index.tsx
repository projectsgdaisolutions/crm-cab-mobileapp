import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, PageHeader, Screen } from '../../components/ui';
import { formatWhen } from '../../lib/dates';
import { loadDeviceRegistration, type DeviceRegistration } from '../../lib/localAccount';
import { colors, fonts } from '../../theme';

export default function DeviceScreen() {
  const [device, setDevice] = useState<DeviceRegistration | null>(null);

  useEffect(() => {
    void loadDeviceRegistration().then(setDevice);
  }, []);

  return (
    <Screen>
      <PageHeader title="This device" subtitle="Reminders stay on the phone" back />
      <View style={{ padding: 20 }}>
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>Registered on this phone</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            A device token is stored here so follow-up and booking reminders can be listed in Notifications. Nothing is sent to a push provider.
          </Text>
          {device ? (
            <View style={{ marginTop: 14, gap: 6 }}>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>Device {device.id}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>Platform {device.platform}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>Token {device.token}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>Since {formatWhen(device.registeredAt)}</Text>
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 12 }}>Preparing this phone…</Text>
          )}
        </Card>
      </View>
    </Screen>
  );
}
