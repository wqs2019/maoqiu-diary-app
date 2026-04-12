import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAppStore, I18nLangType } from '../../store/appStore';

const SettingScreen: React.FC = () => {
  const { theme, language, setTheme, setLanguage } = useAppStore();

  const handleThemeChange = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };

  const handleLanguageChange = (lang: I18nLangType) => {
    setLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外观</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingItemText}>深色模式</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={handleThemeChange}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>语言</Text>
          <View style={styles.languageOptions}>
            <TouchableOpacity
              style={[styles.languageOption, language === 'zh-CN' && styles.languageOptionActive]}
              onPress={() => {
                handleLanguageChange('zh-CN');
              }}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'zh-CN' && styles.languageOptionTextActive,
                ]}
              >
                简体中文
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, language === 'en-US' && styles.languageOptionActive]}
              onPress={() => {
                handleLanguageChange('en-US');
              }}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'en-US' && styles.languageOptionTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>关于我们</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>隐私政策</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>用户协议</Text>
            <Text style={styles.settingItemArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.settingItem}>
            <Text style={styles.settingItemText}>版本</Text>
            <Text style={styles.settingItemValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: SPACING.medium,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: SPACING.large,
    paddingVertical: SPACING.small,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.medium,
    marginVertical: SPACING.small,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
  },
  settingItemText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
  },
  settingItemArrow: {
    fontSize: FONT_SIZES.xlarge,
    color: COLORS.textSecondary,
  },
  settingItemValue: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
  languageOptions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.medium,
    paddingBottom: SPACING.medium,
  },
  languageOption: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 8,
    marginHorizontal: SPACING.small,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: COLORS.primary + '20',
  },
  languageOptionText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
  },
  languageOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default SettingScreen;
