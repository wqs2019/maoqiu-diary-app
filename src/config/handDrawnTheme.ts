import { useAppStore } from '../store/appStore';

// 治愈系手绘风格主题配置

export interface HandDrawnStyle {
  name: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  backgroundPattern?: 'dots' | 'lines' | 'clouds' | 'stars';
  gradients: string[];
}

// 手绘风格主题
export const HAND_DRAWN_STYLES: Record<string, HandDrawnStyle> = {
  soft: {
    name: '柔和手绘',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#FF85A2',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    backgroundPattern: 'dots',
    gradients: ['#FFF5F7', '#FFE4E9'],
  },
  warm: {
    name: '温暖手绘',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#FFD6E0',
    shadowColor: '#FFB6C1',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    backgroundPattern: 'clouds',
    gradients: ['#FFF9F0', '#FFF0E0'],
  },
  dreamy: {
    name: '梦幻手绘',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#E0F0FF',
    shadowColor: '#B6D8FF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    backgroundPattern: 'stars',
    gradients: ['#F0F8FF', '#E6F4FF'],
  },
  natural: {
    name: '自然手绘',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D4EDD4',
    shadowColor: '#A8E6A8',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    backgroundPattern: 'lines',
    gradients: ['#F5FFF5', '#E8F8E8'],
  },
};

