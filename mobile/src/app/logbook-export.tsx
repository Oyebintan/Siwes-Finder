import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SkeletonList } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { ApiError, getProfile, listLogbookEntries, type LogbookEntry, type Profile } from '@/api/client';

type WeekGroup = { weekNumber: number; entries: LogbookEntry[] };

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A simple, self-contained HTML document -- expo-print renders it to PDF
// on-device (no server round trip). Kept deliberately plain (system font
// stack, inline styles) since it only ever exists as a print target, never
// rendered in-app.
function buildLogbookHtml(profile: Profile | null, groups: WeekGroup[], totalHours: number): string {
  const studentName = escapeHtml(profile?.name ?? 'Student');
  const meta = escapeHtml([profile?.university, profile?.courseOfStudy].filter(Boolean).join(' · '));

  const sections = groups
    .map(
      (group) => `
        <h2>Week ${group.weekNumber}</h2>
        <table>
          <tr><th>Day</th><th>Date</th><th>Activity</th><th>Hours</th><th>Status</th></tr>
          ${group.entries
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHtml(entry.dayOfWeek)}</td>
                  <td>${new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>${escapeHtml(entry.activityDescription)}</td>
                  <td>${entry.hoursWorked}h</td>
                  <td>${entry.isApproved ? 'Approved' : 'Pending'}</td>
                </tr>`
            )
            .join('')}
        </table>`
    )
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0b1220; padding: 28px; }
      h1 { color: #2557eb; margin: 0 0 4px; font-size: 20px; }
      .meta { color: #5b6472; font-size: 12px; margin-bottom: 24px; }
      h2 { font-size: 14px; margin: 20px 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
      th, td { border: 1px solid #e2e6ee; padding: 6px 8px; text-align: left; }
      th { background: #f6f7fa; }
    </style>
  </head>
  <body>
    <h1>SIWES Logbook — ${studentName}</h1>
    <div class="meta">${meta}${meta ? ' · ' : ''}${totalHours} hour${totalHours === 1 ? '' : 's'} logged total</div>
    ${sections || '<p>No entries yet.</p>'}
  </body>
</html>`;
}

// Reachable from the logbook tab's header action -- generates a PDF of
// every logged entry (grouped by week, same shape as the on-screen list)
// on-device via expo-print, then opens the OS share sheet via
// expo-sharing so the student can send it to their school/employer or
// save it. No server round trip, no new backend route.
export default function LogbookExportScreen() {
  const toast = useToast();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entryList, profileRes] = await Promise.all([listLogbookEntries(), getProfile()]);
      setEntries(entryList);
      setProfile(profileRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your logbook. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const groups = useMemo<WeekGroup[]>(() => {
    const byWeek = new Map<number, WeekGroup>();
    entries.forEach((entry) => {
      let group = byWeek.get(entry.weekNumber);
      if (!group) {
        group = { weekNumber: entry.weekNumber, entries: [] };
        byWeek.set(entry.weekNumber, group);
      }
      group.entries.push(entry);
    });
    return Array.from(byWeek.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  }, [entries]);

  const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
  const approvedCount = entries.filter((entry) => entry.isApproved).length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = buildLogbookHtml(profile, groups, totalHours);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share your logbook' });
      } else {
        toast('PDF generated, but sharing is not available on this device.', 'error');
      }
    } catch {
      toast("Couldn't generate the PDF — try again.", 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {error ? <ErrorBanner message={error} onRetry={load} style={styles.errorBanner} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <SkeletonList count={3} />
          </View>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Nothing to export yet"
            message="Log a few entries first, then come back here to share a PDF."
          />
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.container}>
              <Animated.View entering={FadeInDown.duration(320)}>
                <Card style={styles.summaryCard}>
                  <ThemedText type="smallBold">Summary</ThemedText>
                  <View style={styles.summaryRow}>
                    <Badge label={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`} tone="neutral" icon="book-outline" />
                    <Badge label={`${totalHours}h logged`} tone="primary" icon="time-outline" />
                    <Badge label={`${approvedCount} approved`} tone="success" icon="checkmark-circle-outline" />
                  </View>
                </Card>
              </Animated.View>

              {groups.map((group, index) => (
                <Animated.View key={group.weekNumber} entering={FadeInDown.duration(320).delay(Math.min(index, 6) * 50)}>
                  <Card style={styles.weekCard}>
                    <ThemedText type="smallBold">Week {group.weekNumber}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'} ·{' '}
                      {group.entries.reduce((sum, e) => sum + e.hoursWorked, 0)}h
                    </ThemedText>
                  </Card>
                </Animated.View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Button label="Share as PDF" icon="share-outline" onPress={handleExport} loading={exporting} />
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingWrap: {
    padding: Spacing.four,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  summaryCard: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  weekCard: {
    gap: Spacing.half,
  },
  footer: {
    padding: Spacing.four,
  },
});
