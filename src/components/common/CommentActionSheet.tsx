import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Modal as CommonModal } from './Modal';

interface CommentActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  deleting?: boolean;
  isDark?: boolean;
  accentColor?: string;
  title?: string;
}

export const CommentActionSheet: React.FC<CommentActionSheetProps> = ({
  visible,
  onClose,
  onCopy,
  onDelete,
  canDelete = false,
  deleting = false,
  isDark = false,
  accentColor = '#FF6B9D',
  title = '评论操作',
}) => {
  const handleClose = deleting ? undefined : onClose;

  return (
    <CommonModal visible={visible} onClose={onClose}>
      <View style={styles.popupContainer}>
        <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={handleClose} />
        <View
          style={[
            styles.popupCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#E5E7EB',
            },
          ]}
        >
          <Text style={[styles.popupTitle, { color: isDark ? '#FFF' : '#111827' }]}>{title}</Text>
          <TouchableOpacity style={styles.popupAction} onPress={onCopy}>
            <Ionicons name="copy-outline" size={18} color={accentColor} />
            <Text style={[styles.popupActionText, { color: isDark ? '#FFF' : '#111827' }]}>复制</Text>
          </TouchableOpacity>
          {canDelete && onDelete ? (
            <TouchableOpacity
              style={[styles.commentDeleteAction, deleting && styles.commentDeleteActionDisabled]}
              onPress={onDelete}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.commentDeleteActionText}>{deleting ? '删除中...' : '删除'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.popupCancel} onPress={handleClose} disabled={deleting}>
            <Text style={[styles.popupCancelText, { color: isDark ? '#AAA' : '#6B7280' }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </CommonModal>
  );
};

const styles = StyleSheet.create({
  popupContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  popupBackdrop: {
    flex: 1,
  },
  popupCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  popupActionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  commentDeleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 18,
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#EF4444',
  },
  commentDeleteActionDisabled: {
    opacity: 0.7,
  },
  commentDeleteActionText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  popupCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  popupCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
