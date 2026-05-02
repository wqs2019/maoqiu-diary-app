import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
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
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useVipGuard } from '../../hooks/useVipGuard';
import { imageService } from '../../services/imageService';
import * as notebookService from '../../services/notebookService';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';
import { Notebook } from '../../types';

type NotebooksScreenRouteProp = RouteProp<
  { Notebooks: { openAddModal?: boolean } },
  'Notebooks'
>;

const NotebooksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<NotebooksScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const user = useAuthStore((state) => state.user);
  const { isDark } = useAppTheme();
  const { checkVipPermission } = useVipGuard();

  const setCurrentNotebook = useNotebookStore((state) => state.setCurrentNotebook);
  const addNotebook = useNotebookStore((state) => state.addNotebook);
  const updateNotebook = useNotebookStore((state) => state.updateNotebook);
  const deleteNotebook = useNotebookStore((state) => state.deleteNotebook);

  const notebooks = user?._id ? useNotebookStore((state) => state.notebooksByUserId[user._id] || []) : [];
  const currentNotebookId = user?._id ? useNotebookStore((state) => state.currentNotebookIdByUserId[user._id]) : null;
  const currentNotebook = notebooks.find(n => n._id === currentNotebookId) || null;

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDesc, setNewNotebookDesc] = useState('');
  const [notebookCover, setNotebookCover] = useState('');
  const [notebookType, setNotebookType] = useState<'private' | 'shared'>('private');
  const [inviteePhone, setInviteePhone] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);

  const fetchInvitations = async () => {
    if (!user?._id) return;
    try {
      const invs = await notebookService.getInvitations(user._id);
      setInvitations(invs);
    } catch (error) {
      console.error('Fetch invitations error:', error);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user?._id]);

  const handleRespondInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    if (!user?._id) return;
    try {
      await notebookService.respondInvitation(invitationId, action, user._id);
      Alert.alert('提示', action === 'accept' ? '已加入日记本' : '已拒绝邀请');
      // 刷新列表
      await useNotebookStore.getState().fetchNotebooks(user._id);
      fetchInvitations();
    } catch (error: any) {
      Alert.alert('提示', error.message || '处理邀请失败');
    }
  };

  useEffect(() => {
    if (route.params?.openAddModal) {
      openAddModal();
      // 清除参数，避免重复触发
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route.params?.openAddModal]);

  const handlePickCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploadingCover(true);

        const extension = asset.mimeType?.split('/')[1] || 'jpg';
        const { data: pathData } = await imageService.generateCloudPath(extension, 'notebook');

        const uploadResult = await imageService.uploadImage(
          asset.uri,
          pathData.cloudPath,
          asset.mimeType
        );

        if (uploadResult.success && uploadResult.data?.url) {
          setNotebookCover(uploadResult.data.url);
        } else {
          throw new Error(uploadResult.message || '上传封面失败');
        }
      }
    } catch (error: any) {
      Alert.alert('提示', error.message || '更换封面失败，请重试');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveNotebook = async () => {
    if (!newNotebookName.trim() || !user?._id) return;
    if (notebookType === 'shared' && !inviteePhone.trim()) {
      Alert.alert('提示', '共享日记本需要输入对方手机号哦');
      return;
    }
    if (notebookType === 'shared' && inviteePhone.trim() === user.phone) {
      Alert.alert('提示', '不能邀请自己哦');
      return;
    }

    try {
      setIsAdding(true);
      if (isEditMode && editingNotebookId) {
        await updateNotebook(user._id, editingNotebookId, newNotebookName.trim(), notebookCover, newNotebookDesc.trim());
      } else {
        await addNotebook(user._id, newNotebookName.trim(), notebookCover, newNotebookDesc.trim(), notebookType, inviteePhone.trim());
      }
      setNewNotebookName('');
      setNewNotebookDesc('');
      setNotebookCover('');
      setNotebookType('private');
      setInviteePhone('');
      setIsAddModalVisible(false);
    } catch (error: any) {
      console.error('Failed to save notebook', error);
      Alert.alert('提示', error.message || (isEditMode ? '修改日记本失败，请重试' : '创建日记本失败，请重试'));
    } finally {
      setIsAdding(false);
    }
  };

  const openAddModal = () => {
    if (!checkVipPermission('createNotebook')) return;
    setIsEditMode(false);
    setEditingNotebookId(null);
    setNewNotebookName('');
    setNewNotebookDesc('');
    setNotebookCover('');
    setNotebookType('private');
    setInviteePhone('');
    setIsAddModalVisible(true);
  };

  const openEditModal = (notebook: Notebook) => {
    setIsEditMode(true);
    setEditingNotebookId(notebook._id);
    setNewNotebookName(notebook.name);
    setNewNotebookDesc(notebook.desc || '');
    setNotebookCover(notebook.cover || '');
    setIsAddModalVisible(true);
  };

  const confirmDelete = (notebook: Notebook) => {
    if (notebook.isDefault) {
      Alert.alert('提示', '默认日记本不允许删除哦～');
      return;
    }
    Alert.alert('确认删除', `确定要删除日记本"${notebook.name}"吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      { 
        text: '删除', 
        style: 'destructive', 
        onPress: async () => {
          if (!user?._id) return;
          try {
            await deleteNotebook(user._id, notebook._id);
            Alert.alert('提示', '删除成功');
          } catch (error: any) {
            Alert.alert('提示', error.message || '删除失败，请重试');
          }
        } 
      },
    ]);
  };

  const confirmUnbind = (notebook: Notebook) => {
    Alert.alert('解除共享', `解除后，你将无法再看到对方的日记，且该日记本无法再邀请其他人加入，确定解除吗？`, [
      { text: '取消', style: 'cancel' },
      { 
        text: '解除', 
        style: 'destructive', 
        onPress: async () => {
          if (!user?._id) return;
          try {
            await useNotebookStore.getState().unbindNotebook(user._id, notebook._id);
            Alert.alert('提示', '已解除共享');
          } catch (error: any) {
            Alert.alert('提示', error.message || '解除失败，请重试');
          }
        } 
      },
    ]);
  };

  const handleMoreOptions = (notebook: Notebook) => {
    if (!checkVipPermission('manageNotebook')) return;

    const options: any[] = [
      { text: '取消', style: 'cancel' },
      { text: '编辑', onPress: () => openEditModal(notebook) },
    ];

    if (notebook.type === 'shared' && notebook.status === 'active') {
      options.push({ text: '解除共享', style: 'destructive', onPress: () => confirmUnbind(notebook) });
    }

    if (!notebook.isDefault) {
      options.push({ text: '删除', style: 'destructive', onPress: () => confirmDelete(notebook) });
    }

    Alert.alert(
      '日记本操作',
      '请选择要进行的操作',
      options
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            borderBottomColor: isDark ? '#333' : '#F0F0F0',
            backgroundColor: isDark ? '#121212' : '#FAFAFA',
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFF' : HEALING_COLORS.gray[800]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
          我的日记本
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Feather name="plus" size={24} color={HEALING_COLORS.pink[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {invitations.length > 0 && (
          <View style={styles.invitationsContainer}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>新的邀请</Text>
            {invitations.map((inv) => (
              <View key={inv._id} style={[styles.invitationCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF0F3' }]}>
                <Text style={[styles.invitationText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
                  <Text style={{ fontWeight: 'bold' }}>{inv.inviterName}</Text> 邀请你共写日记本 <Text style={{ fontWeight: 'bold' }}>{inv.notebookName}</Text>
                </Text>
                <View style={styles.invitationButtons}>
                  <TouchableOpacity style={[styles.invBtn, styles.invBtnReject]} onPress={() => handleRespondInvitation(inv._id, 'reject')}>
                    <Text style={styles.invBtnRejectText}>拒绝</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.invBtn, styles.invBtnAccept]} onPress={() => handleRespondInvitation(inv._id, 'accept')}>
                    <Text style={styles.invBtnAcceptText}>同意</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.listContainer}>
          {notebooks.map((notebook, index) => {
            const isActive = currentNotebook?._id === notebook._id;
            return (
              <TouchableOpacity
                key={notebook._id || `fallback-key-${index}`}
                style={[
                  styles.notebookItem,
                  {
                    borderRadius: themeStyle.borderRadius,
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    borderColor: isDark ? '#333' : '#FFF0F3',
                  },
                  isActive && [
                    styles.notebookItemActive,
                    {
                      backgroundColor: isDark ? '#2C1B24' : '#FFF0F3',
                      borderColor: isDark ? '#4A2533' : HEALING_COLORS.pink[200],
                    },
                  ],
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
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isDark ? '#333' : '#F5F5F5' },
                    isActive && [
                      styles.iconContainerActive,
                      { backgroundColor: HEALING_COLORS.pink[500] },
                    ],
                  ]}
                >
                  {notebook.cover ? (
                    <Image source={{ uri: notebook.cover }} style={styles.notebookCover} />
                  ) : (
                    <Ionicons
                      name="book"
                      size={24}
                      color={isActive ? '#FFFFFF' : isDark ? '#AAA' : HEALING_COLORS.gray[400]}
                    />
                  )}
                </View>
                <View style={styles.notebookInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text
                      style={[
                        styles.notebookName,
                        { color: isDark ? '#FFF' : HEALING_COLORS.gray[800], marginBottom: 0 },
                        isActive && [
                          styles.notebookNameActive,
                          { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600] },
                        ],
                      ]}
                    >
                      {notebook.name}
                    </Text>
                    {notebook.type === 'shared' && (
                      <View style={[styles.sharedTag, { backgroundColor: isDark ? '#333' : '#FFF0F3' }]}>
                        <Text style={[styles.sharedTagText, { color: HEALING_COLORS.pink[500] }]}>👥 共享</Text>
                      </View>
                    )}
                  </View>
                  {!!notebook.desc && (
                    <Text
                      style={[
                        styles.notebookDesc,
                        { color: isDark ? '#AAA' : HEALING_COLORS.gray[500] },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {notebook.desc}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.notebookDate,
                      { color: isDark ? '#888' : HEALING_COLORS.gray[500] },
                    ]}
                  >
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
                {!notebook.isDefault && (
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMoreOptions(notebook);
                    }}
                  >
                    <Feather
                      name="more-horizontal"
                      size={24}
                      color={isDark ? '#AAA' : HEALING_COLORS.gray[400]}
                    />
                  </TouchableOpacity>
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
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalContent,
                    {
                      borderRadius: themeStyle.borderRadius,
                      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    },
                  ]}
                >
                <Text
                  style={[styles.modalTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
                >
                  {isEditMode ? '编辑日记本' : '新建日记本'}
                </Text>
                
                <TouchableOpacity style={styles.coverSelector} onPress={handlePickCover}>
                  {notebookCover ? (
                    <Image source={{ uri: notebookCover }} style={styles.coverImage} />
                  ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                      <Feather name="image" size={24} color={isDark ? '#AAA' : HEALING_COLORS.gray[400]} />
                      <Text style={[styles.coverText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[400] }]}>上传封面</Text>
                    </View>
                  )}
                  {isUploadingCover && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: themeStyle.borderRadius,
                      backgroundColor: isDark ? '#121212' : '#FAFAFA',
                      color: isDark ? '#FFF' : '#333',
                    },
                  ]}
                  placeholder="给日记本起个名字吧..."
                  placeholderTextColor={isDark ? '#888' : HEALING_COLORS.gray[400]}
                  value={newNotebookName}
                  onChangeText={setNewNotebookName}
                  maxLength={20}
                  autoFocus
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: themeStyle.borderRadius,
                      backgroundColor: isDark ? '#121212' : '#FAFAFA',
                      color: isDark ? '#FFF' : '#333',
                      marginTop: -8, // 减少与标题的间距
                    },
                  ]}
                  placeholder="给这本日记本添加一点描述吧 (可选)..."
                  placeholderTextColor={isDark ? '#888' : HEALING_COLORS.gray[400]}
                  value={newNotebookDesc}
                  onChangeText={setNewNotebookDesc}
                  maxLength={50}
                />

                {!isEditMode && (
                  <View style={styles.typeSelectorContainer}>
                    <Text style={[styles.typeLabel, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>类型</Text>
                    <View style={styles.typeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          notebookType === 'private' && styles.typeButtonActive,
                          { borderRadius: themeStyle.borderRadius }
                        ]}
                        onPress={() => setNotebookType('private')}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          notebookType === 'private' && styles.typeButtonTextActive
                        ]}>私密日记本</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          notebookType === 'shared' && styles.typeButtonActive,
                          !user?.isVip?.value && styles.typeButtonDisabled,
                          { borderRadius: themeStyle.borderRadius }
                        ]}
                        onPress={() => {
                          if (!user?.isVip?.value) {
                            Alert.alert('VIP 专属特权', '共享日记本是 VIP 用户的专属功能哦，升级即可解锁与 TA 共同记录美好回忆～', [
                              { text: '取消', style: 'cancel' },
                              { text: '去升级', onPress: () => navigation.navigate('Subscription') },
                            ]);
                            return;
                          }
                          setNotebookType('shared');
                        }}
                        activeOpacity={!user?.isVip?.value ? 1 : 0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[
                            styles.typeButtonText,
                            notebookType === 'shared' && styles.typeButtonTextActive,
                            !user?.isVip?.value && styles.typeButtonTextDisabled
                          ]}>共享日记本</Text>
                          {!user?.isVip?.value && (
                            <View style={styles.vipBadge}>
                              <Text style={styles.vipBadgeText}>VIP</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                    {notebookType === 'shared' && (
                      <Text style={[styles.typeHintText, { color: isDark ? '#888' : HEALING_COLORS.gray[500] }]}>
                        💡 适合记录情侣日常、闺蜜旅行、家庭账本等共同回忆。
                      </Text>
                    )}
                  </View>
                )}

                {!isEditMode && notebookType === 'shared' && (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderRadius: themeStyle.borderRadius,
                        backgroundColor: isDark ? '#121212' : '#FAFAFA',
                        color: isDark ? '#FFF' : '#333',
                      },
                    ]}
                    placeholder="输入对方手机号..."
                    placeholderTextColor={isDark ? '#888' : HEALING_COLORS.gray[400]}
                    value={inviteePhone}
                    onChangeText={setInviteePhone}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                )}

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
                    onPress={handleSaveNotebook}
                    disabled={isAdding || !newNotebookName.trim() || isUploadingCover}
                  >
                    <Text style={styles.confirmButtonText}>{isAdding ? '保存中...' : '确定'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
  notebookDesc: {
    fontSize: 13,
    color: HEALING_COLORS.gray[500],
    marginBottom: 4,
  },
  notebookNameActive: {
    color: HEALING_COLORS.pink[600],
  },
  sharedTag: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sharedTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notebookDate: {
    fontSize: 12,
    color: HEALING_COLORS.gray[400],
  },
  checkIcon: {
    marginLeft: 16,
  },
  moreButton: {
    marginLeft: 8,
    padding: 4,
  },
  notebookCover: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
  coverSelector: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    alignSelf: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  coverText: {
    marginTop: 8,
    fontSize: 14,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
  typeSelectorContainer: {
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: HEALING_COLORS.pink[50],
    borderColor: HEALING_COLORS.pink[300],
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: HEALING_COLORS.pink[600],
    fontWeight: '600',
  },
  typeHintText: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  typeButtonDisabled: {
    backgroundColor: '#FAFAFA',
    opacity: 0.8,
  },
  typeButtonTextDisabled: {
    color: '#AAA',
  },
  vipBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  vipBadgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
  invitationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  invitationCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  invitationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  invitationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  invBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invBtnReject: {
    backgroundColor: '#E5E5E5',
  },
  invBtnRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  invBtnAccept: {
    backgroundColor: HEALING_COLORS.pink[500],
  },
  invBtnAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default NotebooksScreen;
