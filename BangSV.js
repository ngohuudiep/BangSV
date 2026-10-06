import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, Modal, TextInput,
  Alert, StyleSheet, SafeAreaView, ScrollView, Platform, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getLocales } from 'expo-localization';

// ---------- Đa ngôn ngữ (tự theo cài đặt thiết bị) ----------
const STRINGS = {
  en: {
    appName: 'Student Manager', empty: 'No students yet', add: 'Add',
    edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close',
    yes: 'Yes', no: 'No', name: 'Full name', id: 'Student ID', email: 'Email',
    avatar: 'Avatar (image URL)', pick: 'Pick from device',
    addTitle: 'Add student', editTitle: 'Edit student', detailTitle: 'Student details',
    confirmEdit: 'Do you want to edit this student?',
    confirmDelete: 'Do you want to delete this student?',
    confirm: 'Confirm', required: 'Name, ID and email are required',
    badEmail: 'Invalid email', dupId: 'Student ID already exists',
    noPerm: 'Permission to access photos is required',
  },
  vi: {
    appName: 'Quản lý sinh viên', empty: 'Chưa có sinh viên', add: 'Thêm',
    edit: 'Sửa', del: 'Xóa', save: 'Lưu', cancel: 'Hủy', close: 'Đóng',
    yes: 'Có', no: 'Không', name: 'Họ tên', id: 'MSSV', email: 'Email',
    avatar: 'Ảnh avatar (link ảnh)', pick: 'Chọn từ thiết bị',
    addTitle: 'Thêm sinh viên', editTitle: 'Sửa sinh viên', detailTitle: 'Thông tin sinh viên',
    confirmEdit: 'Bạn có muốn sửa thông tin SV không?',
    confirmDelete: 'Bạn có muốn xóa thông tin SV không?',
    confirm: 'Xác nhận', required: 'Vui lòng nhập họ tên, MSSV và email',
    badEmail: 'Email không hợp lệ', dupId: 'MSSV đã tồn tại',
    noPerm: 'Cần cấp quyền truy cập ảnh',
  },
};
const lang = (getLocales()[0]?.languageCode || 'en') === 'vi' ? 'vi' : 'en';
const t = (k) => STRINGS[lang][k];

const KEY = 'students_v1';
const EMPTY = { name: '', mssv: '', email: '', avatar: '' };

const Avatar = ({ uri, name, size = 52 }) =>
  uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#4f6df5', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size / 2.2, fontWeight: '700' }}>{(name || '?')[0].toUpperCase()}</Text>
    </View>
  );

const Field = ({ label, value, onChangeText, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      {...props}
    />
  </View>
);

export default function BangSV() {
  const [students, setStudents] = useState([]);
  const [screen, setScreen] = useState('list'); // 'list' | 'form'
  const [detail, setDetail] = useState(null);   // Trang 2: dialog chi tiết
  const [form, setForm] = useState(EMPTY);      // Trang 3: form thêm/sửa
  const [editingId, setEditingId] = useState(null);

  // Đọc dữ liệu từ local storage
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => v && setStudents(JSON.parse(v))).catch(() => {});
  }, []);

  // Đồng bộ mọi thay đổi xuống local storage
  const persist = (list) => {
    setStudents(list);
    AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  };

  const confirm = (message, onYes) =>
    Alert.alert(t('confirm'), message, [
      { text: t('no'), style: 'cancel' },
      { text: t('yes'), onPress: onYes },
    ]);

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setScreen('form'); };
  const openEdit = (s) => { setForm(s); setEditingId(s.id); setDetail(null); setScreen('form'); };

  const handleDelete = (s) =>
    confirm(t('confirmDelete'), () => { persist(students.filter((x) => x.id !== s.id)); setDetail(null); });

  const doSave = () => {
    if (editingId) persist(students.map((x) => (x.id === editingId ? { ...form, id: editingId } : x)));
    else persist([...students, { ...form, id: Date.now().toString() }]);
    setScreen('list');
  };

  const handleSave = () => {
    const f = { ...form, name: form.name.trim(), mssv: form.mssv.trim(), email: form.email.trim() };
    if (!f.name || !f.mssv || !f.email) return Alert.alert(t('required'));
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return Alert.alert(t('badEmail'));
    if (students.some((x) => x.mssv === f.mssv && x.id !== editingId)) return Alert.alert(t('dupId'));
    setForm(f);
    if (editingId) confirm(t('confirmEdit'), doSave); // sửa -> hỏi xác nhận
    else doSave();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t('noPerm'));
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!r.canceled) setForm({ ...form, avatar: r.assets[0].uri });
  };

  // ---------- Trang 3: form thêm / sửa ----------
  if (screen === 'form') {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.header}>{editingId ? t('editTitle') : t('addTitle')}</Text>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Avatar uri={form.avatar} name={form.name} size={96} />
          </View>
          <Field label={t('name')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoCapitalize="words" />
          <Field label={t('id')} value={form.mssv} onChangeText={(v) => setForm({ ...form, mssv: v })} />
          <Field label={t('email')} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
          <Field label={t('avatar')} value={form.avatar} onChangeText={(v) => setForm({ ...form, avatar: v })} keyboardType="url" />
          <TouchableOpacity style={s.btnOutline} onPress={pickImage}>
            <Text style={s.btnOutlineText}>{t('pick')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#999', flex: 1 }]} onPress={() => setScreen('list')}>
              <Text style={s.btnText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={handleSave}>
              <Text style={s.btnText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- Trang 1: danh sách ----------
  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.header}>{t('appName')}</Text>
      <FlatList
        data={students}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        ListEmptyComponent={<Text style={s.empty}>{t('empty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setDetail(item)}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>{item.mssv}</Text>
            </View>
            <Avatar uri={item.avatar} name={item.name} />
            <View style={{ marginLeft: 10, gap: 8 }}>
              <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}><Text style={s.icon}>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}><Text style={s.icon}>🗑️</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[s.btn, { margin: 16 }]} onPress={openAdd}>
        <Text style={s.btnText}>＋ {t('add')}</Text>
      </TouchableOpacity>

      {/* ---------- Trang 2: dialog chi tiết ---------- */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={[s.header, { paddingTop: 0 }]}>{t('detailTitle')}</Text>
            {detail && (
              <>
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Avatar uri={detail.avatar} name={detail.name} size={96} />
                </View>
                <Text style={s.label}>{t('name')}</Text><Text style={s.value}>{detail.name}</Text>
                <Text style={s.label}>{t('id')}</Text><Text style={s.value}>{detail.mssv}</Text>
                <Text style={s.label}>{t('email')}</Text><Text style={s.value}>{detail.email}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#999' }]} onPress={() => setDetail(null)}>
                    <Text style={s.btnText}>{t('close')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={() => openEdit(detail)}>
                    <Text style={s.btnText}>{t('edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#e5484d' }]} onPress={() => handleDelete(detail)}>
                    <Text style={s.btnText}>{t('del')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f5f9', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingTop: 14, paddingBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#666', marginTop: 2 },
  icon: { fontSize: 18 },
  empty: { textAlign: 'center', color: '#888', marginTop: 60 },
  btn: { backgroundColor: '#4f6df5', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: '#4f6df5', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnOutlineText: { color: '#4f6df5', fontWeight: '600' },
  label: { color: '#666', fontSize: 13, marginTop: 6, marginBottom: 4 },
  value: { fontSize: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
});