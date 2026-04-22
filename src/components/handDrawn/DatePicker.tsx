import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface DatePickerProps {
  selectedDate?: Date;
  onDateChange: (date: Date) => void;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateChange,
  label = '选择日期',
}) => {
  const { isDark } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  // 默认定位到今天
  const date = selectedDate || new Date();
  // 临时日期，用于在弹窗中修改
  const [tempDate, setTempDate] = useState(date);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  const handleCancel = () => {
    // 取消时重置为上次选择的日期
    setTempDate(date);
    setShowPicker(false);
  };

  const handleConfirm = () => {
    // 确定时保存临时日期
    onDateChange(tempDate);
    setShowPicker(false);
  };

  // 每次打开弹窗时，重置临时日期为当前选择的日期
  React.useEffect(() => {
    if (showPicker) {
      setTempDate(date);
    }
  }, [showPicker, date]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.dateButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#E5E5E5' }]}
        onPress={() => {
          setShowPicker(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={[styles.dateButtonText, { color: isDark ? '#FFF' : '#333' }]}>{formatDate(date)}</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#333' }]}>选择日期</Text>
            </View>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleChange}
              onDismiss={handleDismiss}
              textColor={isDark ? '#FFF' : '#333'}
              themeVariant={isDark ? 'dark' : 'light'}
              locale="zh-CN"
            />

            <View style={[styles.modalButtons, { borderTopColor: isDark ? '#333' : '#F0F0F0' }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderRightColor: isDark ? '#333' : '#F0F0F0' }]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: isDark ? '#AAA' : '#666' }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={[styles.confirmButtonText, { color: HEALING_COLORS.pink[500] }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  calendarIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: HEALING_COLORS.pink[500],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
