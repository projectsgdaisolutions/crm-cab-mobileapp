import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, FilterChips, PageHeader, Screen } from '../../components/ui';
import { formatWhen } from '../../lib/dates';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function NotesScreen() {
  const { data } = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const rows = data.notes.filter((note) => filter === 'All' || note.entityType === filter.toLowerCase());
  return (
    <Screen>
      <PageHeader
        title="Notes"
        subtitle="Remarks on customers and leads"
        back
        right={<Pressable onPress={() => router.push('/note/new')}><Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Add</Text></Pressable>}
      />
      <View style={{ height: 12 }} />
      <FilterChips options={['All', 'Customer', 'Lead']} value={filter} onChange={setFilter} />
      <View style={{ padding: 20, gap: 10 }}>
        {rows.length === 0 ? <EmptyState title="No notes yet" body="Notes stay with the customer or lead so the next call starts with context." actionLabel="Add note" onAction={() => router.push('/note/new')} /> : null}
        {rows.map((note) => (
          <Pressable key={note.id} onPress={() => router.push(note.entityType === 'customer' ? `/customer/${note.entityId}` : `/lead/${note.entityId}`)}>
            <Card>
              <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>{note.entityName}</Text>
              <Text style={{ fontFamily: fonts.regular, color: colors.ink, marginTop: 6, lineHeight: 20 }}>{note.body}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 8 }}>{note.createdBy} · {formatWhen(note.createdAt)} · {note.syncState === 'synced' ? 'Synced' : 'On device'}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
