import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';

// A small notebook-like notes/checkbox list stored per-user-per-day in AsyncStorage.
// Key format: notes:{userEmail}:{YYYY-MM-DD}

function todayKey(userEmail = 'guest') {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  const safe = (userEmail || 'guest').replace(/[^a-z0-9@._-]/gi, '_');
  return `notes:${safe}:${day}`;
}

export default function DailyNotesButton({ userEmail = 'guest' }) {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]); // { id, text, done }
  const [text, setText] = useState('');

  const key = todayKey(userEmail);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) setItems(JSON.parse(raw));
        else setItems([]);
      } catch (e) {
        console.warn('Load notes error', e);
      }
    })();
  }, [visible, key]);

  const persist = async (next) => {
    try {
      setItems(next);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (e) { console.warn('Save notes error', e); }
  };

  const add = async () => {
    if (!text.trim()) return;
    const next = [{ id: Date.now().toString(), text: text.trim(), done: false }, ...items];
    setText('');
    await persist(next);
  };

  const toggle = async (id) => {
    const next = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
    await persist(next);
  };

  const remove = async (id) => {
    const next = items.filter(i => i.id !== id);
    await persist(next);
  };

  const clearAll = async () => {
    await persist([]);
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)} activeOpacity={0.9}>
        <Ionicons name="create-outline" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Carnetel — Notițe de azi</Text>
              <TouchableOpacity onPress={() => setVisible(false)}><Ionicons name="close" size={22} color="#111" /></TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Adaugă un task..."
                style={styles.input}
                placeholderTextColor="#777"
                onSubmitEditing={add}
              />
              <TouchableOpacity onPress={add} style={styles.addBtn}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
            </View>

            <FlatList
              data={items}
              keyExtractor={i => i.id}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={[styles.noteRow, item.done ? styles.noteDone : null]}>
                  <TouchableOpacity onPress={() => toggle(item.id)} style={styles.checkBtn}>
                    {item.done ? <Ionicons name="checkmark-circle" size={22} color="#16A34A" /> : <Ionicons name="ellipse-outline" size={22} color="#9CA3AF" />}
                  </TouchableOpacity>
                  <Text style={[styles.noteText, item.done ? styles.noteTextDone : null]}>{item.text}</Text>
                  <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}><Ionicons name="trash" size={18} color="#EF4444" /></TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>Niciun task pentru azi.</Text>}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button title="Închide" onPress={() => setVisible(false)} style={{ flex: 1, backgroundColor: '#111827' }} />
              <Button title="Șterge toate" onPress={clearAll} style={{ flex: 1, backgroundColor: '#B91C1C' }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 200,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  modalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 18 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#FFF8EA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F5E6C8' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', color: '#111' },
  addBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  list: { maxHeight: 320 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F0E6D6' },
  noteText: { flex: 1, color: '#111827', fontSize: 15 },
  noteDone: { opacity: 0.6 },
  noteTextDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  checkBtn: { width: 30, alignItems: 'center' },
  delBtn: { paddingHorizontal: 8 },
});
