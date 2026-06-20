const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const usersCollection = db.collection('users');
const adminCollection = db.collection('admin_list');
const pageViewsCollection = db.collection('monitor_page_views');
const errorLogsCollection = db.collection('monitor_error_logs');
const USER_ERROR_CODES = {
  USER_FROZEN: 'USER_FROZEN',
};

const getDocData = (result) =>
  result && result.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;

const getUserById = async (userId) => {
  if (!userId) {
    return null;
  }

  const result = await usersCollection.doc(userId).get();
  return getDocData(result);
};

const getOperatorUserId = (payload = {}) => {
  const candidateKeys = ['__operatorUserId', 'adminUserId', 'userId', 'currentUserId', '_id'];
  for (const key of candidateKeys) {
    if (payload && typeof payload[key] === 'string' && payload[key]) {
      return payload[key];
    }
  }

  return '';
};

const ensureOperatorNotFrozen = async (payload = {}) => {
  const operatorUserId = getOperatorUserId(payload);
  if (!operatorUserId) {
    return null;
  }

  const operatorUser = await getUserById(operatorUserId);
  if (operatorUser && operatorUser.accountStatus === 'frozen') {
    return {
      code: -1,
      message: '该账号已被冻结，请联系管理员',
      errorCode: USER_ERROR_CODES.USER_FROZEN,
    };
  }

  return null;
};

const isAdminUser = async (userId) => {
  const user = await getUserById(userId);
  if (!user || !user.phone) {
    return false;
  }

  const adminResult = await adminCollection.where({ phone: user.phone }).limit(1).get();
  return !!(adminResult.data && adminResult.data.length > 0);
};

const buildUserSnapshot = (userSnapshot, userId) => ({
  _id: userSnapshot && userSnapshot._id ? userSnapshot._id : userId || '',
  nickname: userSnapshot && userSnapshot.nickname ? userSnapshot.nickname : '',
  phone: userSnapshot && userSnapshot.phone ? userSnapshot.phone : '',
  avatar: userSnapshot && userSnapshot.avatar ? userSnapshot.avatar : '',
});

const buildDayKey = (timestamp) => {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const buildDayLabel = (dayKey) => dayKey.slice(5);

const createDayBuckets = (days) => {
  const buckets = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const currentDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const dayKey = buildDayKey(currentDate.getTime());
    buckets.push({
      date: dayKey,
      label: buildDayLabel(dayKey),
      pv: 0,
      uv: 0,
      viewers: new Set(),
      count: 0,
    });
  }

  return buckets;
};

const fetchCollectionDocs = async (collection, filter, options = {}) => {
  const { orderByField = 'createdAtMs', orderDirection = 'desc', limit = 1000 } = options;
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;
  const allDocs = [];

  while (hasMore && allDocs.length < limit) {
    const result = await collection.where(filter).orderBy(orderByField, orderDirection).skip(offset).limit(batchSize).get();
    const batch = result.data || [];
    allDocs.push(...batch);
    offset += batch.length;
    hasMore = batch.length === batchSize && allDocs.length < limit;
  }

  return allDocs.slice(0, limit);
};

