// 萌宠 IP 系统配置
export interface Mascot {
  id: string;
  name: string;
  emoji: string;
  color: string;
  personalities: Personality[];
  expressions: Expression[];
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  triggerEvents: string[];
  responses: string[];
}

export interface Expression {
  id: string;
  name: string;
  emoji: string;
  color: string;
  animation: 'bounce' | 'shake' | 'pulse' | 'spin';
}

// 毛球 IP 家族
export const MAOQIU_MASCOTS: Mascot[] = [
  {
    id: 'maoqiu-pink',
    name: '粉粉球',
    emoji: '🐱',
    color: '#FF85A2',
    personalities: [
      {
        id: 'cheer',
        name: '鼓励小能手',
        description: '在你完成记录时为你加油',
        triggerEvents: ['createDiary', 'completeTask'],
        responses: [
          '太棒了！又完成了一次记录～✨',
          '哇！你的生活真精彩！🎉',
          '继续加油哦～我会一直陪着你！💕',
        ],
      },
      {
        id: 'comfort',
        name: '暖心陪伴',
        description: '在你情绪低落时给予安慰',
        triggerEvents: ['sadMood', 'angryMood'],
        responses: [
          '抱抱～一切都会好起来的 🤗',
          '没关系，我陪着你呢～',
          '要开心一点哦！给你一个小花花 🌸',
        ],
      },
    ],
    expressions: [
      { id: 'happy', name: '开心', emoji: '😊', color: '#FF85A2', animation: 'bounce' },
      { id: 'excited', name: '兴奋', emoji: '🤩', color: '#FF6B9D', animation: 'shake' },
      { id: 'calm', name: '平静', emoji: '😌', color: '#FFB6C1', animation: 'pulse' },
      { id: 'caring', name: '关心', emoji: '🥺', color: '#FF9EB5', animation: 'pulse' },
    ],
  },
  {
    id: 'maoqiu-blue',
    name: '蓝蓝球',
    emoji: '🐶',
    color: '#5AC8FA',
    personalities: [
      {
        id: 'reminder',
        name: '贴心提醒',
        description: '提醒你记录重要时刻',
        triggerEvents: ['longTimeNoRecord', 'specialDate'],
        responses: [
          '好久没见你记录啦，有什么新鲜事吗？🤔',
          '今天是特别的日子哦，要不要记下来？📝',
          '记得多记录生活的美好瞬间～',
        ],
      },
    ],
    expressions: [
      { id: 'happy', name: '开心', emoji: '😄', color: '#5AC8FA', animation: 'bounce' },
      { id: 'thinking', name: '思考', emoji: '🤔', color: '#64D2FF', animation: 'pulse' },
      { id: 'surprised', name: '惊讶', emoji: '😲', color: '#5AC8FA', animation: 'shake' },
    ],
  },
  {
    id: 'maoqiu-yellow',
    name: '黄黄球',
    emoji: '🐰',
    color: '#FFD60A',
    personalities: [
      {
        id: 'celebrate',
        name: '庆祝专家',
        description: '为你的成就欢呼',
        triggerEvents: ['milestone', 'streak'],
        responses: [
          '哇！连续记录{{days}}天啦！太厉害了！🎊',
          '你已经记录了{{count}}篇日记！给你点赞！👍',
          '恭喜达成新成就！🏆',
        ],
      },
    ],
    expressions: [
      { id: 'happy', name: '开心', emoji: '🥳', color: '#FFD60A', animation: 'bounce' },
      { id: 'proud', name: '骄傲', emoji: '😎', color: '#FFE54A', animation: 'spin' },
      { id: 'loving', name: '喜爱', emoji: '😍', color: '#FFD60A', animation: 'pulse' },
    ],
  },
];

// 默认萌宠
export const DEFAULT_MASCOT = MAOQIU_MASCOTS[0];

// 萌宠动画配置
export const MASCOT_ANIMATIONS = {
  bounce: {
    type: 'bounce' as const,
    duration: 600,
    easing: 'ease-in-out',
  },
  shake: {
    type: 'shake' as const,
    duration: 400,
    easing: 'ease-in-out',
  },
  pulse: {
    type: 'pulse' as const,
    duration: 800,
    easing: 'ease-in-out',
  },
  spin: {
    type: 'spin' as const,
    duration: 1000,
    easing: 'ease-in-out',
  },
};

// 萌宠互动场景
export const MASCOT_INTERACTIONS = {
  morning: {
    timeRange: [6, 12] as [number, number],
    messages: [
      '早上好呀！今天也要开心哦～☀️',
      '新的一天开始啦！元气满满！💪',
      '早安！今天会发生什么有趣的事呢？🌈',
    ],
  },
  afternoon: {
    timeRange: [12, 18] as [number, number],
    messages: [
      '下午好～记得休息一会儿哦☕️',
      '忙碌之余也要照顾好自己～💕',
      '下午时光，记录一下美好瞬间吧～📝',
    ],
  },
  evening: {
    timeRange: [18, 22] as [number, number],
    messages: [
      '晚上好！今天过得怎么样？🌙',
      '该放松一下啦～要不要写篇日记？✨',
      '夜晚是回忆美好的时刻～💫',
    ],
  },
  night: {
    timeRange: [22, 6] as [number, number],
    messages: [
      '夜深啦，早点休息哦～🌙',
      '晚安，做个好梦！💤',
      '今天辛苦了，明天见～🌟',
    ],
  },
};