// 扩展颜色系统 - 治愈系配色
export const HEALING_COLORS = {
  get pink() {
    try {
      const colorKey = useAppStore.getState().themeColor || 'pink';
      const colors: any = {
        pink: this._pink,
        blue: this._blue,
        yellow: this._yellow,
        green: this._green,
        purple: this._purple,
        orange: this._orange,
        cyan: this._cyan,
        brown: this._brown,
      };
      return colors[colorKey] || this._pink;
    } catch (e) {
      return this._pink;
    }
  },
  // 主色调 - 粉色系
  _pink: {
    50: '#FFF5F7',
    100: '#FFE4E9',
    200: '#FFC5D1',
    300: '#FFA6B9',
    400: '#FF85A2', // primary
    500: '#FF6B9D',
    600: '#FF4D8B',
    700: '#FF2E79',
    800: '#FF0F67',
    900: '#E00055',
  },
  // 辅助色 - 蓝色系
  _blue: {
    50: '#F0F8FF',
    100: '#E6F4FF',
    200: '#CCE8FF',
    300: '#99D0FF',
    400: '#66B8FF',
    500: '#33A0FF',
    600: '#0088FF',
    700: '#0077E6',
    800: '#0066CC',
    900: '#0055B3',
  },
  get blue() { return this._blue; },
  // 辅助色 - 黄色系
  _yellow: {
    50: '#FFFBF0',
    100: '#FFF7E0',
    200: '#FFEEC0',
    300: '#FFE5A0',
    400: '#FFDC80',
    500: '#FFD60A',
    600: '#E6C000',
    700: '#CCAA00',
    800: '#B39500',
    900: '#997F00',
  },
  get yellow() { return this._yellow; },
  // 辅助色 - 绿色系
  _green: {
    50: '#F0FFF0',
    100: '#E0FFE0',
    200: '#C0FFC0',
    300: '#A0FFA0',
    400: '#80FF80',
    500: '#34C759',
    600: '#2DB34F',
    700: '#269F45',
    800: '#1F8B3B',
    900: '#187731',
  },
  get green() { return this._green; },
  // 紫色系
  _purple: {
    50: '#F9F0FF',
    100: '#F3E0FF',
    200: '#E6C0FF',
    300: '#D9A8F0',
    400: '#C880FF',
    500: '#AF52DE',
    600: '#9B41C7',
    700: '#8731B0',
    800: '#732199',
    900: '#5F1182',
  },
  get purple() { return this._purple; },
  // 活力橘
  _orange: {
    50: '#FFF6E5',
    100: '#FFE6CC',
    200: '#FFD699',
    300: '#FFC266',
    400: '#FFB033',
    500: '#FF9500', // primary
    600: '#E68600',
    700: '#CC7700',
    800: '#B36800',
    900: '#995900',
  },
  get orange() { return this._orange; },
  // 浅海青
  _cyan: {
    50: '#E5FAF9',
    100: '#CCF5F3',
    200: '#99EBE7',
    300: '#66E0DA',
    400: '#33D6CE',
    500: '#00C7BE', // primary
    600: '#00B3AB',
    700: '#009F98',
    800: '#008B85',
    900: '#007772',
  },
  get cyan() { return this._cyan; },
  // 可可棕
  _brown: {
    50: '#F9F6F0',
    100: '#F0EBE1',
    200: '#E6DAC3',
    300: '#DCCAA5',
    400: '#D1B987',
    500: '#C0A080', // primary
    600: '#A68A6B',
    700: '#8C7355',
    800: '#735C40',
    900: '#59462B',
  },
  get brown() { return this._brown; },
  // 中性色 - 温暖灰
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// 手绘风格字体配置
export const HAND_DRAWN_FONT_SIZES = {
  xsmall: 10,
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18,
  xxlarge: 22,
  xxxlarge: 28,
};

// 手绘风格间距
export const HAND_DRAWN_SPACING = {
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

// 场景化模板配色
export const SCENARIO_COLORS = {
  travel: {
    primary: '#5AC8FA',
    secondary: '#B6E8FF',
    background: '#F0F9FF',
    icon: '✈️',
  },
  movie: {
    primary: '#FF6B9D',
    secondary: '#FFB6D1',
    background: '#FFF5F7',
    icon: '🎬',
  },
  outing: {
    primary: '#34C759',
    secondary: '#A8E6A8',
    background: '#F0FFF0',
    icon: '🌳',
  },
  food: {
    primary: '#FF9500',
    secondary: '#FFD699',
    background: '#FFFBF0',
    icon: '🍔',
  },
  daily: {
    primary: '#FF85A2',
    secondary: '#FFC5D1',
    background: '#FFF5F7',
    icon: '📝',
  },
  special: {
    primary: '#AF52DE',
    secondary: '#D8B4FE',
    background: '#F9F0FF',
    icon: '🎉',
  },
  learning: {
    primary: '#009688',
    secondary: '#B2EBF2',
    background: '#F3E5F5',
    icon: '📚',
  },
  inspiration: {
    primary: '#FF9800',
    secondary: '#FFE0B2',
    background: '#FFF3E0',
    icon: '💡',
  },
};

// 深色模式适配
export const DARK_HEALING_COLORS = {
  pink: {
    50: '#2D1F22',
    100: '#3D2A2F',
    200: '#4D353C',
    300: '#5D4049',
    400: '#6D4B56',
    500: '#FF85A2',
    600: '#FF9EB5',
    700: '#FFB6C1',
    800: '#FFC5D1',
    900: '#FFE4E9',
  },
  blue: {
    50: '#1A2327',
    100: '#253338',
    200: '#304349',
    300: '#3B535A',
    400: '#46636B',
    500: '#5AC8FA',
    600: '#7FD7FB',
    700: '#A4E6FC',
    800: '#C9F0FD',
    900: '#EEFAFE',
  },
  orange: {
    50: '#2A1F1A',
    100: '#3D2A20',
    200: '#523624',
    300: '#664129',
    400: '#8A5531',
    500: '#FF9500',
    600: '#CC7700',
    700: '#995A00',
    800: '#663D00',
    900: '#331E00',
  },
  cyan: {
    50: '#1A2A29',
    100: '#203D3B',
    200: '#26524F',
    300: '#2C6662',
    400: '#338A84',
    500: '#00C7BE',
    600: '#009F98',
    700: '#007772',
    800: '#004F4C',
    900: '#002826',
  },
  brown: {
    50: '#2A2624',
    100: '#3D3530',
    200: '#52453C',
    300: '#665448',
    400: '#8A705E',
    500: '#C0A080',
    600: '#998066',
    700: '#73604D',
    800: '#4D4033',
    900: '#26201A',
  },
};
