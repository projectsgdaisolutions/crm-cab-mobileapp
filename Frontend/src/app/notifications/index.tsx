import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, PageHeader, Screen } from '../../components/ui';
import { formatWhen } from '../../lib/dates';
import { useNotifications } from '../../state/useNotifications';
import { colors, fonts } from '../../theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { items, read, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <Screen>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} new` : 'You are caught up'}
        back
        right={
          unreadCount ? (
            <Pressable onPress={() => void markAllRead()} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Mark all</Text>
            </Pressable>
          ) : null
        }
      />
      <View style={{ padding: 20, gap: 10 }}>
        {items.length === 0 ? (
          <EmptyState title="No notifications." body="Follow-ups, new leads, bookings, and missed calls will show up here. Reports stay on the web desk." />
        ) : null}
        {items.map((item) => {
          const seen = read.has(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                void markRead(item);
                router.push(item.href as never);
              }}
            >
              <Card style={{ backgroundColor: seen ? colors.paper : '#F3F1FF' }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      backgroundColor: seen ? colors.line : colors.saffron,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 15 }}>{item.title}</Text>
                    <Text style={{ fontFamily: fonts.regular, color: colors.ink, marginTop: 4 }}>{item.description}</Text>
                    <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 6, fontSize: 12 }}>{formatWhen(item.at)}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