const trackPageView = async (data = {}) => {
  try {
    const now = Date.now();
    const pageName = data.pageName || 'Unknown';
    const userId = data.userId || '';
    const sessionId = data.sessionId || '';

    await pageViewsCollection.add({
      pageName,
      routeKey: data.routeKey || '',
      sessionId,
      userId,
      viewerKey: userId ? `user:${userId}` : `session:${sessionId || 'anonymous'}`,
      userSnapshot: buildUserSnapshot(data.userSnapshot, userId),
      deviceInfo: data.deviceInfo || {},
      createdAt: db.serverDate(),
      createdAtMs: now,
      dayKey: buildDayKey(now),
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('trackPageView error:', error);
    return {
      success: false,
      message: '页面访问上报失败',
      error: error.message,
    };
  }
};

const reportError = async (data = {}) => {
  try {
    const now = Date.now();
    const userId = data.userId || '';

    await errorLogsCollection.add({
      pageName: data.pageName || 'Unknown',
      routeKey: data.routeKey || '',
      sessionId: data.sessionId || '',
      source: data.source || 'manual',
      isFatal: !!data.isFatal,
      userId,
      userSnapshot: buildUserSnapshot(data.userSnapshot, userId),
      errorName: data.errorName || 'Error',
      errorMessage: data.errorMessage || 'Unknown error',
      stack: data.stack || '',
      extraData: data.extraData || {},
      deviceInfo: data.deviceInfo || {},
      createdAt: db.serverDate(),
      createdAtMs: now,
      dayKey: buildDayKey(now),
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('reportError error:', error);
    return {
      success: false,
      message: '错误日志上报失败',
      error: error.message,
    };
  }
};

const buildDashboard = async (data = {}) => {
  try {
    const adminUserId = data.adminUserId;
    const days = Math.min(Math.max(Number(data.days) || 7, 1), 30);

    if (!adminUserId) {
      return { success: false, message: '缺少管理员信息' };
    }

    const admin = await isAdminUser(adminUserId);
    if (!admin) {
      return { success: false, message: '无权限查看监控大盘' };
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));
    const startMs = startDate.getTime();

    const [pageViews, recentErrors] = await Promise.all([
      fetchCollectionDocs(pageViewsCollection, { createdAtMs: _.gte(startMs) }, { limit: 5000 }),
      fetchCollectionDocs(errorLogsCollection, { createdAtMs: _.gte(startMs) }, { limit: 200 }),
    ]);

    const pageTrendBuckets = createDayBuckets(days);
    const errorTrendBuckets = createDayBuckets(days);
    const pageMap = new Map();
    const allViewerKeys = new Set();

    pageViews.forEach((item) => {
      const pageName = item.pageName || 'Unknown';
      const viewerKey = item.viewerKey || item.userId || item.sessionId || item._id;
      const dayKey = item.dayKey || buildDayKey(item.createdAtMs || Date.now());

      allViewerKeys.add(viewerKey);

      if (!pageMap.has(pageName)) {
        pageMap.set(pageName, {
          pageName,
          totalPv: 0,
          viewerKeys: new Set(),
          trend: createDayBuckets(days),
        });
      }

      const stat = pageMap.get(pageName);
      stat.totalPv += 1;
      stat.viewerKeys.add(viewerKey);

      const statTrend = stat.trend.find((bucket) => bucket.date === dayKey);
      if (statTrend) {
        statTrend.pv += 1;
        statTrend.viewers.add(viewerKey);
      }

      const totalTrend = pageTrendBuckets.find((bucket) => bucket.date === dayKey);
      if (totalTrend) {
        totalTrend.pv += 1;
        totalTrend.viewers.add(viewerKey);
      }
    });

    recentErrors.forEach((item) => {
      const dayKey = item.dayKey || buildDayKey(item.createdAtMs || Date.now());
      const bucket = errorTrendBuckets.find((trendItem) => trendItem.date === dayKey);
      if (bucket) {
        bucket.count += 1;
      }
    });

    const pageStats = Array.from(pageMap.values())
      .map((item) => ({
        pageName: item.pageName,
        totalPv: item.totalPv,
        totalUv: item.viewerKeys.size,
        trend: item.trend.map((trendItem) => ({
          date: trendItem.date,
          label: trendItem.label,
          pv: trendItem.pv,
          uv: trendItem.viewers.size,
        })),
      }))
      .sort((prev, next) => next.totalPv - prev.totalPv);

    const formattedPageTrend = pageTrendBuckets.map((item) => ({
      date: item.date,
      label: item.label,
      pv: item.pv,
      uv: item.viewers.size,
    }));

    const formattedErrorTrend = errorTrendBuckets.map((item) => ({
      date: item.date,
      label: item.label,
      count: item.count,
    }));

    return {
      success: true,
      data: {
        overview: {
          totalPv: pageViews.length,
          totalUv: allViewerKeys.size,
          totalErrors: recentErrors.length,
          pageCount: pageStats.length,
        },
        pageTrend: formattedPageTrend,
        pageStats,
        errorTrend: formattedErrorTrend,
        recentErrors: recentErrors.map((item) => ({
          _id: item._id,
          pageName: item.pageName || 'Unknown',
          source: item.source || 'manual',
          errorName: item.errorName || 'Error',
          errorMessage: item.errorMessage || 'Unknown error',
          stack: item.stack || '',
          createdAt: item.createdAtMs || item.createdAt || '',
          isFatal: !!item.isFatal,
          userId: item.userId || '',
          userSnapshot: item.userSnapshot || {},
          deviceInfo: item.deviceInfo || {},
        })),
      },
    };
  } catch (error) {
    console.error('buildDashboard error:', error);
    return {
      success: false,
      message: '获取监控大盘失败',
      error: error.message,
    };
  }
};

exports.main = async (event) => {
  const { action, data } = event;

  const frozenGuard = await ensureOperatorNotFrozen(data || {});
  if (frozenGuard) {
    return frozenGuard;
  }

  switch (action) {
    case 'trackPageView':
      return await trackPageView(data);
    case 'reportError':
      return await reportError(data);
    case 'dashboard':
      return await buildDashboard(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
