import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';

export const useVipGuard = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);
  const { t } = useTranslation();

  const VIP_MESSAGES = {
    writeDiary: {
      title: t('vipGuard.writeDiary.title'),
      message: t('vipGuard.writeDiary.message'),
    },
    createNotebook: {
      title: t('vipGuard.createNotebook.title'),
      message: t('vipGuard.createNotebook.message'),
    },
    manageNotebook: {
      title: t('vipGuard.manageNotebook.title'),
      message: t('vipGuard.manageNotebook.message'),
    },
    appLock: {
      title: t('vipGuard.appLock.title'),
      message: t('vipGuard.appLock.message'),
    },
  } as const;

  const checkVipPermission = (
    action: keyof typeof VIP_MESSAGES,
    onConfirm?: () => void,
    context?: { isSharedNotebook?: boolean }
  ): boolean => {
    if (!user) {
      Alert.alert(t('common.tip'), t('vipGuard.notLoggedIn'));
      return false;
    }

    if (user.isVip?.value) {
      return true;
    }

    // 特殊处理：如果操作涉及共享日记本（比如解除共享），允许普通用户操作
    if (context?.isSharedNotebook) {
      return true;
    }

    // 特殊处理：写日记时，如果是默认日记本或者是共享日记本，则允许操作
    // 因为如果是共享日记本，说明创建者是 VIP（或者他被邀请加入了一个合法的共享日记本），
    // 被邀请者（即使不是 VIP）也应该能在里面写日记。
    if (action === 'writeDiary') {
      const currentNotebook = getCurrentNotebook(user._id);
      if (currentNotebook.isDefault || currentNotebook.type === 'shared') {
        return true;
      }
    }

    const { title, message } = VIP_MESSAGES[action];

    Alert.alert(
      title,
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vipGuard.upgrade'),
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
