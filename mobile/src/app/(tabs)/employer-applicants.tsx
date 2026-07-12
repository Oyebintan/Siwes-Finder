import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  bulkUpdateApplications,
  listEmployerApplications,
  updateApplicationStatus,
  type EmployerApplication,
} from '@/api/client';

const STATUS_TONE: Record<EmployerApplication['status'], BadgeTone> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};

const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

export default function EmployerApplicantsScreen() {
  const theme = useTheme();

  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await listEmployerApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applicants. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDecision = async (id: string, status: 'Accepted' | 'Rejected') => {
    setActioningId(id);
    try {
      await updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this application. Check your connection.');
    } finally {
      setActioningId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDecision = async (status: 'Accepted' | 'Rejected') => {
    if (selected.size === 0 || bulkActing) return;
    setBulkActing(true);
    setError('');
    try {
      const ids = Array.from(selected);
      await bulkUpdateApplications(ids, status);
      setApplications((prev) => prev.map((a) => (ids.includes(a._id) ? { ...a, status } : a)));
      setSelected(new Set());
      setSelectMode(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update selected applications. Check your connection.');
    } finally {
      setBulkActing(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader
          title="Applicants"
          subtitle="Review and decide on applications"
          right={
            applications.some((a) => a.status === 'Pending') ? (
              <Button
                label={selectMode ? 'Cancel' : 'Select'}
                icon={selectMode ? 'close' : 'checkbox-outline'}
                variant="secondary"
                small
                onPress={() => {
                  setSelectMode((v) => !v);
                  setSelected(new Set());
                }}
              />
            ) : undefined
          }
        />

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(a) => a._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="No applicants yet"
                message="Applications to your posted opportunities will land here."
              />
            }
            renderItem={({ item, index }) => {
              const showCheckbox = selectMode && item.status === 'Pending';
              const isSelected = selected.has(item._id);
              return (
                <Animated.View
                  entering={FadeInDown.duration(320).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
                >
                  <Card style={isSelected ? { borderColor: theme.primary, borderWidth: 1.5 } : undefined}>
                    <PressableScale
                      disabled={!showCheckbox}
                      onPress={() => toggleSelected(item._id)}
                      style={styles.cardHeader}
                      haptic={showCheckbox}
                    >
                      {showCheckbox ? (
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? theme.primary : theme.textSecondary}
                        />
                      ) : (
                        <InitialAvatar name={item.student?.name ?? '?'} />
                      )}
                      <View style={styles.cardHeaderText}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {item.student?.name ?? 'Unknown applicant'}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {item.job?.title ?? 'Opportunity no longer available'}
                        </ThemedText>
                      </View>
                      <Badge label={item.status} tone={STATUS_TONE[item.status]} />
                    </PressableScale>

                    {item.student?.university || item.student?.courseOfStudy ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {[item.student.courseOfStudy, item.student.university].filter(Boolean).join(' · ')}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.student?.email}
                    </ThemedText>

                    <View style={styles.actionRow}>
                      <Button
                        label="Message"
                        icon="chatbubble-ellipses-outline"
                        variant="ghost"
                        small
                        onPress={() => router.push(`/messages/${item._id}`)}
                      />
                      {item.status === 'Pending' ? (
                        <View style={styles.decisionRow}>
                          <Button
                            label="Reject"
                            icon="close"
                            variant="danger"
                            small
                            onPress={() => handleDecision(item._id, 'Rejected')}
                            disabled={actioningId === item._id}
                          />
                          <Button
                            label="Accept"
                            icon="checkmark"
                            small
                            onPress={() => handleDecision(item._id, 'Accepted')}
                            loading={actioningId === item._id}
                          />
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </Animated.View>
              );
            }}
          />
        )}

        {selectMode && selected.size > 0 ? (
          <Animated.View
            entering={FadeInUp.duration(250)}
            exiting={FadeOut.duration(150)}
            style={[styles.bulkBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <ThemedText type="smallBold">{selected.size} selected</ThemedText>
            <View style={styles.bulkActions}>
              <Button
                label="Reject selected"
                variant="danger"
                small
                onPress={() => handleBulkDecision('Rejected')}
                disabled={bulkActing}
                style={styles.bulkButton}
              />
              <Button
                label="Accept selected"
                small
                onPress={() => handleBulkDecision('Accepted')}
                loading={bulkActing}
                style={styles.bulkButton}
              />
            </View>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bulkBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bulkButton: {
    flex: 1,
  },
});
