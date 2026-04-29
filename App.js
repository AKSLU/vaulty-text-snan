import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView,StyleSheet, ActivityIndicator,TouchableOpacity, TextInput,Animated, FlatList, Dimensions, Modal, Alert, Share, BackHandler, Platform, ToastAndroid
} from 'react-native';
import {
  GestureHandlerRootView, PinchGestureHandler,
} from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { 
  initDB, addNote, getNotes, deleteNote, togglePin, 
  updateNoteFolder, getFoldersFromDB, addFolderToDB, 
  deleteFolderFromDB, updateNoteText, updateNoteTags, clearOldTrash, moveToTrashDB
} from './database';
import { styles } from './styles';

LocaleConfig.locales['ru'] = {
  monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сент','Окт','Ноя','Дек'],
  dayNames: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
  dayNamesShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

const { width, height } = Dimensions.get('window');
const SYSTEM_FOLDERS = ['Документы', 'Учеба', 'Важное', 'Работа'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('main'); 
  const [activeFolder, setActiveFolder] = useState(null);
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editableText, setEditableText] = useState(''); 
  const [folders, setFolders] = useState([]);
  const [isFolderModalVisible, setFolderModalVisible] = useState(false);
  const [isCreateFolderVisible, setCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [noteToMove, setNoteToMove] = useState(null);

  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isCalendarVisible, setCalendarVisible] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); 

  const [selectedTag, setSelectedTag] = useState(null);
  const [allTags, setAllTags] = useState([]);

  const scale = useState(new Animated.Value(1))[0];
  const scrollRef = useRef(null);
  const positionsRef = useRef([]);
  const flatListRef = useRef(null);

  const API_KEY = '  ';

  useEffect(() => {
  initDB();
  clearOldTrash();
  if (isAutoDeleteEnabled) {
    clearOldTrash(); 
  }
  refreshData();
}, [isAutoDeleteEnabled]);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState('#6366F1');

  const ACCENT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const theme = {
    background: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F1F5F9' : '#1E293B',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    input: isDarkMode ? '#1E293B' : '#EDF2F7',
  };

  useEffect(() => {
  const loadAccentColor = async () => {
    try {
      const savedColor = await AsyncStorage.getItem('user_accent_color');
      if (savedColor) {
        setAccentColor(savedColor);
      }
    } catch (e) {
      console.error("Ошибка загрузки цвета:", e);
    }
  };
  loadAccentColor();
}, []);

