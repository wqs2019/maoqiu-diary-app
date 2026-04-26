import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';

const VIP_MESSAGES = {
  writeDiary: {
    title: '日记本为只读状态',
    message: '您的 VIP 已过期。免费日记仅支持在【毛球日记】中记录。升级 VIP 即可继续在所有日记本中记录美好的回忆哦～',
  },
  createNotebook: {
    title: '日记本数量已达上限',
    message: '普通用户仅支持使用系统默认日记本。升级 VIP 即可创建无限个专属日记本，快来解锁吧～',
  },
  manageNotebook: {
    title: 'VIP 专属特权',
    message: '编辑和删除日记本是 VIP 用户的专属功能哦，升级即可解锁所有高级功能～',
  },
  appLock: {
    title: 'VIP 专属特权',
    message: '隐私密码是 VIP 用户的专属功能哦，升级即可解锁保护您的日记安全～',
  },
} as const;

export const useVipGuard = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);

  const checkVipPermission = (
    action: keyof typeof VIP_MESSAGES,
    onConfirm?: () => void
  ): boolean => {
    if (!user) {
      Alert.alert('提示', '用户未登录，请重新登录');
      return false;
    }

    if (user.isVip?.value) {
      return true;
    }

    // 特殊处理：写日记时，如果是默认日记本则允许免费用户操作
    if (action === 'writeDiary') {
      const currentNotebook = getCurrentNotebook(user._id);
      if (currentNotebook.isDefault) {
        return true;
      }
    }

    const { title, message } = VIP_MESSAGES[action];

    Alert.alert(
      title,
      message,
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
  };

  return { checkVipPermission };
};
