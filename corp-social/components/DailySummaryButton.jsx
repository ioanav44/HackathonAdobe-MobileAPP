import React, { useState } from 'react';
import { TouchableOpacity, View, Text, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { extractSummary } from '../lib/summary';
import { colors } from '../constants/theme';

/**
 * DailySummaryButton
 * Props:
 * - entries: Array<{ text: string, created_at?: string }>
 * - userLabel?: string (optional label shown in modal header)
 */
export default function DailySummaryButton({ entries = [], userLabel = 'Ziua ta' }) {
  const [visible, setVisible] = useState(false);
  const [summary, setSummary] = useState({ tasks: 0, meetings: 0, calls: 0, others: 0 });

  const summaryLines = [];
  summaryLines.push(`Task-uri: ${summary.tasks}`);
  summaryLines.push(`Întâlniri: ${summary.meetings}`);
  if (summary.calls > 0) summaryLines.push(`Apeluri: ${summary.calls}`);
  if (summary.others > 0) summaryLines.push(`Altele: ${summary.others}`);

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          // Compute summary and log for debugging
          try {
            const s = extractSummary(entries || []);
            setSummary(s);
            // Log for Metro / browser console to debug counts
            // eslint-disable-next-line no-console
            console.log('[DailySummaryButton] entries:', entries);
            // eslint-disable-next-line no-console
            console.log('[DailySummaryButton] computed summary:', s);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[DailySummaryButton] summary error', e);
          }
          setVisible(true);
        }}
        activeOpacity={0.9}
      >
        <Ionicons name="checkmark-done" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.card}>
            <Text style={styles.title}>{userLabel} — Rezumat</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {summaryLines.map((l, i) => (
                <Text key={i} style={styles.line}>{l}</Text>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Închide" onPress={() => setVisible(false)} style={{ flex: 1, backgroundColor: '#111827' }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 190,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10,
  },
  title: { fontWeight: '800', fontSize: 16, color: '#111827', marginBottom: 8 },
  line: { color: '#111827', fontSize: 15, paddingVertical: 6 },
});
