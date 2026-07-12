import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
        {error ? (
          <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.error }]}>
            <ThemedText themeColor="error" type="small">
              {error}
            </ThemedText>
          </ThemedView>
        ) : null}

        {loading ? (
          <ThemedView style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </ThemedView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary">No messages yet. Say hello 👋</ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => {
              const isMine = item.senderRole === user?.role;
              return (
                <ThemedView
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
                    style={[styles.timestamp, isMine ? styles.bubbleTextMine : undefined]}
                    themeColor={isMine ? undefined : 'textSecondary'}
                  >
                    {new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </ThemedText>
                </ThemedView>
              );
            }}
          />
        )}

        <ThemedView style={[styles.inputRow, { borderColor: theme.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.textSecondary}
            maxLength={2000}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: sending || !draft.trim() ? 0.6 : 1 }]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.sendButtonText}>Send</ThemedText>}
          </Pressable>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  errorBanner: {
    margin: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.half,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderBottomLeftRadius: Spacing.half,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
  },
  sendButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
