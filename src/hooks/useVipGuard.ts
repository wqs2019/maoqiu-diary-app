import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';

export const useVipGuard = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);

  const checkVipPermission = (
    action: 'writeDiary' | 'createNotebook' | 'manageNotebook',
    onConfirm?: () => void
  ): boolean => {
    if (!user) {
      Alert.alert('提示', '用户未登录，请重新登录');
      return false;
    }

    if (action === 'writeDiary') {
      const currentNotebook = getCurrentNotebook(user._id);

      if (!user.isVip?.value) {
        if (!currentNotebook.isDefault) {
          Alert.alert(
            '日记本为只读状态',
            '您的 VIP 已过期。免费日记仅支持在【毛球日记】中记录。升级 VIP 即可继续在所有日记本中记录美好的回忆哦～',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '去升级',
                onPress: () => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  navigation.navigate('Subscription');
                },
              },
            ]
          );
          return false;
        }
      }
      return true;
    }

    if (action === 'createNotebook') {
      if (!user.isVip?.value) {
        Alert.alert(
          '日记本数量已达上限',
          '普通用户仅支持使用系统默认日记本。升级 VIP 即可创建无限个专属日记本，快来解锁吧～',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去升级',
              onPress: () => {
                if (onConfirm) {
                  onConfirm();
                }
                navigation.navigate('Subscription');
              },
            },
          ]
        );
        return false;
      }
      return true;
    }

    if (action === 'manageNotebook') {
      if (!user.isVip?.value) {
        Alert.alert(
          'VIP 专属特权',
          '编辑和删除日记本是 VIP 用户的专属功能哦，升级即可解锁所有高级功能～',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去升级',
              onPress: () => {
                if (onConfirm) {
                  onConfirm();
                }
                navigation.navigate('Subscription');
              },
            },
          ]
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const checkCanWriteDiary = (onConfirm?: () => void): boolean => checkVipPermission('writeDiary', onConfirm);

  const checkCanCreateNotebook = (onConfirm?: () => void): boolean => {
    return checkVipPermission('createNotebook', onConfirm);
  };

  const checkCanManageNotebook = (onConfirm?: () => void): boolean => {
    return checkVipPermission('manageNotebook', onConfirm);
  };

  return { checkCanWriteDiary, checkCanCreateNotebook, checkCanManageNotebook };
};