const changeAccentColor = async (color) => {
  setAccentColor(color);
  try {
    await AsyncStorage.setItem('user_accent_color', color);
  } catch (e) {
    console.error("Ошибка сохранения цвета:", e);
  }
};

  const [isAutoDeleteEnabled, setIsAutoDeleteEnabled] = useState(true);
  useEffect(() => {
  const loadSettings = async () => {
    const storedValue = await AsyncStorage.getItem('auto_delete_trash');
    if (storedValue !== null) {
      setIsAutoDeleteEnabled(JSON.parse(storedValue));
    }
  };
  loadSettings();
}, []);
  const toggleAutoDelete = async () => {
    const newValue = !isAutoDeleteEnabled;
    setIsAutoDeleteEnabled(newValue);
    await AsyncStorage.setItem('auto_delete_trash', JSON.stringify(newValue));
    
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        newValue ? "Автоочистка включена" : "Автоочистка выключена", 
        ToastAndroid.SHORT
      );
    }
  };

  const handleCreateFolder = () => {
  const trimmedName = newFolderName.trim();
  if (!trimmedName) {
    Alert.alert("Ошибка", "Введите название папки");
    return;
  }
  if (folders.includes(trimmedName) || SYSTEM_FOLDERS.includes(trimmedName)) {
    Alert.alert("Ошибка", " такая папка уже существует");
    return;
  }

  addFolderToDB(trimmedName); 
  setNewFolderName('');
  setCreateFolderVisible(false);
  refreshData(); 
};
  //  Корзина и Паролб
  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [savedPin, setSavedPin] = useState('1234'); 
  const [isChangePinVisible, setChangePinVisible] = useState(false); 
  const [newPinInput, setNewPinInput] = useState('');
  const [oldPinInput, setOldPinInput] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  useEffect(() => {
  const loadPin = async () => {
    const storedPin = await AsyncStorage.getItem('user_password');
    if (storedPin) setSavedPin(storedPin);
  };
  loadPin();
  }, []);
  const saveNewPin = async () => {
  if (oldPinInput !== savedPin) {
    Alert.alert("Ошибка", "Текущий пароль введен неверно");
    return;
  }
  if (newPinInput.length < 4 || newPinInput.length > 15) {
    Alert.alert("Ошибка", "Новый пароль должен быть от 4 до 15 символов");
    return;
  }
  
  await AsyncStorage.setItem('user_password', newPinInput);
  setSavedPin(newPinInput);
  setNewPinInput('');
  setOldPinInput('');
  setChangePinVisible(false);
  Alert.alert("Успех", "Пароль успешно изменен!");
};

  useEffect(() => {
    const tagsSet = new Set();
    history.forEach(note => {
      if (note.tags) {
        note.tags.split(',').forEach(t => {
          const trimmed = t.trim();
          if (trimmed) tagsSet.add(trimmed);
        });
      }
    });
    setAllTags(['Все', ...Array.from(tagsSet)]);
  }, [history]);
  const moveToTrash = (item) => {
    const id = item?.id;
    
    if (id === undefined || id === null) {
      console.warn("Попытка удаления объекта без ID:", item);
      return;
    }

    try {
      moveToTrashDB(Number(id));
      setSelected(null); 
      refreshData();
      
      if (Platform.OS === 'android') {
        ToastAndroid.show("Перемещено в корзину", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("Ошибка при перемещении в корзину:", error);
      Alert.alert("Ошибка", "Не удалось переместить в корзину");
    }
  };

  // папка важное
  const openProtectedFolder = (folderName) => {
    if (folderName === 'Важное') {
      setPinModalVisible(true);
    } else {
      setActiveFolder(folderName);
      setCurrentScreen('folder_detail');
    }
  };

  const permanentDelete = (id) => {
    Alert.alert("Внимание", "Удалить эту заметку навсегда?", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteNote(id); refreshData(); } }
    ]);
  };

  useEffect(() => {
  const backAction = () => {
    if (galleryOpen) { setGalleryOpen(false); return true; }
    if (selected) { closeNote(); return true; }
    if (isPinModalVisible) { setPinModalVisible(false); return true; }
    if (isFolderModalVisible) { setFolderModalVisible(false); return true; }
    // Если открыто меню — просто закрываем его, не меняя экран
    if (isBurgerOpen) { setIsBurgerOpen(false); return true; } 
    if (isCalendarVisible) { setCalendarVisible(false); return true; }
    
    if (currentScreen === 'folder_detail') { setCurrentScreen('folders'); return true; }
    
    if (currentScreen !== 'main') { 
      setCurrentScreen('main'); 
      return true; 
    }
    return false;
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => backHandler.remove();
}, [galleryOpen, selected, currentScreen, isBurgerOpen, isCalendarVisible, isPinModalVisible, isFolderModalVisible, editableText]); 

  // проверка попроля 
  const handlePinSubmit = () => {
  if (pinInput === savedPin) { 
    setPinModalVisible(false);
    setPinInput('');
    setActiveFolder('Важное');
    setCurrentScreen('folder_detail');
  } else {
    Alert.alert("Ошибка", "Неверный ПИН-код");
    setPinInput('');
  }
};
  const closeNote = () => {
    if (selected) {
      updateNoteText(selected.id, editableText);
      updateNoteTags(selected.id, selected.tags || ''); 
      refreshData();
    }
    setSelected(null);
    setSearch('');
  };

  const refreshData = () => {
    getNotes(setHistory);
    getFoldersFromDB(list => setFolders([...new Set(list)]));
  };

  const groupHistoryByDate = (data) => {
    const groups = { 'Сегодня': [], 'Вчера': [], 'Прошлая неделя': [], 'Ранее': [] };
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
    const today = new Date(todayStr).getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 86400000 * 7;

    data.forEach(item => {
      const itemDate = item.createdAt; 
      if (itemDate >= today) groups['Сегодня'].push(item);
      else if (itemDate >= yesterday) groups['Вчера'].push(item);
      else if (itemDate >= lastWeek) groups['Прошлая неделя'].push(item);
      else groups['Ранее'].push(item);
    });
    return Object.keys(groups).map(title => ({ title, data: groups[title] })).filter(g => g.data.length > 0);
  };

  const formatFullDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      timeZone: 'Asia/Almaty',
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatShortTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      timeZone: 'Asia/Almaty',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleSelectNote = (item) => {
    setSelected(item);
    setEditableText(item.text);
  };


  const exportToPDF = async (item) => {
    setLoading(true);
    try {
      const base64Image = await FileSystem.readAsStringAsync(item.image, { encoding: 'base64' });
      const imageSrc = `data:image/jpeg;base64,${base64Image}`;
      const htmlContent = `
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: ${accentColor};">Заметка от ${formatFullDate(item.createdAt)}</h2>
            <img src="${imageSrc}" style="width: 100%; border-radius: 10px;" />
            <p style="white-space: pre-wrap; font-size: 16px; margin-top: 20px;">${editableText}</p>
          </body>
        </html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Ошибка", "Не удалось создать PDF"); }
    setLoading(false);
  };

  const onShare = async (item) => {
    Alert.alert("Поделиться", "Что отправить?", [
      { text: "Текст + Фото", onPress: async () => { await Clipboard.setStringAsync(editableText); await Sharing.shareAsync(item.image); }},
      { text: "Только текст", onPress: async () => { await Share.share({ message: editableText }); }},
      { text: "Отмена", style: "cancel" }
    ]);
  };

  const recognizeText = async (uri) => {
    setLoading(true);
    try {
      const manip = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      let fd = new FormData();
      fd.append('file', { uri: manip.uri, type: 'image/jpeg', name: 'img.jpg' });
      fd.append('language', 'rus');
      const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { apikey: API_KEY }, body: fd });
      const data = await res.json();
      const rawText = data.ParsedResults?.[0]?.ParsedText || '';
      const finalText = rawText.trim() ? rawText.replace(/([.!?])\s*/g, '$1\n\n') : 'Текст не распознан';
      addNote(manip.uri, finalText);
      refreshData();
    } catch (e) { Alert.alert("Ошибка", "Проблема со связью"); }
    setLoading(false);
  };

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled) recognizeText(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    let res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled) recognizeText(res.assets[0].uri);
  };

  const paragraphs = editableText.split(/\n{2,}/).filter(Boolean);

  const NoteCard = ({ item, inFolder = false }) => {
    const time = formatShortTime(item.createdAt); 
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          { backgroundColor: theme.card, borderColor: theme.border },
          item.pinned && !inFolder && { borderColor: accentColor, borderWidth: 1.5 }
        ]} 
        onPress={() => handleSelectNote(item)}
      >
        <TouchableOpacity onPress={() => { setGalleryIndex(history.findIndex(n => n.id === item.id)); setGalleryOpen(true); scale.setValue(1); }}>
          <Image source={{ uri: item.image }} style={styles.thumb} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: accentColor, fontSize: 11, fontWeight: 'bold' }}>{time}</Text>
          <Text numberOfLines={2} style={{ color: theme.text }}>{item.text || 'Пустая заметка'}</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 4}}>
            {(item.tags ? item.tags.split(',') : []).map((t, i) => (
              t.trim() ? <Text key={i} style={{color: accentColor, fontSize: 10, marginRight: 6, opacity: 0.8}}>#{t.trim()}</Text> : null
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!inFolder && (
            <TouchableOpacity onPress={() => { setNoteToMove(item); setFolderModalVisible(true); }} style={{ marginRight: 15 }}>
              <MaterialCommunityIcons name="folder-move" size={22} color={theme.subText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onShare(item)} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="share-variant" size={22} color={theme.subText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { inFolder ? updateNoteFolder(item.id, null) : togglePin(item.id, item.pinned); refreshData(); }}>
            <MaterialCommunityIcons 
              name={inFolder ? "close-circle" : (item.pinned ? "pin" : "pin-outline")} 
              size={22} 
              color={item.pinned ? accentColor : theme.subText} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.container}>
          
          {/* header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsBurgerOpen(true)}>
            <MaterialCommunityIcons name="menu" size={30} color={theme.text} />
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => console.log("Клик по заголовку!")}> 
            <Text style={[styles.title, { color: theme.text }]}>     Vaulty</Text>
          </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setIsDarkMode(!isDarkMode)} 
              style={{ marginLeft: 15, padding: 8, backgroundColor: theme.input, borderRadius: 10 }}
            >
              <MaterialCommunityIcons 
                name={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
                size={20} 
                color={isDarkMode ? "#F59E0B" : "#6366F1"} 
              />
            </TouchableOpacity>
          </View>
          <View style={{ width: 30 }} />
        </View>

          {/* main page */}
          {currentScreen === 'main' && (
            <View style={{flex: 1}}>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 0.48, backgroundColor: accentColor }]} onPress={takePhoto}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Камера</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 0.48, backgroundColor: accentColor, opacity: 0.85 }]} onPress={pickImage}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="image-multiple" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Галерея</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {allTags.map((tag, idx) => {
                    const isActive = selectedTag === tag || (tag === 'Все' && !selectedTag);
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => setSelectedTag(tag === 'Все' ? null : tag)}
                        style={[
                          styles.tagBadge, 
                          { backgroundColor: theme.card, borderColor: theme.border },
                          isActive && { backgroundColor: accentColor, borderColor: accentColor }
                        ]}
                      >
                        <Text style={[styles.tagText, { color: isActive ? '#fff' : theme.text }]}>
                          {tag === 'Все' ? tag : `#${tag}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <TextInput 
                style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]} 
                placeholder="Поиск по заметкам..." 
                value={globalSearch} 
                onChangeText={setGlobalSearch} 
                placeholderTextColor={theme.subText} 
              />

              <ScrollView showsVerticalScrollIndicator={false} style={{marginTop: 15}}>
                {(() => {
                  let filtered = history.filter(item => item.text.toLowerCase().includes(globalSearch.toLowerCase()));
                  if (selectedTag && selectedTag !== 'Все') {
                    filtered = filtered.filter(item => item.tags?.split(',').map(t => t.trim()).includes(selectedTag));
                  }
                  const pinned = filtered.filter(n => n.pinned && !n.folder);
                  const recent = filtered.filter(n => !n.pinned && !n.folder);
                  return (
                    <>
                      {pinned.length > 0 && <Text style={[styles.sectionTitle, { color: theme.subText }]}>📌 Закреплено</Text>}
                      {pinned.map(item => <NoteCard key={`p-${item.id}`} item={item} />)}
                      <Text style={[styles.sectionTitle, { color: theme.subText }]}>{selectedTag ? `🏷 #${selectedTag}` : '📍 Недавние'}</Text>
                      {recent.map(item => <NoteCard key={`r-${item.id}`} item={item} />)}
                      {filtered.length === 0 && <Text style={[styles.emptyText, { color: theme.subText }]}>Ничего не найдено</Text>}
                    </>
                  );
                })()}
              </ScrollView>
            </View>
          )}

          {/* story */}
          {currentScreen === 'history' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => { setCurrentScreen('main'); setSelectedDate(''); }}>
                <Text style={[styles.backLink, { color: accentColor }]}>← На главную</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.folderHeaderTitle, { color: theme.text }]}>История</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: accentColor, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }} 
                  onPress={() => setCalendarVisible(true)}
                >
                  <MaterialCommunityIcons name="calendar-month" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Календарь</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedDate ? (
                  <View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Text style={[styles.sectionTitle, { color: theme.subText }]}>Результаты за {selectedDate}</Text>
                      <TouchableOpacity onPress={() => setSelectedDate('')}>
                        <Text style={{color: '#ef4444'}}>Сбросить</Text>
                      </TouchableOpacity>
                    </View>
                    {history.filter(item => new Date(item.createdAt).toLocaleDateString('en-CA') === selectedDate).map(item => <NoteCard key={`date-${item.id}`} item={item} />)}
                  </View>
                ) : (
                  groupHistoryByDate(history).map((section, idx) => (
                    <View key={idx} style={{ marginBottom: 20 }}>
                      <Text style={[styles.sectionTitle, { color: theme.subText }]}>{section.title}</Text>
                      {section.data.map(item => <NoteCard key={`h-${item.id}`} item={item} />)}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* folder papki */}
          {currentScreen === 'folders' && (
            <View style={{ flex: 1 }}>
              <View style={styles.folderHeader}>
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>Все папки</Text>
                <TouchableOpacity style={[styles.addFolderBtn, { backgroundColor: accentColor }]} onPress={() => setCreateFolderVisible(true)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Папка</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {folders.map((f, i) => (
                  <View key={`f-${i}`} style={[styles.folderRow, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openProtectedFolder(f)}>
                    <MaterialCommunityIcons name="folder" size={26} color={accentColor} style={{ marginRight: 12 }} />
                    <Text style={[styles.folderText, { color: theme.text }]}>{f}</Text>
                  </TouchableOpacity>
                    {!SYSTEM_FOLDERS.includes(f) && (
                      <TouchableOpacity onPress={() => {
                        Alert.alert(
                          "Удалить папку",
                          `Вы уверены, что хотите удалить папку "${f}"? Заметки в ней не удалятся.`,
                          [
                            { text: "Отмена", style: "cancel" },
                            { 
                              text: "Удалить", 
                              style: "destructive", 
                              onPress: () => {
                                deleteFolderFromDB(f); 
                                refreshData(); 
                              } 
                            }
                          ]
                        );
                      }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                </View>
                ))}
                <Modal visible={isCreateFolderVisible} transparent animationType="fade">
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modernModal, { backgroundColor: theme.card }]}>
                      
                      <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
                        <MaterialCommunityIcons name="folder-plus" size={32} color={accentColor} />
                      </View>

                      <Text style={[styles.modernModalTitle, { color: theme.text }]}>Новая папка</Text>
                      <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                        Введите название для организации ваших заметок
                      </Text>

                      <TextInput
                        style={[styles.modernInput, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                        placeholder="Название"
                        placeholderTextColor={theme.subText}
                        value={newFolderName}
                        onChangeText={setNewFolderName}
                        autoFocus
                      />

                      <View style={styles.modernModalButtons}>
                        <TouchableOpacity 
                          onPress={() => setCreateFolderVisible(false)} 
                          style={[styles.modernBtn, { backgroundColor: 'transparent' }]}
                        >
                          <Text style={{ color: theme.subText, fontWeight: '600' }}>Отмена</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={handleCreateFolder} 
                          style={[styles.modernBtn, { backgroundColor: accentColor }]}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Создать</Text>
                        </TouchableOpacity>
                      </View>

                    </View>
                  </View>
                </Modal>
              </ScrollView>
            </View>
          )}

          {/* back to folder papki */}
          {currentScreen === 'folder_detail' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setCurrentScreen('folders')}><Text style={[styles.backLink, { color: accentColor }]}>← Назад к папкам</Text></TouchableOpacity>
              <Text style={[styles.folderHeaderTitle, { color: theme.text, marginBottom: 15 }]}>{activeFolder}</Text>
              <ScrollView>
                {history.filter(n => n.folder === activeFolder).map(item => <NoteCard key={`fd-${item.id}`} item={item} inFolder />)}
              </ScrollView>
            </View>
          )}

          {/* korzina */}
          {currentScreen === 'trash' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setCurrentScreen('main')}>
                <Text style={[styles.backLink, { color: accentColor, paddingVertical: 10 }]}>← Назад на главную</Text>
              </TouchableOpacity>
              
              <Text style={[styles.folderHeaderTitle, { color: theme.text, fontSize: 24, fontWeight: 'bold' }]}>Корзина</Text>
              <Text style={{ color: theme.subText, marginBottom: 15, fontSize: 13 }}>
                Заметки удаляются автоматически через 3 дня
              </Text>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: theme.input,
                padding: 12,
                borderRadius: 12,
                marginBottom: 10
              }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>Автоудаление (3 дня)</Text>
                  <Text style={{ color: theme.subText, fontSize: 11 }}>
                    {isAutoDeleteEnabled ? "Включено" : "Выключено (заметки останутся навсегда)"}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={toggleAutoDelete}
                  style={{ 
                    backgroundColor: isAutoDeleteEnabled ? accentColor : theme.border,
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 8
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {isAutoDeleteEnabled ? "ОТКЛ" : "ВКЛ"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {history.filter(n => n.folder === 'SYSTEM_TRASH').map(item => {
                  const msInDay = 24 * 60 * 60 * 1000;
                  const daysLeft = Math.max(0, Math.ceil((3 - (Date.now() - item.createdAt) / msInDay)));
                  
                  return (
                    <View key={item.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15, marginBottom: 10, borderWidth: 1 }]}>
                      
                      {/* photo */}
                      <Image 
                        source={{ uri: item.image }} 
                        style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12 }} 
                      />

                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '500', fontSize: 15 }}>
                          {item.text || "Пустая заметка"}
                        </Text>
                        <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
                          <MaterialCommunityIcons name="clock-outline" size={12} /> Осталось: {daysLeft} дн.
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* hiller btn */}
                        <TouchableOpacity 
                          onPress={() => { updateNoteFolder(item.id, null); refreshData(); }}
                          style={{ padding: 8 }}
                        >
                          <MaterialCommunityIcons name="restore" size={26} color={accentColor} />
                        </TouchableOpacity>
                        
                        {/* delforever btn */}
                        <TouchableOpacity 
                          onPress={() => permanentDelete(item.id)}
                          style={{ padding: 8 }}
                        >
                          <MaterialCommunityIcons name="delete-forever" size={26} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {history.filter(n => n.folder === 'SYSTEM_TRASH').length === 0 && (
                  <View style={{ marginTop: 60, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="delete-empty-outline" size={70} color={theme.border} />
                    <Text style={{ color: theme.subText, marginTop: 10 }}>Корзина пуста</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* burger meni */}
          <Modal visible={isBurgerOpen} transparent animationType="fade">
            <View style={styles.burgerOverlay}>
              <View style={[styles.burgerMenu, { backgroundColor: theme.card }]}>
                <Text style={[styles.burgerTitle, { color: accentColor }]}>Меню</Text>
                
                <TouchableOpacity style={styles.burgerItem} onPress={() => { setCurrentScreen('main'); setIsBurgerOpen(false); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="home-outline" size={24} color={accentColor} style={{ marginRight: 15 }} />
                    <Text style={[styles.burgerItemText, { color: theme.text }]}>Главная</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.burgerItem} onPress={() => { setCurrentScreen('folders'); setIsBurgerOpen(false); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="folder-outline" size={24} color={accentColor} style={{ marginRight: 15 }} />
                    <Text style={[styles.burgerItemText, { color: theme.text }]}>Папки</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.burgerItem} onPress={() => { setCurrentScreen('history'); setIsBurgerOpen(false); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="history" size={24} color={accentColor} style={{ marginRight: 15 }} />
                    <Text style={[styles.burgerItemText, { color: theme.text }]}>История</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.burgerItem} 
                  onPress={() => { 
                    setIsBurgerOpen(false); 
                    setTimeout(() => { setCurrentScreen('trash'); }, 50);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color={accentColor} style={{ marginRight: 15 }} />
                    <Text style={[styles.burgerItemText, { color: theme.text }]}>Корзина</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.burgerItem} 
                  onPress={() => { setIsBurgerOpen(false); setChangePinVisible(true); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="lock-reset" size={24} color={accentColor} style={{ marginRight: 15 }} />
                    <Text style={[styles.burgerItemText, { color: theme.text }]}>Сменить пароль</Text>
                  </View>
                </TouchableOpacity>

                <View style={{ marginTop: 'auto', marginBottom: 30 }}>
                  <Text style={[styles.sectionTitle, { color: theme.subText }]}>Цвет темы</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    {ACCENT_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => changeAccentColor(color)}
                        style={[
                          {
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: color,
                            marginRight: 10,
                            borderWidth: accentColor === color ? 2 : 0,
                            borderColor: theme.text
                          }
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <TouchableOpacity onPress={() => setIsBurgerOpen(false)}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>Закрыть</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => setIsBurgerOpen(false)} 
              />
            </View> 
          </Modal>

          {/* edit note */}
          {selected && (
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalDate, { color: accentColor }]}>{formatFullDate(selected.createdAt)}</Text>
              
              <TextInput 
                placeholder="Поиск в тексте..." 
                value={search} 
                onChangeText={val => { setSearch(val); setCurrentMatch(0); }} 
                style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border, height: 40, marginBottom: 10 }]} 
                placeholderTextColor={theme.subText} 
              />
              
              <View style={{ flex: 1 }}>
                {search ? (
                  <ScrollView ref={scrollRef} nestedScrollEnabled>
                    {paragraphs.map((p, i) => (
                      <View key={i} onLayout={e => { positionsRef.current[i] = e.nativeEvent.layout.y; }}>
                        <Text style={[styles.text, { color: theme.text }]}>
                          {p.split(new RegExp(`(${search})`, 'gi')).map((part, idx) => (
                             <Text key={idx} style={[part.toLowerCase() === search.toLowerCase() ? { backgroundColor: accentColor, color: '#fff' } : {}]}>{part}</Text>
                          ))}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <TextInput 
                    multiline 
                    style={[styles.text, { color: theme.text, textAlignVertical: 'top', flex: 1 }]} 
                    value={editableText} 
                    onChangeText={setEditableText} 
                  />
                )}
              </View>

              <View style={[styles.tagInputSection, { borderTopColor: theme.border }]}>
                <Text style={[styles.tagLabel, { color: theme.subText }]}>Теги (через запятую):</Text>
                <TextInput
                  style={[styles.tagInput, { backgroundColor: theme.background, color: accentColor }]}
                  placeholder="дом, работа, важное"
                  placeholderTextColor={theme.subText}
                  value={selected.tags}
                  onChangeText={(val) => setSelected({...selected, tags: val})}
                />
              </View>

              <View style={[styles.bottomBar, { borderTopColor: theme.border }]}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.input }]} onPress={() => exportToPDF(selected)}>
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.input }]} onPress={() => Clipboard.setStringAsync(editableText)}>
                  <MaterialCommunityIcons name="content-copy" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.input }]} onPress={() => moveToTrash(selected)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor, flex: 1 }]} onPress={closeNote}>
                  <Text style={styles.btnText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* calendar */}
          <Modal visible={isCalendarVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.folderPicker, { backgroundColor: theme.card, width: '90%', height: 450 }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Выберите дату</Text>
                <Calendar
                  theme={{
                    calendarBackground: theme.card,
                    textSectionTitleColor: accentColor,
                    selectedDayBackgroundColor: accentColor,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: accentColor,
                    dayTextColor: theme.text,
                    monthTextColor: theme.text,
                    arrowColor: accentColor,
                  }}
                  onDayPress={(day) => {
                    setSelectedDate(day.dateString);
                    setCalendarVisible(false);
                  }}
                  markedDates={{ [selectedDate]: { selected: true } }}
                />
                <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setCalendarVisible(false)}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>Закрыть</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* folder swap */}
          <Modal visible={isFolderModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.folderPicker, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Переместить в:</Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {folders.map((f, i) => (
                    <TouchableOpacity key={i} style={[styles.folderOption, { borderBottomColor: theme.border }]} onPress={() => { updateNoteFolder(noteToMove.id, f); setFolderModalVisible(false); refreshData(); }}>
                      <Text style={{ color: theme.text }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setFolderModalVisible(false)} style={{ marginTop: 15 }}><Text style={{ color: '#ef4444', textAlign: 'center' }}>Отмена</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>

          {galleryOpen && (
            <View style={styles.fullscreen}>
              <FlatList ref={flatListRef} data={history} horizontal pagingEnabled initialScrollIndex={galleryIndex}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                renderItem={({ item }) => (
                  <View style={{ width, height }}>
                    <PinchGestureHandler onGestureEvent={Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true })}>
                      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setGalleryOpen(false)} activeOpacity={1}>
                          <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                        </TouchableOpacity>
                      </Animated.View>
                    </PinchGestureHandler>
                  </View>
                )}
              />
            </View>
          )}

          {/* password */}
          <Modal visible={isPinModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.compactModal, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDarkMode ? 1 : 0 }]}>
                <View style={[styles.modalIconCircle, { backgroundColor: accentColor + '20' }]}>
                  <MaterialCommunityIcons name="shield-lock" size={32} color={accentColor} />
                </View>
                
                <Text style={[styles.modalTitle, { color: theme.text }]}>Доступ ограничен</Text>
                <Text style={[styles.modalSubTitle, { color: theme.subText }]}>Введите пароль (4-15 символов)</Text>
                
                <View style={[styles.inputContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.pinInputInside, { color: theme.text }]}
                    placeholder="Пароль..."
                    placeholderTextColor={theme.subText}
                    secureTextEntry={!isPasswordVisible}
                    keyboardType="default"
                    value={pinInput}
                    onChangeText={(text) => {
                      if (text.length <= 15) setPinInput(text); 
                    }}
                    autoFocus
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <MaterialCommunityIcons 
                      name={isPasswordVisible ? "eye-off" : "eye"} 
                      size={22} 
                      color={theme.subText} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.cancelBtn, { backgroundColor: theme.input }]} 
                    onPress={() => { setPinModalVisible(false); setPinInput(''); setIsPasswordVisible(false); }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '600' }}>Отмена</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.confirmBtn, { backgroundColor: accentColor }]} 
                    onPress={handlePinSubmit}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Войти</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* swap password */}
          <Modal visible={isChangePinVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.compactModal, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDarkMode ? 1 : 0 }]}>
                <View style={[styles.modalIconCircle, { backgroundColor: accentColor + '20' }]}>
                  <MaterialCommunityIcons name="lock-reset" size={32} color={accentColor} />
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>Безопасность</Text>
                <Text style={[styles.modalSubTitle, { color: theme.subText }]}>Изменение пароля доступа</Text>
                
                <View style={[styles.inputContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.pinInputInside, { color: theme.text }]}
                    placeholder="Старый пароль"
                    placeholderTextColor={theme.subText}
                    secureTextEntry={!isOldPasswordVisible}
                    value={oldPinInput}
                    onChangeText={(text) => {
                      if (text.length <= 15) setOldPinInput(text);
                    }}
                  />
                  <TouchableOpacity onPress={() => setIsOldPasswordVisible(!isOldPasswordVisible)} style={styles.eyeIcon}>
                    <MaterialCommunityIcons 
                      name={isOldPasswordVisible ? "eye-off" : "eye"} 
                      size={20} 
                      color={theme.subText} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.inputContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.pinInputInside, { color: theme.text }]}
                    placeholder="Новый (4-15 символов)"
                    placeholderTextColor={theme.subText}
                    secureTextEntry={!isNewPasswordVisible}
                    value={newPinInput}
                    onChangeText={(text) => {
                      if (text.length <= 15) setNewPinInput(text);
                    }}
                  />
                  <TouchableOpacity onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)} style={styles.eyeIcon}>
                    <MaterialCommunityIcons 
                      name={isNewPasswordVisible ? "eye-off" : "eye"} 
                      size={20} 
                      color={theme.subText} 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.cancelBtn, { backgroundColor: theme.input }]} 
                    onPress={() => { 
                      setChangePinVisible(false); 
                      setOldPinInput(''); 
                      setNewPinInput('');
                      setIsOldPasswordVisible(false);
                      setIsNewPasswordVisible(false);
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '600' }}>Назад</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.confirmBtn, { backgroundColor: accentColor }]} 
                    onPress={saveNewPin}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Обновить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {loading && <ActivityIndicator size="large" color={accentColor} style={styles.loader} />}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
