// 场景化模板系统
import { ScenarioTemplate, ScenarioType } from '../types';

export const SCENARIO_TEMPLATES: Record<ScenarioType, ScenarioTemplate> = {
  daily: {
    id: 'daily',
    type: 'daily',
    name: '日常记录',
    icon: '📝',
    color: '#FF85A2',
    placeholder: '今天发生了什么？',
  },
  travel: {
    id: 'travel',
    type: 'travel',
    name: '旅行记录',
    icon: '✈️',
    color: '#5AC8FA',
    placeholder: '这次旅行去了哪里？',
  },
  movie: {
    id: 'movie',
    type: 'movie',
    name: '观影记录',
    icon: '🎬',
    color: '#FF6B9D',
    placeholder: '看了什么电影？感受如何？',
  },
  outing: {
    id: 'outing',
    type: 'outing',
    name: '出行记录',
    icon: '🌳',
    color: '#34C759',
    placeholder: '今天去了哪里玩？',
  },
  food: {
    id: 'food',
    type: 'food',
    name: '美食记录',
    icon: '🍔',
    color: '#FF9500',
    placeholder: '今天吃了什么好吃的？',
  },
  special: {
    id: 'special',
    type: 'special',
    name: '特别时刻',
    icon: '🎉',
    color: '#AF52DE',
    placeholder: '记录这个特别的时刻',
  },
  learning: {
    id: 'learning',
    type: 'learning',
    name: '学习成长',
    icon: '📚',
    color: '#5E5CE6',
    placeholder: '今天学到了什么新知识？',
  },
  inspiration: {
    id: 'inspiration',
    type: 'inspiration',
    name: '灵感闪念',
    icon: '💡',
    color: '#FFCC00',
    placeholder: '捕捉转瞬即逝的想法...',
  },
  pet: {
    id: 'pet',
    type: 'pet',
    name: '宠物日常',
    icon: '🐾',
    color: '#FF9F0A',
    placeholder: '今天毛孩子做了什么趣事？',
  },
  work: {
    id: 'work',
    type: 'work',
    name: '工作记录',
    icon: '💼',
    color: '#007AFF',
    placeholder: '今天工作有什么进展？',
  },
  fitness: {
    id: 'fitness',
    type: 'fitness',
    name: '运动健身',
    icon: '🏃‍♂️',
    color: '#32ADE6',
    placeholder: '今天锻炼了多久？',
  },
};

// 获取场景模板
export const getScenarioTemplate = (type: ScenarioType): ScenarioTemplate => {
  return SCENARIO_TEMPLATES[type];
};

// 获取所有场景类型
export const getAllScenarios = (): ScenarioType[] => {
  return Object.keys(SCENARIO_TEMPLATES) as ScenarioType[];
};

// 获取场景颜色
export const getScenarioColor = (type: ScenarioType): string => {
  return SCENARIO_TEMPLATES[type].color;
};

// 获取场景图标
export const getScenarioIcon = (type: ScenarioType): string => {
  return SCENARIO_TEMPLATES[type].icon;
};
