import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';

const NotebooksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const user = useAuthStore((state) => state.user);

  const getNotebooks = useNotebookStore((state) => state.getNotebooks);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);
  const setCurrentNotebook = useNotebookStore((state) => state.setCurrentNotebook);
  const addNotebook = useNotebookStore((state) => state.addNotebook);

  const notebooks = user?._id ? getNotebooks(user._id) : [];
  const currentNotebook = user?._id ? getCurrentNotebook(user._id) : null;

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNotebook = async () => {
    if (!newNotebookName.trim() || !user?._id) return;
    try {
      setIsAdding(true);
      await addNotebook(user._id, newNotebookName.trim());
      setNewNotebookName('');
      setIsAddModalVisible(false);
    } catch (error) {
      console.error('Failed to create notebook', error);
      Alert.alert('提示', '创建日记本失败，请重试');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color={HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的日记本</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setIsAddModalVisible(true);
          }}
        >
          <Feather name="plus" size={24} color={HEALING_COLORS.pink[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {notebooks.map((notebook) => {
            const isActive = currentNotebook?._id === notebook._id;
            return (
              <TouchableOpacity
                key={notebook._id}
                style={[
                  styles.notebookItem,
                  { borderRadius: themeStyle.borderRadius },
                  isActive && styles.notebookItemActive,
                ]}
                onPress={() => {
                  if (user?._id) {
                    setCurrentNotebook(user._id, notebook._id);
                    // 切换日记本后，返回到首页 (Home 标签页)
                    navigation.navigate('Main', { screen: 'Home' });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                  <Ionicons
                    name="book"
                    size={24}
                    color={isActive ? '#FFFFFF' : HEALING_COLORS.gray[400]}
                  />
                </View>
                <View style={styles.notebookInfo}>
                  <Text style={[styles.notebookName, isActive && styles.notebookNameActive]}>
                    {notebook.name}
                  </Text>
                  <Text style={styles.notebookDate}>
                    创建于 {new Date(notebook.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {isActive && (
                  <Feather
                    name="check"
                    size={24}
                    color={HEALING_COLORS.pink[500]}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 新建日记本弹窗 */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsAddModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setIsAddModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { borderRadius: themeStyle.borderRadius }]}>
                <Text style={styles.modalTitle}>新建日记本</Text>
                <TextInput
                  style={[styles.input, { borderRadius: themeStyle.borderRadius }]}
                  placeholder="给日记本起个名字吧..."
                  placeholderTextColor={HEALING_COLORS.gray[400]}
                  value={newNotebookName}
                  onChangeText={setNewNotebookName}
                  maxLength={20}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { borderRadius: themeStyle.borderRadius },
                    ]}
                    onPress={() => {
                      setIsAddModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.confirmButton,
                      { borderRadius: themeStyle.borderRadius },
                    ]}
                    onPress={handleAddNotebook}
                    disabled={isAdding || !newNotebookName.trim()}
                  >
                    <Text style={styles.confirmButtonText}>{isAdding ? '创建中...' : '确定'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: HEALING_COLORS.gray[800],
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  notebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  notebookItemActive: {
    backgroundColor: '#FFF0F5',
    borderColor: HEALING_COLORS.pink[200],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerActive: {
    backgroundColor: HEALING_COLORS.pink[400],
  },
  notebookInfo: {
    flex: 1,
  },
  notebookName: {
    fontSize: 16,
    fontWeight: '600',
    color: HEALING_COLORS.gray[800],
    marginBottom: 4,
  },
  notebookNameActive: {
    color: HEALING_COLORS.pink[600],
  },
  notebookDate: {
    fontSize: 12,
    color: HEALING_COLORS.gray[400],
  },
  checkIcon: {
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HEALING_COLORS.gray[800],
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: HEALING_COLORS.gray[800],
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: HEALING_COLORS.pink[500],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: HEALING_COLORS.gray[600],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotebooksScreen;
