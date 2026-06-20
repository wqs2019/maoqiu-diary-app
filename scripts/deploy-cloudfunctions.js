#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const cloudFunctionsRoot = path.join(projectRoot, 'cloudfunctions');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const print = (message = '') => {
  process.stdout.write(`${message}\n`);
};

const formatDuration = (durationMs) => {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    functions: [],
    autoConfirm: true,
    concurrency: 10,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--functions=')) {
      options.functions = arg
        .slice('--functions='.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return;
    }

    if (arg === '--interactive') {
      options.autoConfirm = false;
      return;
    }

    if (arg.startsWith('--concurrency=')) {
      const parsedConcurrency = Number.parseInt(arg.slice('--concurrency='.length), 10);
      if (!Number.isNaN(parsedConcurrency) && parsedConcurrency > 0) {
        options.concurrency = parsedConcurrency;
      }
      return;
    }

    if (!arg.startsWith('--')) {
      options.functions.push(arg.trim());
    }
  });

  options.functions = [...new Set(options.functions.filter(Boolean))];
  options.concurrency = Math.max(1, options.concurrency);
  return options;
};

const pipeStreamWithPrefix = (stream, prefix, writer) => {
  let pending = '';

  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';

    lines.forEach((line) => {
      writer(`${prefix}${line}\n`);
    });
  });

  stream.on('end', () => {
    if (pending) {
      writer(`${prefix}${pending}\n`);
    }
  });
};

const runCommand = (command, args, cwd, autoConfirm = true, functionName = 'unknown') =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    const prefix = `[${functionName}] `;
    pipeStreamWithPrefix(child.stdout, prefix, (message) => process.stdout.write(message));
    pipeStreamWithPrefix(child.stderr, prefix, (message) => process.stderr.write(message));

    if (autoConfirm) {
      child.stdin.write('\n'.repeat(20));
    }
    child.stdin.end();

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ status: code ?? 1 });
    });
  });

const ensureTcbInstalled = () => {
  const result = spawnSync('tcb', ['--version'], {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    print(`${RED}❌ 未检测到 CloudBase CLI（tcb）${RESET}`);
    print('请先安装：`npm install -g @cloudbase/cli`');
    process.exit(1);
  }
};

const ensureTcbLoggedIn = () => {
  const result = spawnSync('tcb', ['status'], {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    print(`${YELLOW}⚠️  当前未登录 CloudBase CLI${RESET}`);
    print('请先执行：`tcb login`');
    process.exit(1);
  }
};

const discoverFunctions = () => {
  if (!fs.existsSync(cloudFunctionsRoot)) {
    throw new Error('未找到 cloudfunctions 目录');
  }

  return fs
    .readdirSync(cloudFunctionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const functionDir = path.join(cloudFunctionsRoot, name);
      return fs.existsSync(path.join(functionDir, 'index.js'));
    })
    .sort();
};

const resolveFunctionsToDeploy = (requestedFunctions, discoveredFunctions) => {
  if (!requestedFunctions.length) {
    return discoveredFunctions;
  }

  const discoveredSet = new Set(discoveredFunctions);
  const invalidFunctions = requestedFunctions.filter((name) => !discoveredSet.has(name));

  if (invalidFunctions.length > 0) {
    print(`${RED}❌ 以下云函数目录不存在：${invalidFunctions.join(', ')}${RESET}`);
    process.exit(1);
  }

  return requestedFunctions;
};

const deployFunctionsInParallel = async (functionsToDeploy, options) => {
  const successList = [];
  const failedList = [];
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < functionsToDeploy.length) {
      const functionName = functionsToDeploy[currentIndex];
      currentIndex += 1;

      const startedAt = Date.now();
      print(`${CYAN}📦 部署 ${functionName}${RESET}`);
      const result = await runCommand(
        'tcb',
        ['fn', 'deploy', functionName, '--force', '--yes'],
        cloudFunctionsRoot,
        options.autoConfirm,
        functionName,
      );
      const duration = formatDuration(Date.now() - startedAt);

      if (result.status === 0) {
        successList.push(functionName);
        print(`${GREEN}✅ ${functionName} 部署成功（耗时 ${duration}）${RESET}`);
      } else {
        failedList.push(functionName);
        print(`${RED}❌ ${functionName} 部署失败（耗时 ${duration}）${RESET}`);
      }

      print('');
    }
  };

  const workerCount = Math.min(options.concurrency, functionsToDeploy.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { successList, failedList };
};

const main = async () => {
  const options = parseArgs();
  const totalStartedAt = Date.now();

  print(`${CYAN}🚀 开始批量部署云函数...${RESET}`);
  ensureTcbInstalled();
  ensureTcbLoggedIn();

  const discoveredFunctions = discoverFunctions();
  const functionsToDeploy = resolveFunctionsToDeploy(options.functions, discoveredFunctions);

  if (functionsToDeploy.length === 0) {
    print(`${YELLOW}⚠️  没有发现可部署的云函数${RESET}`);
    process.exit(0);
  }

  if (!options.autoConfirm && options.concurrency > 1) {
    print(`${YELLOW}⚠️  手动交互模式不支持并行，已自动切换为串行部署${RESET}`);
    options.concurrency = 1;
  }

  print(`将部署 ${functionsToDeploy.length} 个云函数：${functionsToDeploy.join(', ')}`);
  print(options.autoConfirm ? '交互确认：已开启自动回车，默认选择第一个选项' : '交互确认：手动模式');
  print(`部署模式：${options.concurrency > 1 ? `并行部署（并发 ${options.concurrency}）` : '串行部署'}`);
  print('');

  const { successList, failedList } = await deployFunctionsInParallel(functionsToDeploy, options);

  print(`${CYAN}部署结果汇总${RESET}`);
  print(`${GREEN}成功：${successList.length}${RESET}${successList.length ? ` -> ${successList.join(', ')}` : ''}`);
  print(`${RED}失败：${failedList.length}${RESET}${failedList.length ? ` -> ${failedList.join(', ')}` : ''}`);
  print(`总耗时：${formatDuration(Date.now() - totalStartedAt)}`);

  if (failedList.length > 0) {
    process.exit(1);
  }

  print('');
  print(`${GREEN}🎉 全部云函数部署完成${RESET}`);
};

main().catch((error) => {
  print(`${RED}❌ 批量部署失败：${error.message || error}${RESET}`);
  process.exit(1);
});
