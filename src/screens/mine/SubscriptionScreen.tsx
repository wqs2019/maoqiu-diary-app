import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as RNIap from 'react-native-iap';

import { HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';

type SubscriptionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Subscription'>;

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<SubscriptionScreenNavigationProp>();
  const { isDark } = useAppTheme();
  const user = useAuthStore(state => state.user);
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;

  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<string>('com.maoqiu.diary.yearly');
  const [loading, setLoading] = useState<boolean>(false);
  const isActiveVIP = !!user?.isVip?.value;
  const isPurchasing = useRef(false);

  const plans = [
    { id: 'com.maoqiu.diary.monthly', title: '连续包月', price: '¥8', originalPrice: '¥12', label: '基础体验' },
    { id: 'com.maoqiu.diary.quarterly', title: '连续包季', price: '¥25', originalPrice: '¥36', label: '折扣优选' },
    { id: 'com.maoqiu.diary.half_yearly', title: '连续包半年', price: '¥40', originalPrice: '¥72', label: '超值特惠' },
    { id: 'com.maoqiu.diary.yearly', title: '连续包年', price: '¥72', originalPrice: '¥144', label: '年度最低，仅 ¥6/月', isHot: true },
  ];

  const features = [
    { icon: 'cloud', title: '云端同步', desc: '多设备无缝同步，日记永不丢失' },
    { icon: 'image', title: '无限图片', desc: '每篇日记可上传更多高清图片' },
    { icon: 'cpu', title: 'AI 智能问答', desc: '解锁无限制 AI 聊天与情感分析' },
    { icon: 'shield', title: '专属应用锁', desc: '更高强度的隐私保护功能' },
    { icon: 'star', title: '专属徽章', desc: '点亮 VIP 专属标识与主题色' },
    { icon: 'layout', title: '丰富手账本', desc: '海量专属贴纸、手绘模板免费用' },
  ];

  useEffect(() => {
    let purchaseUpdateSubscription: any = null;
    let purchaseErrorSubscription: any = null;

    const initIAP = async () => {
      try {
        console.log('IAP: initConnection 开始...');
        await RNIap.initConnection();
        console.log('IAP: initConnection 成功');

        // 必须先获取商品信息，否则苹果无法弹出支付窗口
        const itemSKUs = plans.map(p => p.id);
        console.log('IAP: 开始请求商品信息, skus:', itemSKUs);
        const products = await RNIap.fetchProducts({ skus: itemSKUs, type: 'subs' });
        console.log('IAP: 获取商品信息结果:', products?.length);

        if (!products || products.length === 0) {
          console.warn('IAP: ⚠️ 警告: 未获取到任何商品信息，苹果可能会报 SKU not found 错误！');
        }

        console.log('IAP: 开始初始检查用户历史订阅状态...');
        const availablePurchases = await RNIap.getAvailablePurchases();
        console.log('IAP: 初始检查获取到的有效订阅记录数量:', availablePurchases?.length);
        if (availablePurchases && availablePurchases.length > 0) {
          const activePurchase = availablePurchases[0] as any;
          console.log('IAP: => 发现有效订阅！该用户当前拥有VIP。', availablePurchases);
          const currentUser = useAuthStore.getState().user;
          const expiresAt = activePurchase.expirationDateIOS ? Number(activePurchase.expirationDateIOS) : undefined;
          if (currentUser && (!currentUser.isVip?.value || currentUser.isVip?.type !== activePurchase.productId || currentUser.isVip?.expiresAt !== expiresAt)) {
            useAuthStore.getState().updateProfile(currentUser._id, { isVip: { value: true, type: activePurchase.productId, expiresAt } }).catch(e => console.log(e));
          }
        } else {
          console.log('IAP: => 未发现有效订阅，用户当前不是VIP。');
          const currentUser = useAuthStore.getState().user;
          if (currentUser && currentUser.isVip?.value) {
            useAuthStore.getState().updateProfile(currentUser._id, { isVip: { value: false } }).catch(e => console.log(e));
          }
        }
      } catch (err: any) {
        console.error('IAP Init Error:', err.code, err.message);
      }
    };
    initIAP();

    purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('IAP: purchaseUpdatedListener 收到回调', purchase);
      const receipt = purchase.purchaseToken || (purchase as any).transactionReceipt;
      if (receipt) {
        try {
          console.log('IAP: 开始 finishTransaction...');
          await RNIap.finishTransaction({ purchase, isConsumable: false });
          console.log('IAP: finishTransaction 成功');
          setLoading(false);
          
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            const expiresAt = (purchase as any).expirationDateIOS ? Number((purchase as any).expirationDateIOS) : undefined;
            useAuthStore.getState().updateProfile(currentUser._id, { isVip: { value: true, type: purchase.productId, expiresAt } }).catch(e => console.log(e));
          }

          if (isPurchasing.current) {
            Alert.alert('购买成功', '请等待系统同步 VIP 状态。');
            isPurchasing.current = false;
          } else {
            console.log('IAP: 自动恢复/处理了之前的遗留订单，静默完成');
          }
        } catch (ackErr) {
          console.error('IAP: ackErr finishTransaction失败', ackErr);
        }
      } else {
        console.warn('IAP: ⚠️ 警告: purchase对象中没有 receipt/purchaseToken 字段');
      }
    });

    purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('IAP: purchaseErrorListener 收到错误', error);
      setLoading(false);
      isPurchasing.current = false;
      // 增加 E_USER_CANCELLED 的容错处理，有时它是作为字符串传递的
      const errorCode = String(error.code);
      if (errorCode !== 'user-cancelled' && errorCode !== 'E_USER_CANCELLED' && errorCode !== 'PROMISE_BUY_ITEM') {
        Alert.alert('购买失败', error.message);
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
    setLoading(true);
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
      // 注意：这里不再直接 alert 成功，因为 requestPurchase 是异步发送请求
      // 真正的结果会在 purchaseUpdatedListener 或 purchaseErrorListener 里处理
    } catch (err: any) {
      console.error('IAP: requestPurchase 异常:', err);
      setLoading(false);
      isPurchasing.current = false;
      if (err.code !== 'user-cancelled' && err.code !== 'E_USER_CANCELLED') {
        Alert.alert('请求失败', err.message);
      }
    }
  };

  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);
    console.log('IAP: 开始执行恢复购买流程...');
    // 移除了 Alert.alert('恢复购买...') 避免与结果弹窗重叠显示
    try {
      console.log('IAP: 正在调用 getAvailablePurchases()...');
      const purchases = await RNIap.getAvailablePurchases();
      console.log('IAP: 恢复购买获取到的有效订阅记录:', purchases?.length);
      
      if (purchases && purchases.length > 0) {
        console.log('IAP: 恢复成功，找到了历史订阅', purchases);
        const activePurchase = purchases[0] as any;
        const currentUser = useAuthStore.getState().user;
        const expiresAt = activePurchase.expirationDateIOS ? Number(activePurchase.expirationDateIOS) : undefined;
        if (currentUser && (!currentUser.isVip?.value || currentUser.isVip?.type !== activePurchase.productId || currentUser.isVip?.expiresAt !== expiresAt)) {
          useAuthStore.getState().updateProfile(currentUser._id, { isVip: { value: true, type: activePurchase.productId, expiresAt } }).catch(e => console.log(e));
        }
        Alert.alert('恢复成功', '您的订阅状态已恢复。');
      } else {
        console.log('IAP: 恢复结束，没有找到有效的订阅记录');
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.isVip?.value) {
          useAuthStore.getState().updateProfile(currentUser._id, { isVip: { value: false } }).catch(e => console.log(e));
        }
        Alert.alert('恢复结果', '暂无需要恢复的订阅记录。');
      }
    } catch (err: any) {
      console.error('IAP: 恢复购买异常:', err);
      Alert.alert('恢复失败', err.message);
    } finally {
      console.log('IAP: 恢复购买流程结束');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#FFF5F7', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={28} color={isDark ? '#FFF' : currentHealingColors.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>
          开通 VIP
        </Text>
        {!isActiveVIP ? (
          <TouchableOpacity style={styles.headerRight} onPress={handleRestore}>
            <Text style={[styles.restoreText, { color: currentHealingColors.pink[500] }]}>恢复购买</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* VIP 卡片区 */}
        <View style={styles.cardContainer}>
          <View
            style={[
              styles.vipCard,
              {
                backgroundColor: isDark ? '#2C1B24' : (isActiveVIP ? '#F59E0B' : currentHealingColors.pink[500]), // 已经是VIP时变为金色
                shadowColor: isDark ? '#000' : (isActiveVIP ? '#F59E0B' : currentHealingColors.pink[500]),
              }
            ]}
          >
            <View style={styles.vipCardHeader}>
              <Text style={styles.vipCardTitle}>毛球日记 高级会员</Text>
              <Feather name="award" size={24} color="#FFF" />
            </View>
            <Text style={styles.vipCardSubtitle}>
              {isActiveVIP ? '已解锁所有功能，感谢您的支持' : '解锁所有功能，记录美好生活'}
            </Text>
            <View style={styles.vipCardFooter}>
              <Text style={styles.vipCardStatus}>
                {isActiveVIP ? '当前已开通' : '当前未开通'}
              </Text>
              {isActiveVIP && user?.isVip?.expiresAt && (
                <Text style={styles.vipCardExpire}>
                  {new Date(user.isVip.expiresAt).toLocaleDateString('zh-CN')} 到期
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 特权列表 */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>
            会员专属特权
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIconWrap, { backgroundColor: isDark ? '#374151' : currentHealingColors.pink[50] }]}>
                  <Feather name={feature.icon as any} size={22} color={isDark ? currentHealingColors.pink[400] : currentHealingColors.pink[500]} />
                </View>
                <Text style={[styles.featureTitle, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 订阅选项 */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>
            选择订阅方案
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
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {plan.isHot && (
                    <View style={[styles.hotTag, { backgroundColor: currentHealingColors.pink[600] }]}>
                      <Text style={styles.hotTagText}>强烈推荐</Text>
                    </View>
                  )}
                  <Text style={[styles.planTitle, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>
                    {plan.title}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.planPrice, { color: isSelected ? currentHealingColors.pink[500] : isDark ? '#FFF' : currentHealingColors.gray[800] }]}>
                      {plan.price}
                    </Text>
                  </View>
                  <Text style={[styles.planOriginalPrice, { color: isDark ? '#6B7280' : currentHealingColors.gray[400] }]}>
                    原价 {plan.originalPrice}
                  </Text>
                  <View style={[styles.planLabelWrap, { backgroundColor: isSelected ? currentHealingColors.pink[50] : isDark ? '#374151' : '#F3F4F6' }]}>
                    <Text style={[styles.planLabel, { color: isSelected ? currentHealingColors.pink[600] : isDark ? '#D1D5DB' : currentHealingColors.gray[600] }]}>
                      {plan.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 底部购买说明 */}
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
            确认购买后，将从您的 iTunes 账户扣费。订阅会自动续期，除非在当前订阅期结束前至少 24 小时关闭自动续期。
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Web' as any, { url: 'https://maoqiu.com/terms', title: '用户协议' })}>
              <Text style={[styles.linkText, { color: currentHealingColors.pink[500] }]}>用户协议</Text>
            </TouchableOpacity>
            <Text style={[styles.linkDot, { color: isDark ? '#6B7280' : currentHealingColors.gray[400] }]}>・</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Web' as any, { url: 'https://maoqiu.com/privacy', title: '隐私政策' })}>
              <Text style={[styles.linkText, { color: currentHealingColors.pink[500] }]}>隐私政策</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 底部悬浮按钮 */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderTopColor: isDark ? '#333' : '#F3F4F6' }]}>
        <TouchableOpacity
          style={[
            styles.subscribeButton, 
            { backgroundColor: isActiveVIP ? '#9CA3AF' : currentHealingColors.pink[500] } // 已经是VIP时置灰
          ]}
          activeOpacity={0.8}
          onPress={isActiveVIP ? () => Alert.alert('提示', '您已经是尊贵的 VIP 会员了') : handleSubscribe}
        >
          <Text style={styles.subscribeButtonText}>
            {isActiveVIP ? '已开通 VIP' : '立即开通'}
          </Text>
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
  },
  featureItem: {
    width: '48%',
    marginBottom: 20,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
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
    lineHeight: 16,
    textAlign: 'center',
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