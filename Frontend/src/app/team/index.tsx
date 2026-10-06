import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import type { Executive, RolePermission } from '../../types';

const ROLE_NOTE: Record<Executive['role'], string> = {
  Admin: 'Full system access — manage users, settings, billing',
  Manager: 'Manage team, leads, and reports — no admin access',
  'Calling Executive': 'Handle leads, calls, follow-ups and bookings',
};

const MATRIX: Array<{ feature: string; admin: boolean; exec: boolean }> = [
  { feature: 'Dashboard', admin: true, exec: true },
  { feature: 'Customer Management', admin: true, exec: true },
  { feature: 'Lead Management', admin: true, exec: true },
  { feature: 'Booking Management', admin: true, exec: true },
  { feature: 'Call History', admin: true, exec: true },
  { feature: 'Call Recordings', admin: true, exec: false },
  { feature: 'Team Management', admin: true, exec: false },
  { feature: 'Reports & Analytics', admin: true, exec: false },
  { feature: 'Settings', admin: true, exec: false },
  { feature: 'Bulk Delete', admin: true, exec: false },
];

export default function TeamScreen() {
  const params = useLocalSearchParams<{ create?: string }>();
  const { data, session, saveExecutive, loadPermissions, savePermission } = useStore();
  const isAdmin = session?.role === 'admin';
  const openedCreate = useRef(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [editing, setEditing] = useState<Executive | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  const people = data.executives.filter((person) => {
    if (roleFilter !== 'All' && person.role !== roleFilter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${person.name} ${person.email}`.toLowerCase().includes(needle);
  });
  const count = (role: Executive['role']) => data.executives.filter((person) => person.role === role).length;
  const activeCount = data.executives.filter((person) => person.active).length;

  function startCreate() {
    setEditing(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setActive('Active');
    setError('');
    setOpen(true);
  }

  useEffect(() => {
    if (params.create === '1' && isAdmin && !openedCreate.current) {
      openedCreate.current = true;
      startCreate();
    }
  }, [params.create, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadPermissions().then(setPermissions).catch(() => undefined);
  }, [isAdmin, loadPermissions]);

  function startEdit(person: Executive) {
    setEditing(person);
    setName(person.name);
    setEmail(person.email);
    setPhone(person.phone);
    setPassword('');
    setActive(person.active ? 'Active' : 'Inactive');
    setError('');
    setOpen(true);
  }

  if (!isAdmin) {
    return (
      <Screen>
        <PageHeader title="Team & Users" subtitle="Admin only" back />
        <Card style={{ margin: 20 }}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>Admin access required</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
            Sign in as the VehicoCRM admin to add calling executives and set accounts active or inactive.
          </Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
            To add an executive: sign in as admin → open Profile → tap Team and Users → tap Add Calling Executive.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Team & Users" subtitle={`${data.executives.length} team members · ${activeCount} active`} back />
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Count label="Admins" value={count('Admin')} />
          <Count label="Executives" value={count('Calling Executive')} />
        </View>
        <Button label="Add Calling Executive" onPress={startCreate} />
        {open ? (
          <Card>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{editing ? 'Edit user' : 'Add executive'}</Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 12, marginTop: 4 }}>
              {editing ? `Editing ${editing.name}` : 'Create a calling executive account'}
            </Text>
            <Field label="Full name *" value={name} onChangeText={setName} placeholder="Sneha Reddy" />
            <Field
              label={editing ? 'Reset password (optional)' : 'Initial password *'}
              value={password}
              onChangeText={setPassword}
              placeholder={editing ? 'Leave blank to keep current password' : 'At least 12 characters'}
              secureTextEntry
            />
            <Field label="Email *" value={email} onChangeText={setEmail} placeholder="sneha@gdaisolutions.com" keyboardType="email-address" />
            <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="+91 98456 77889" keyboardType="phone-pad" />
            <Field label="Role" value="Calling Executive" onChangeText={() => undefined} editable={false} />
            <ChoiceRow label="Status" options={['Active', 'Inactive']} value={active} onChange={setActive} />
            <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginBottom: 10 }}>{ROLE_NOTE['Calling Executive']}</Text>
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label={editing ? 'Save changes' : 'Add user'}
              onPress={async () => {
                if (!name.trim() || !email.trim() || !phone.trim()) {
                  setError('Name, email, and phone are required.');
                  return;
                }
                if (!email.includes('@')) {
                  setError('Enter a valid email.');
                  return;
                }
                if (!isPlausibleMobile(phone)) {
                  setError('Enter a valid phone number.');
                  return;
                }
                if ((!editing || password) && password.length < 12) {
                  setError('Password must be at least 12 characters.');
                  return;
                }
                const row: Executive = {
                  id: editing?.id ?? makeId('U'),
                  name: name.trim(),
                  email: email.trim(),
                  phone: phone.trim(),
                  role: 'Calling Executive',
                  active: active === 'Active',
                  password: password || editing?.password,
                  leadCount: editing?.leadCount ?? 0,
                  callCount: editing?.callCount ?? 0,
                  conversionRate: editing?.conversionRate ?? 0,
                  lastActive: editing?.lastActive ?? 'Not signed in',
                  createdAt: editing?.createdAt ?? new Date().toISOString(),
                };
                await saveExecutive(row, !editing);
                setOpen(false);
              }}
            />
            <View style={{ height: 8 }} />
            <Button label="Cancel" tone="ghost" onPress={() => setOpen(false)} />
          </Card>
        ) : null}
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search team members" />
        <ChoiceRow label="Role" options={['All', 'Admin', 'Calling Executive']} value={roleFilter} onChange={setRoleFilter} />
        {people.map((person) => (
          <Card key={person.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{person.name}</Text>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 2 }}>{person.email}</Text>
              </View>
              <Pill label={person.role} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.ink, marginTop: 8 }}>{person.phone}</Text>
            <View style={{ marginTop: 8 }}><Pill label={person.active ? 'Active' : 'Inactive'} /></View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 8 }}>
              {person.leadCount} leads · {person.callCount} calls · {person.conversionRate}% conv.
            </Text>
            <Text style={{ fontFamily: fonts.regular, color: colors.faint, marginTop: 4 }}>
              {person.lastActive === 'Not signed in' ? person.lastActive : `Last active ${person.lastActive.slice(0, 16).replace('T', ' ')}`}
            </Text>
            {person.role === 'Calling Executive' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable onPress={() => startEdit(person)} style={chip}>
                  <Text style={chipText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => void saveExecutive({ ...person, active: !person.active }, false)}
                  style={chip}
                >
                  <Text style={chipText}>{person.active ? 'Deactivate' : 'Activate'}</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>Role and permission matrix</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 4, marginBottom: 10 }}>
            {permissions.length ? 'Live permissions from GET /permissions/index.php. Tap a row to toggle.' : 'Access is shown here for the calling desk. A live CRM still enforces it on the server.'}
          </Text>
          {permissions.length
            ? permissions.map((row) => (
              <Pressable
                key={`${row.role}-${row.permissionKey}`}
                onPress={async () => {
                  const next = await savePermission({ ...row, allowed: !row.allowed });
                  setPermissions((current) => current.map((item) => (item.role === next.role && item.permissionKey === next.permissionKey ? next : item)));
                }}
                style={{ flexDirection: 'row', paddingVertical: 6 }}
              >
                <Text style={{ flex: 1, fontFamily: fonts.medium, color: colors.ink }}>{row.role} · {row.permissionKey}</Text>
                <Text style={{ color: row.allowed ? colors.moss : colors.faint }}>{row.allowed ? 'Allowed' : 'Denied'}</Text>
              </Pressable>
            ))
            : MATRIX.map((row) => (
              <View key={row.feature} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                <Text style={{ flex: 1, fontFamily: fonts.medium, color: colors.ink }}>{row.feature}</Text>
                <Text style={{ width: 54, textAlign: 'center', color: row.admin ? colors.moss : colors.faint }}>{row.admin ? 'Admin' : '—'}</Text>
                <Text style={{ width: 64, textAlign: 'center', color: row.exec ? colors.moss : colors.faint }}>{row.exec ? 'Exec' : '—'}</Text>
              </View>
            ))}
        </Card>
      </View>
    </Screen>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontFamily: fonts.medium, color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{value}</Text>
    </Card>
  );
}

const chip = { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.paper };
const chipText = { fontFamily: fonts.semibold, color: colors.ink };
