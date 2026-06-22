import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as RNIap from 'react-native-iap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { fetchRemoteAppConfig } from '../../services/configService';
import { ensureIAPConnection } from '../../services/iapManager';
import { CloudService } from '../../services/tcb';
import { useAuthStore } from '../../store/authStore';

import { useToast } from '@/components/common/Toast';

type SubscriptionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Subscription'
>;

const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const USER_AGREEMENT_URL = 'https://wqs2019.github.io/maoqiu-diary-app/terms.html';
const PRIVACY_POLICY_URL = 'https://wqs2019.github.io/maoqiu-diary-app/privacy.html';
const VIP_ERROR_CODES = {
  SUBSCRIPTION_OWNED_BY_OTHER_USER: 'SUBSCRIPTION_OWNED_BY_OTHER_USER',
} as const;

const resolveReceiptForVerification = async (purchaseLike: { purchaseToken?: string | null; transactionReceipt?: string | null; transactionId?: string | null; productId?: string | null }) => {
  if (Platform.OS === 'ios') {
    return (purchaseLike.transactionReceipt || await RNIap.getReceiptIOS() || '').trim();
  }
  return (purchaseLike.purchaseToken || purchaseLike.transactionReceipt || purchaseLike.transactionId || '').trim();
};

const verifyVipPurchaseForUser = async (userId: string, receiptData: string) => {
  const response: any = await CloudService.callFunction('user', {
    action: 'verifyPurchase',
    data: {
      _id: userId,
      receiptData,
    },
  });

  const result = response?.data;
  if (response?.code !== 0 || !result?.success) {
    const error = new Error(result?.message || response?.message || '会员校验失败') as Error & {
      code?: string;
    };
    error.code = result?.errorCode;
    throw error;
  }

  await useAuthStore.getState().fetchUserInfo();
  return result.data;
};

const syncVipStatusForUser = async (userId: string) => {
  const response: any = await CloudService.callFunction('user', {
    action: 'syncVip',
    data: {
      _id: userId,
    },
  });

  const result = response?.data;
  if (response?.code !== 0 || !result?.success) {
    const error = new Error(result?.message || response?.message || '会员状态同步失败') as Error & {
      code?: string;
    };
    error.code = result?.errorCode;
    throw error;
  }

  await useAuthStore.getState().fetchUserInfo();
  return result.data;
};

const APP_VERSION = Constants.expoConfig?.version || Constants.nativeAppVersion || '0.0.0';

