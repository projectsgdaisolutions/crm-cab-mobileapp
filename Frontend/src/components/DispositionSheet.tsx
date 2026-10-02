import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPhone } from '../lib/phone';
import { useStore } from '../state/store';
import { CALL_STATUSES, type CallStatus } from '../types';
import { colors, fonts } from '../theme';
import { Button, ChoiceRow, Field, Muted } from './ui';

export function DispositionSheet() {
  const { pendingCall, dismissDisposition, saveDisposition } = useStore();
  const [status, setStatus] = useState<CallStatus>('Answered');
  const [minutes, setMinutes] = useState('2');
  const [seconds, setSeconds] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<{ uri: string; fileName: string; mimeType?: string } | null>(null);
  const [error, setError] = useState('');

  if (!pendingCall) return null;

  async function pickRecording() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, fileName: asset.name, mimeType: asset.mimeType });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismissDisposition}>
      <Pressable style={styles.backdrop} onPress={dismissDisposition}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>Call outcome</Text>
          <Text style={styles.title}>{pendingCall.name}</Text>
          <Muted>{formatPhone(pendingCall.mobile)}</Muted>
          <Text style={styles.help}>
            {pendingCall.openedNative
              ? 'The native dialer placed this call on the phone SIM. Sync the result to the customer record.'
              : 'Log what happened. On Android the Call button opens the handset dialer before this sheet.'}
          </Text>
          <ChoiceRow label="Status" options={CALL_STATUSES} value={status} onChange={setStatus} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Seconds" value={seconds} onChangeText={setSeconds} keyboardType="number-pad" />
            </View>
          </View>
          <Field label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="What was agreed?" multiline />
          <Pressable onPress={pickRecording} style={styles.file}>
            <Ionicons name="mic-outline" size={18} color={colors.forest} />
            <Text style={styles.fileText}>{file ? file.fileName : 'Attach a recording if the phone saved one'}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Save to call history"
            onPress={async () => {
              const durationSec = Math.max(0, Number(minutes) || 0) * 60 + Math.min(59, Math.max(0, Number(seconds) || 0));
              if (status === 'Answered' && durationSec <= 0) {
                setError('Answered calls need a duration.');
                return;
              }
              setError('');
              await saveDisposition({ status, durationSec, remarks, recording: file ?? undefined });
              setRemarks('');
              setFile(null);
              setMinutes('2');
              setSeconds('0');
              setStatus('Answered');
            }}
          />
          <Pressable onPress={dismissDisposition} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,36,32,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, marginBottom: 12 },
  kicker: { color: colors.saffronDeep, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, marginTop: 4 },
  help: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginVertical: 10 },
  file: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  fileText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 },
  skip: { color: colors.muted, fontFamily: fonts.semibold },
});
