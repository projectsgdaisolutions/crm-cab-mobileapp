import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, PageHeader, Pill, Screen } from '../../components/ui';
import { formatDuration, formatWhen } from '../../lib/dates';
import { discoverRecordingFiles } from '../../native/callLog';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

const sample = require('../../../assets/sample-call.wav');

export default function RecordingsScreen() {
  const { data, attachRecording, playRecording } = useStore();
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void discoverRecordingFiles().then((files) => setFound(files.length));
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  function play(id: string, source: number | string) {
    playerRef.current?.remove();
    const player = createAudioPlayer(source);
    playerRef.current = player;
    player.play();
    setPlayingId(id);
  }

  return (
    <Screen>
      <PageHeader title="Recordings" subtitle="Only when the handset actually has a file" back />
      <Card style={{ margin: 20 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>Device limits</Text>
        <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 6, lineHeight: 20 }}>
          Automatic sync depends on the Android version, the dialer, and whether a recording file is readable. Missed calls often have no file. This app does not record the call itself. The CRM API lists recordings for admins only and has no upload route, so files you pick stay on this phone.
        </Text>
        <Text style={{ fontFamily: fonts.medium, color: colors.forest, marginTop: 8 }}>
          {found > 0 ? `${found} audio files found in common recording folders.` : 'No recording folder was readable in this runtime. Use upload for a file you can access.'}
        </Text>
      </Card>
      {message ? <Text style={{ marginHorizontal: 20, color: colors.clay, fontFamily: fonts.medium }}>{message}</Text> : null}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {data.recordings.length === 0 ? <EmptyState title="No recordings yet" body="After a call, attach a file from the outcome sheet or upload one here." /> : null}
        {data.recordings.map((item) => {
          const canPlay = Boolean(item.uri || item.remoteUrl || item.previewClip || item.id);
          return (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink }}>{item.name}</Text>
                <Pill label={item.availability} />
              </View>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
                {formatWhen(item.recordedAt)} · {formatDuration(item.durationSec)} {item.fileName ? `· ${item.fileName}` : ''}
                {item.fileSizeKb ? ` · ${item.fileSizeKb} KB` : ''}
                {item.access ? ` · ${item.access}` : ''}
                {item.executive ? ` · ${item.executive}` : ''}
              </Text>
              {item.note ? <Text style={{ fontFamily: fonts.regular, color: colors.ink, marginTop: 6 }}>{item.note}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  disabled={!canPlay}
                  onPress={() => {
                    if (item.previewClip && !item.uri && !item.remoteUrl) {
                      play(item.id, sample);
                      return;
                    }
                    void playRecording(item)
                      .then((source) => play(item.id, source))
                      .catch((error) => setMessage(error instanceof Error ? error.message : 'Playback failed.'));
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: canPlay ? 1 : 0.4 }}
                >
                  <Ionicons name={playingId === item.id ? 'pause' : 'play'} size={18} color={colors.forest} />
                  <Text style={{ fontFamily: fonts.bold, color: colors.forest }}>{item.previewClip && !item.uri ? 'Play sample' : 'Play'}</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
        <Pressable
          onPress={async () => {
            const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            const latest = data.calls[0];
            await attachRecording({
              callId: latest?.id,
              entityType: latest?.entityType,
              entityId: latest?.entityId,
              name: latest?.name ?? 'Unlinked recording',
              mobile: latest?.mobile ?? '',
              uri: asset.uri,
              fileName: asset.name,
              mimeType: asset.mimeType,
            });
            setMessage(`Attached ${asset.name}. It stays on this phone until the CRM API accepts the upload.`);
          }}
          style={{ backgroundColor: colors.forest, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
        >
          <Text style={{ color: colors.white, fontFamily: fonts.bold }}>Upload a recording file</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
