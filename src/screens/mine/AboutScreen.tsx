import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFF' : HEALING_COLORS.gray[800]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
          关于毛球
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        indicatorStyle={isDark ? 'white' : 'black'}
      >
        <View style={styles.logoSection}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: isDark ? '#333' : HEALING_COLORS.pink[50],
                borderColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[400],
              },
            ]}
          >
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={[styles.appName, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
            毛球日记
          </Text>
          <Text style={[styles.versionText, { color: isDark ? '#888' : HEALING_COLORS.gray[400] }]}>
            Version 1.0.0
          </Text>

          <View
            style={[
              styles.sloganContainer,
              {
                backgroundColor: isDark ? '#2C1B24' : '#FFF0F3',
                borderColor: isDark ? '#4A2533' : '#FFE0E6',
              },
            ]}
          >
            <Text
              style={[
                styles.sloganText,
                { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600] },
              ]}
            >
              「收集日常里微小而确定的幸福」
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              毛球日记是一个温暖的树洞，也是你专属的时光手账。
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              在这里，你可以卸下疲惫，记录每一份开心、难过或是突如其来的灵感。那些看似平淡的日常与沿途的风景，都将化作闪光的碎片，被妥善地珍藏在岁月的口袋里。
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              不仅如此，你还可以创建共享日记，邀请恋人、挚友或家人共同书写。无论相隔多远，你们都能在这个专属的小天地里，分享彼此的生活点滴，让爱与陪伴不缺席。
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              希望毛球能像一个小小的太阳，永远温暖地陪伴你的每一段回忆。🐾✨
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.menuItem,
              styles.menuItemBorder,
              { borderBottomColor: isDark ? '#333' : HEALING_COLORS.gray[100] },
            ]}
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              ✨ 去应用市场给毛球好评
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.menuItem,
              styles.menuItemBorder,
              { borderBottomColor: isDark ? '#333' : HEALING_COLORS.gray[100] },
            ]}
            onPress={() =>
              (navigation as any).navigate('Web', {
                url: 'https://www.xieyimao.com/doc/detailzh/token/1772109293_4012',
                title: '用户服务协议',
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              📄 用户服务协议
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              (navigation as any).navigate('Web', {
                url: 'https://www.xieyimao.com/doc/detailzh/token/1772108718_2251',
                title: '隐私保护政策',
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              🔒 隐私保护政策
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#666' : HEALING_COLORS.gray[400] }]}>
            毛球工作室 版权所有
          </Text>
          <Text style={[styles.footerText, { color: isDark ? '#666' : HEALING_COLORS.gray[400] }]}>
            Copyright © 2026 Maoqiu Studio.
          </Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: HEALING_COLORS.pink[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: HEALING_COLORS.pink[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: HEALING_COLORS.gray[800],
    marginBottom: 6,
  },
  versionText: {
    fontSize: 14,
    color: HEALING_COLORS.gray[400],
    fontWeight: '600',
    marginBottom: 24,
  },
  sloganContainer: {
    backgroundColor: '#FFF0F3',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE0E6',
  },
  sloganText: {
    fontSize: 16,
    fontWeight: '700',
    color: HEALING_COLORS.pink[600],
    marginBottom: 12,
  },
  sloganSubText: {
    fontSize: 14,
    color: HEALING_COLORS.gray[600],
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: HEALING_COLORS.gray[100],
  },
  menuItemText: {
    fontSize: 15,
    color: HEALING_COLORS.gray[800],
    fontWeight: '600',
  },
  footer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: HEALING_COLORS.gray[400],
    marginTop: 4,
  },
});

export default AboutScreen;
