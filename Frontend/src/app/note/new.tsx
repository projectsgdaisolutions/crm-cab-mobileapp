import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, PageHeader, Screen } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import type { EntityType } from '../../types';

export default function NoteFormScreen() {
  const params = useLocalSearchParams<{ entityType?: string; entityId?: string; name?: string }>();
  const entityType = (params.entityType === 'lead' ? 'lead' : 'customer') as EntityType;
  const entityId = params.entityId ?? '';
  const name = params.name ?? '';
  const { addNote, data } = useStore();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState(entityId);
  const [pickedType, setPickedType] = useState<EntityType>(entityType);
  const [error, setError] = useState('');
  const parties = [
    ...data.customers.map((item) => ({ id: item.id, type: 'customer' as const, name: item.name })),
    ...data.leads.map((item) => ({ id: item.id, type: 'lead' as const, name: item.name })),
  ];
  const selected = parties.find((item) => item.id === picked && item.type === pickedType);

  return (
    <Screen>
      <PageHeader title="Add note" subtitle={selected?.name ?? name} back />
      <View style={{ padding: 20 }}>
        {!entityId ? (
          <View style={{ marginBottom: 12 }}>
            {parties.slice(0, 8).map((party) => (
              <Text
                key={`${party.type}-${party.id}`}
                onPress={() => {
                  setPicked(party.id);
                  setPickedType(party.type);
                }}
                style={{
                  paddingVertical: 8,
                  fontFamily: fonts.semibold,
                  color: party.id === picked ? colors.saffronDeep : colors.ink,
                }}
              >
                {party.name} · {party.type}
              </Text>
            ))}
          </View>
        ) : null}
        <Field label="Remarks" value={body} onChangeText={setBody} multiline placeholder="What should the next caller know?" />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 }}>{error}</Text> : null}
        <Button
          label="Save note"
          onPress={async () => {
            const target = parties.find((item) => item.id === picked && item.type === pickedType) ?? parties.find((item) => item.id === picked);
            if (!target || !body.trim()) {
              setError('Choose a customer or lead and write the note.');
              return;
            }
            await addNote({ entityType: target.type, entityId: target.id, entityName: target.name, body: body.trim() });
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}
