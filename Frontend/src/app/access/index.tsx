import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, PageHeader, Screen } from '../../components/ui';
import { ACCESS_KEYS, loadAccess, saveAccess, type AccessMap } from '../../lib/localAccount';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function AccessScreen() {
  const { session } = useStore();
  const [access, setAccess] = useState<AccessMap | null>(null);

  useEffect(() => {
    void loadAccess().then(setAccess);
  }, []);

  return (
    <Screen>
      <PageHeader title="Access" subtitle="Role permissions on this phone" back />
      <View style={{ padding: 20 }}>
        {session?.role !== 'admin' ? (
          <Card>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, lineHeight: 20 }}>
              Only an admin can change access. Sign in as admin@gdaisolutions.com to review these switches.
            </Text>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginBottom: 8, lineHeight: 20 }}>
              These switches are saved on this phone. They do not call the permissions API.
            </Text>
            {ACCESS_KEYS.map((item) => {
              const on = access?.[item.key] !== false;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (!access) return;
                    const next = { ...access, [item.key]: !on };
                    setAccess(next);
                    void saveAccess(next);
                  }}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}
                >
                  <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>{item.label}</Text>
                  <Text style={{ fontFamily: fonts.bold, color: on ? colors.moss : colors.muted }}>{on ? 'On' : 'Off'}</Text>
                </Pressable>
              );
            })}
          </Card>
        )}
      </View>
    </Screen>
  );
}
