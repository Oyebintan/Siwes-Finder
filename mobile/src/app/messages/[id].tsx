import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, listMessages, sendMessage, type ThreadMessage } from '@/api/client';

const POLL_INTERVAL_MS = 8000;

export default function MessageThreadScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const { messages: thread } = await listMessages(id);
      setMessages(thread);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load messages. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const { message } = await sendMessage(id, body);
      setMessages((prev) => [...prev, message]);
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your message. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.flex}>
        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton width="60%" height={44} radius={Radius.lg} />
            <View style={styles.loadingMine}>
              <Skeleton width="50%" height={44} radius={Radius.lg} />
            </View>
            <Skeleton width="45%" height={44} radius={Radius.lg} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                message="Say hello 👋 — messages about this application land here for both sides."
              />
            }
            renderItem={({ item }) => {
              const isMine = item.senderRole === user?.role;
              return (
                <Animated.View
                  entering={FadeInDown.duration(250)}
                  style={[
                    styles.bubble,
                    isMine
                      ? [styles.bubbleMine, { backgroundColor: theme.primary }]
                      : [styles.bubbleTheirs, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
                  ]}
                >
                  <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>{item.body}</ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.timestamp, isMine ? styles.timestampMine : undefined]}
                    themeColor={isMine ? undefined : 'textSecondary'}
                  >
                    {new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </ThemedText>
                </Animated.View>
              );
            }}
          />
        )}

        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.textSecondary}
            maxLength={2000}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <PressableScale
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: sending || !draft.trim() ? 0.5 : 1 }]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={20} color="#ffffff" />}
          </PressableScale>
        </Animated.View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loadingMine: {
    alignItems: 'flex-end',
  },
  errorBanner: {
    margin: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.one,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Spacing.one,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 10,
    lineHeight: 13,
  },
  timestampMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
    maxHeight: 110,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
