export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES_CONFIG: BadgeConfig[] = [
  {
    id: 'badge_0',
    name: '萌新入驻',
    description: '毛球日记的新朋友，欢迎你的到来！',
    icon: '🐣',
    color: '#FFD60A',
  },
  {
    id: 'badge_1',
    name: '初次见面',
    description: '写下第 1 篇日记',
    icon: '📝',
    color: '#FF6B9D',
  },
  {
    id: 'badge_2',
    name: '渐入佳境',
    description: '累计写满 10 篇日记',
    icon: '📚',
    color: '#34C759',
  },
  {
    id: 'badge_3',
    name: '习惯养成',
    description: '累计写满 30 篇日记',
    icon: '🌟',
    color: '#5AC8FA',
  },
  {
    id: 'badge_4',
    name: '百日作家',
    description: '累计写满 100 篇日记',
    icon: '👑',
    color: '#AF52DE',
  },
  {
    id: 'badge_5',
    name: '小试牛刀',
    description: '连续打卡达到 3 天',
    icon: '🔥',
    color: '#FF9500',
  },
  {
    id: 'badge_6',
    name: '坚持不懈',
    description: '连续打卡达到 7 天',
    icon: '🚀',
    color: '#FF3B30',
  },
  {
    id: 'badge_7',
    name: '习惯使然',
    description: '连续打卡达到 21 天',
    icon: '🏆',
    color: '#FFD60A',
  },
  {
    id: 'badge_8',
    name: '情绪大师',
    description: '收集满全部 7 种不同的心情',
    icon: '🎭',
    color: '#8E8E93',
  },
  {
    id: 'badge_9',
    name: '午夜守望者',
    description: '累计在深夜（00:00 - 04:00）写下 10 篇日记',
    icon: '🦉',
    color: '#5856D6',
  },
  {
    id: 'badge_10',
    name: '洋洋洒洒',
    description: '单篇日记字数超过 2000 字，且包含至少 3 张图片',
    icon: '✒️',
    color: '#FF9500',
  },
  {
    id: 'badge_11',
    name: '摄影大师',
    description: '累计发布包含 9 张图片的日记达到 5 篇',
    icon: '📸',
    color: '#32ADE6',
  },
  {
    id: 'badge_12',
    name: '风雨无阻',
    description: '在雨天（🌧️）或雪天（❄️）记录下连续 3 天的日记',
    icon: '☔️',
    color: '#5AC8FA',
  },
  {
    id: 'badge_13',
    name: '环游世界',
    description: '在至少 5 个完全不同的地点记录过日记',
    icon: '📍',
    color: '#34C759',
  },
  {
    id: 'badge_14',
    name: '完美的周末',
    description: '连续 4 个周末（六日均有）都坚持打卡记录',
    icon: '🎉',
    color: '#FF2D55',
  },
];