const compareVersions = (currentVersion: string, targetVersion: string) => {
  const currentParts = String(currentVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const targetParts = String(targetVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const maxLength = Math.max(currentParts.length, targetParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const current = currentParts[index] || 0;
    const target = targetParts[index] || 0;

    if (current > target) {
      return 1;
    }

    if (current < target) {
      return -1;
    }
  }

  return 0;
};

const getRestoreErrorMessage = (error: any, t: (key: string) => string) => {
  if (error?.code === VIP_ERROR_CODES.SUBSCRIPTION_OWNED_BY_OTHER_USER) {
    return t('subscriptionScreen.errors.noValidSubscription');
  }

  return error?.message || t('subscriptionScreen.errors.restoreFailed');
};

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<SubscriptionScreenNavigationProp>();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;

  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [selectedPlan, setSelectedPlan] = useState<string>('com.maoqiu.diary.yearly');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(t('subscriptionScreen.loading.processing'));
  const [latestVersion, setLatestVersion] = useState<string>('');
  const isActiveVIP = !!user?.isVip?.value;
  const isPurchasing = useRef(false);

  const startLoading = (message: string) => {
    setLoadingMessage(message);
    setLoading(true);
  };

  const stopLoading = () => {
    setLoading(false);
    setLoadingMessage(t('subscriptionScreen.loading.processing'));
  };

  const plans = [
    {
      id: 'com.maoqiu.diary.monthly',
      title: t('subscriptionScreen.plans.monthly.title'),
      price: '¥8',
      originalPrice: '¥12',
      label: t('subscriptionScreen.plans.monthly.label'),
    },
    {
      id: 'com.maoqiu.diary.quarterly',
      title: t('subscriptionScreen.plans.quarterly.title'),
      price: '¥25',
      originalPrice: '¥36',
      label: t('subscriptionScreen.plans.quarterly.label'),
    },
    {
      id: 'com.maoqiu.diary.half_yearly',
      title: t('subscriptionScreen.plans.halfYearly.title'),
      price: '¥40',
      originalPrice: '¥72',
      label: t('subscriptionScreen.plans.halfYearly.label'),
    },
    {
      id: 'com.maoqiu.diary.yearly',
      title: t('subscriptionScreen.plans.yearly.title'),
      price: '¥72',
      originalPrice: '¥144',
      label: t('subscriptionScreen.plans.yearly.label'),
      isHot: true,
    },
  ];

  const features = [
    { icon: 'image', title: t('subscriptionScreen.features.image.title'), desc: t('subscriptionScreen.features.image.desc') },
    { icon: 'book', title: t('subscriptionScreen.features.book.title'), desc: t('subscriptionScreen.features.book.desc') },
    { icon: 'cpu', title: t('subscriptionScreen.features.cpu.title'), desc: t('subscriptionScreen.features.cpu.desc') },
    { icon: 'shield', title: t('subscriptionScreen.features.shield.title'), desc: t('subscriptionScreen.features.shield.desc') },
    { icon: 'share', title: t('subscriptionScreen.features.share.title'), desc: t('subscriptionScreen.features.share.desc') },
    { icon: 'briefcase', title: t('subscriptionScreen.features.briefcase.title'), desc: t('subscriptionScreen.features.briefcase.desc') },
  ];

  useEffect(() => {
    let purchaseUpdateSubscription: any = null;
    let purchaseErrorSubscription: any = null;

    const initIAP = async () => {
      try {
        try {
          const { doc } = await fetchRemoteAppConfig();
          setLatestVersion(doc?.version?.trim() || '');
        } catch (configError) {
          console.log('订阅页获取远程版本配置失败:', configError);
        }

        console.log('IAP: 准备建立/复用全局连接...');
        await ensureIAPConnection();
        console.log('IAP: 建立/复用全局连接成功');

        // 必须先获取商品信息，否则苹果无法弹出支付窗口
        const itemSKUs = plans.map((p) => p.id);
        console.log('IAP: 开始请求商品信息, skus:', itemSKUs);
        const products = await RNIap.fetchProducts({ skus: itemSKUs, type: 'subs' });
        console.log('IAP: 获取商品信息结果:', products?.length);

        if (!products || products.length === 0) {
          console.warn('IAP: ⚠️ 警告: 未获取到任何商品信息，苹果可能会报 SKU not found 错误！');
        }

        const currentUser = useAuthStore.getState().user;
        if (currentUser?._id) {
          console.log('IAP: 开始基于当前账号同步会员状态...');
          try {
            await syncVipStatusForUser(currentUser._id);
          } catch (syncError) {
            console.log('IAP: 初始会员同步跳过/失败:', syncError);
          }
        }
      } catch (err: any) {
        console.error('IAP Init Error:', err.code, err.message);
      }
    };
    initIAP();

    purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('IAP: purchaseUpdatedListener 收到回调', purchase);
      const receipt = await resolveReceiptForVerification(purchase as any);
      if (receipt) {
        try {
          if (purchase.purchaseState === 'pending') {
            console.log('IAP: 订单仍在 pending 状态，暂不发放VIP');
            if (isPurchasing.current) {
            if (navigation.isFocused()) {
              toast.success(t('subscriptionScreen.loading.pendingOrder'));
              }
              isPurchasing.current = false;
              stopLoading();
            }
            return;
          }

          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            setLoadingMessage(t('subscriptionScreen.loading.verifyingPurchase'));
            await verifyVipPurchaseForUser(currentUser._id, receipt);
          }

          if (isPurchasing.current) {
            if (navigation.isFocused()) {
              toast.success(t('subscriptionScreen.purchaseSuccess'));
            } else {
              console.log('IAP: 购买成功，但用户已离开订阅页面，静默发放VIP');
            }
            isPurchasing.current = false;
          } else {
            console.log('IAP: 自动恢复/处理了之前的遗留订单，静默完成');
          }

          console.log('IAP: 开始 finishTransaction...');
          setLoadingMessage(t('subscriptionScreen.loading.finishingOrder'));
          await RNIap.finishTransaction({ purchase, isConsumable: false });
          console.log('IAP: finishTransaction 成功');
        } catch (err) {
          console.error('IAP: 处理订单或 finishTransaction 失败', err);
        } finally {
          stopLoading();
        }
      } else {
        console.warn('IAP: ⚠️ 警告: purchase对象中没有 receipt/purchaseToken 字段');
        stopLoading();
      }
    });

    purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('IAP: purchaseErrorListener 收到错误', error);

      const errorCode = String(error.code);
      let errorMessage = t('subscriptionScreen.errors.unknownPurchaseError');

      switch (errorCode) {
        case 'user-cancelled':
        case 'E_USER_CANCELLED':
        case 'PROMISE_BUY_ITEM':
          errorMessage = t('subscriptionScreen.errors.cancelled');
          break;
        case 'E_ALREADY_OWNED':
          errorMessage = t('subscriptionScreen.errors.alreadyOwned');
          break;
        case 'E_ITEM_UNAVAILABLE':
          errorMessage = t('subscriptionScreen.errors.itemUnavailable');
          break;
        case 'E_NETWORK_ERROR':
          errorMessage = t('subscriptionScreen.errors.networkError');
          break;
        case 'E_SERVICE_ERROR':
          errorMessage = t('subscriptionScreen.errors.serviceError');
          break;
        case 'E_RECEIPT_FAILED':
        case 'E_RECEIPT_FINISHED_FAILED':
          errorMessage = t('subscriptionScreen.errors.receiptFailed');
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      if (navigation.isFocused()) {
        toast.error(errorMessage);
      }
      stopLoading();
      isPurchasing.current = false;
      // 增加 E_USER_CANCELLED 的容错处理，有时它是作为字符串传递的
      if (
        errorCode !== 'user-cancelled' &&
        errorCode !== 'E_USER_CANCELLED' &&
        errorCode !== 'PROMISE_BUY_ITEM'
      ) {
        if (navigation.isFocused()) {
          Alert.alert(t('subscriptionScreen.purchaseFailed'), errorMessage);
        } else {
          console.log('IAP: 购买失败，但用户已离开订阅页面，不弹窗打扰', errorMessage);
        }
      }
    });

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
        purchaseUpdateSubscription = null;
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
        purchaseErrorSubscription = null;
      }
      // 注意：不要在这里直接 endConnection，如果用户快速离开页面，内购回调还没处理完，连接就断开了
      // 如果需要在 App 退出时断开，可以在 App.tsx 中统一管理
      // RNIap.endConnection();
    };
  }, []);

  const handleSubscribe = async () => {
    if (loading) return;

    if (latestVersion && compareVersions(APP_VERSION, latestVersion) < 0) {
      Alert.alert(
        t('subscriptionScreen.upgradeSuggestTitle'),
        t('subscriptionScreen.upgradeSuggestMessage', { current: APP_VERSION, latest: latestVersion })
      );
      return;
    }

    startLoading(t('subscriptionScreen.loading.connectStore'));
    isPurchasing.current = true;
    try {
      console.log('IAP: 准备发起 requestPurchase，SKU:', selectedPlan);
      // 移除了 Alert.alert('请求中...') 避免与后续的弹窗堆叠

      const requestResult = await RNIap.requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: selectedPlan, andDangerouslyFinishTransactionAutomatically: false },
          google: { skus: [selectedPlan] },
        },
      });
      console.log('IAP: requestPurchase 发起成功，返回信息:', requestResult);
      // 购买结果由 purchaseUpdatedListener / purchaseErrorListener 驱动，在此保持全局 loading
      setLoadingMessage(t('subscriptionScreen.loading.waitingPurchaseResult'));
    } catch (err: any) {
      console.error('IAP: requestPurchase 异常:', err);
      stopLoading();
      isPurchasing.current = false;
      if (err.code !== 'user-cancelled' && err.code !== 'E_USER_CANCELLED') {
        Alert.alert(t('subscriptionScreen.requestFailed'), err.message);
      }
    }
  };

  const handleRestore = async () => {
    if (loading) return;
    startLoading(t('subscriptionScreen.loading.restoring'));
    console.log('IAP: 开始执行恢复购买流程...');
    // 移除了 Alert.alert('恢复购买...') 避免与结果弹窗重叠显示
    try {
      console.log('IAP: 正在调用 getAvailablePurchases()...');
      const purchases = await RNIap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      console.log('IAP: 恢复购买获取到的有效订阅记录:', purchases?.length);

      if (purchases && purchases.length > 0) {
        // Sort to get the most recent purchase
        purchases.sort((a, b) => Number(b.transactionDate) - Number(a.transactionDate));
        console.log('IAP: 恢复成功，找到了历史订阅', purchases);
        const activePurchase = purchases[0] as any;
        const currentUser = useAuthStore.getState().user;
        const receipt = await resolveReceiptForVerification(activePurchase);

        if (!currentUser?._id) {
          throw new Error(t('subscriptionScreen.loginRequiredForRestore'));
        }

        if (!receipt) {
          throw new Error(t('subscriptionScreen.restoreReceiptMissing'));
        }

        setLoadingMessage(t('subscriptionScreen.loading.verifyingRestore'));
        await verifyVipPurchaseForUser(currentUser._id, receipt);
        Alert.alert(t('subscriptionScreen.restoreSuccessTitle'), t('subscriptionScreen.restoreSuccessMessage'));
      } else {
        console.log('IAP: 恢复结束，没有找到有效的订阅记录');
        Alert.alert(t('subscriptionScreen.restoreResultTitle'), t('subscriptionScreen.restoreEmpty'));
      }
    } catch (err: any) {
      console.error('IAP: 恢复购买异常:', err);
      Alert.alert(t('subscriptionScreen.errors.restoreFailed'), getRestoreErrorMessage(err, t as any));
    } finally {
      console.log('IAP: 恢复购买流程结束');
      stopLoading();
    }
  };

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? '#121212' : '#FFF5F7', paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFF' : currentHealingColors.gray[800]}
          />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}
        >
          {isActiveVIP ? t('subscriptionScreen.header.active') : t('subscriptionScreen.header.inactive')}
        </Text>
        {!isActiveVIP ? (
          <TouchableOpacity style={styles.headerRight} onPress={handleRestore}>
            <Text style={[styles.restoreText, { color: currentHealingColors.pink[500] }]}>
              {t('subscriptionScreen.header.restore')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {loading && (
        <View style={styles.globalLoadingOverlay} pointerEvents="auto">
          <View style={[styles.globalLoadingCard, { backgroundColor: isDark ? 'rgba(30,30,30,0.96)' : 'rgba(255,255,255,0.96)' }]}>
            <ActivityIndicator size="large" color={currentHealingColors.pink[500]} />
            <Text style={[styles.globalLoadingTitle, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>
              {t('subscriptionScreen.loading.overlayTitle')}
            </Text>
            <Text style={[styles.globalLoadingText, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
              {loadingMessage}
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* VIP 卡片区 */}
        <View style={styles.cardContainer}>
          <View
            style={[
              styles.vipCard,
              isActiveVIP
                ? { backgroundColor: '#2C2C2C', shadowColor: '#000' } // 尊贵的黑金风格
                : {
                    backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[500],
                    shadowColor: isDark ? '#000' : currentHealingColors.pink[500],
                  },
            ]}
          >
            <View style={styles.vipCardHeader}>
              <Text style={[styles.vipCardTitle, isActiveVIP && { color: '#FBBF24' }]}>
                {isActiveVIP ? t('subscriptionScreen.vipCard.activeTitle') : t('subscriptionScreen.vipCard.inactiveTitle')}
              </Text>
              <Feather name="award" size={24} color={isActiveVIP ? '#FBBF24' : '#FFF'} />
            </View>
            <Text style={[styles.vipCardSubtitle, isActiveVIP && { color: '#D1D5DB' }]}>
              {isActiveVIP ? t('subscriptionScreen.vipCard.activeSubtitle') : t('subscriptionScreen.vipCard.inactiveSubtitle')}
            </Text>
            <View style={styles.vipCardFooter}>
              <Text
                style={[
                  styles.vipCardStatus,
                  isActiveVIP && { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24' },
                ]}
              >
                {isActiveVIP ? t('subscriptionScreen.vipCard.activeStatus') : t('subscriptionScreen.vipCard.inactiveStatus')}
              </Text>
              {isActiveVIP && user?.isVip?.expiresAt && (
                <Text style={[styles.vipCardExpire, isActiveVIP && { color: '#9CA3AF' }]}>
                  {t('subscriptionScreen.vipCard.expiresAt', {
                    date: new Date(user.isVip.expiresAt).toLocaleDateString(i18n.language),
                  })}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 特权列表 */}
        <View style={styles.sectionContainer}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
            ]}
          >
            {isActiveVIP ? t('subscriptionScreen.featuresTitle.active') : t('subscriptionScreen.featuresTitle.inactive')}
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: isDark ? '#374151' : currentHealingColors.pink[50] },
                  ]}
                >
                  <Feather
                    name={feature.icon as any}
                    size={22}
                    color={isDark ? currentHealingColors.pink[400] : currentHealingColors.pink[500]}
                  />
                </View>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
                  ]}
                >
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDesc,
                    { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                  ]}
                >
                  {feature.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 订阅选项 */}
        {!isActiveVIP && (
          <View style={styles.sectionContainer}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
              ]}
            >
              {t('subscriptionScreen.plansTitle')}
            </Text>
            <View style={styles.plansContainer}>
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFF',
                        borderColor: isSelected
                          ? currentHealingColors.pink[500]
                          : isDark
                            ? '#333'
                            : '#F3F4F6',
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedPlan(plan.id);
                    }}
                  >
                    {plan.isHot && (
                      <View
                        style={[styles.hotTag, { backgroundColor: currentHealingColors.pink[600] }]}
                      >
                        <Text style={styles.hotTagText}>{t('subscriptionScreen.plans.hot')}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.planTitle,
                        { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
                      ]}
                    >
                      {plan.title}
                    </Text>
                    <View style={styles.priceContainer}>
                      <Text
                        style={[
                          styles.planPrice,
                          {
                            color: isSelected
                              ? currentHealingColors.pink[500]
                              : isDark
                                ? '#FFF'
                                : currentHealingColors.gray[800],
                          },
                        ]}
                      >
                        {plan.price}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.planOriginalPrice,
                        { color: isDark ? '#6B7280' : currentHealingColors.gray[400] },
                      ]}
                    >
                      {t('subscriptionScreen.plans.originalPrice', { price: plan.originalPrice })}
                    </Text>
                    <View
                      style={[
                        styles.planLabelWrap,
                        {
                          backgroundColor: isSelected
                            ? currentHealingColors.pink[50]
                            : isDark
                              ? '#374151'
                              : '#F3F4F6',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.planLabel,
                          {
                            color: isSelected
                              ? currentHealingColors.pink[600]
                              : isDark
                                ? '#D1D5DB'
                                : currentHealingColors.gray[600],
                          },
                        ]}
                      >
                        {plan.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 底部购买说明 */}
        {!isActiveVIP && (
          <View style={styles.footerContainer}>
            <Text
              style={[
                styles.footerText,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500], textAlign: 'left' },
              ]}
            >
              {t('subscriptionScreen.footerNotes')}
            </Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Web' as any, {
                    url: APPLE_EULA_URL,
                    title: t('subscriptionScreen.eula'),
                  });
                }}
              >
                <Text style={[styles.linkText, { color: currentHealingColors.pink[500] }]}>
                  {t('subscriptionScreen.eula')}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.linkDot,
                  { color: isDark ? '#6B7280' : currentHealingColors.gray[400] },
                ]}
              >
                ・
              </Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Web' as any, {
                    url: USER_AGREEMENT_URL,
                    title: t('loginScreen.userAgreement'),
                  });
                }}
              >
                <Text style={[styles.linkText, { color: currentHealingColors.pink[500] }]}>
                  {t('loginScreen.userAgreement')}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.linkDot,
                  { color: isDark ? '#6B7280' : currentHealingColors.gray[400] },
                ]}
              >
                ・
              </Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Web' as any, {
                    url: PRIVACY_POLICY_URL,
                    title: t('loginScreen.privacyPolicy'),
                  });
                }}
              >
                <Text style={[styles.linkText, { color: currentHealingColors.pink[500] }]}>
                  {t('loginScreen.privacyPolicy')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部悬浮按钮 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFF',
            borderTopColor: isDark ? '#333' : '#F3F4F6',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: isActiveVIP ? '#2C2C2C' : currentHealingColors.pink[500] }, // 已经是VIP时变为黑金风格
            loading && { opacity: 0.7 },
          ]}
          activeOpacity={0.8}
          disabled={loading}
          onPress={
            isActiveVIP
              ? () => Linking.openURL('https://apps.apple.com/account/subscriptions')
              : handleSubscribe
          }
        >
          {loading ? (
            <ActivityIndicator color={isActiveVIP ? '#FBBF24' : '#FFF'} />
          ) : (
            <Text style={[styles.subscribeButtonText, isActiveVIP && { color: '#FBBF24' }]}>
              {isActiveVIP ? t('subscriptionScreen.manage') : t('subscriptionScreen.subscribeNow')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  globalLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  globalLoadingCard: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  globalLoadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
  },
  globalLoadingText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  vipCard: {
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  vipCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vipCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  vipCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
  },
  vipCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipCardStatus: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vipCardExpire: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  planCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
    position: 'relative',
    alignItems: 'center',
  },
  hotTag: {
    position: 'absolute',
    top: -12,
    right: -10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderBottomLeftRadius: 0,
  },
  hotTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
  },
  planOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 12,
  },
  planLabelWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'left',
    marginBottom: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  linkDot: {
    marginHorizontal: 8,
    fontSize: 12,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32, // for safe area bottom if needed, adjust accordingly
    borderTopWidth: 1,
  },
  subscribeButton: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SubscriptionScreen;
