import { test, expect } from '@playwright/test';

test('first lesson establishes the learning problem before introducing arrays', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?step=input&view=guide');
  await expect(page.getByRole('heading', { name: '先让程序接着写一句话' })).toBeVisible();
  await expect(page.locator('.linked-source')).toHaveCount(0);
  await page.getByRole('button', { name: '我把书放进…', exact: true }).click();
  await expect(page.locator('.continuation-example')).toContainText('书包里');
  await page.screenshot({ path: 'output/playwright/lesson-problem-desktop.png' });
  await page.getByRole('button', { name: '继续：从哪里学', exact: true }).click();
  await page.getByRole('button', { name: '了', exact: true }).click();
  await expect(page.locator('.training-pair')).toContainText('今天 下雨');
  await page.getByRole('radio', { name: '把模型刚猜的内容当作标准答案', exact: true }).check();
  await expect(page.getByRole('status')).toContainText('原文中已有');
  await page.getByRole('radio', { name: '原文中实际出现的下一个片段', exact: true }).check();
  await expect(page.getByRole('status')).toContainText('原文提供监督信号');
  await page.getByRole('button', { name: '继续：为什么是编号', exact: true }).click();
  await expect(page.locator('.orientation-python')).toContainText('ids = [12, 5, 9]');
  await page.getByRole('button', { name: '继续：走到源码', exact: true }).click();
  await expect(page.locator('.linked-source')).toContainText('idx.size()');
  await page.reload();
  await expect(page.getByRole('heading', { name: '现在，才来到模型的输入' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '1想解决什么', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '先让程序接着写一句话' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/lesson-problem-mobile.png' });
});

test('diagram, source, evidence and inline experiment form one learning loop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: /Embedding.*索引变向量/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Embedding：索引变向量', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '序列 1，位置 1，ID 1', exact: true }).click();
  await expect(page.getByText('第 1 行', { exact: true })).toBeVisible();
  await expect(page.locator('.selected-line').first()).toContainText('self.transformer.wte');
  const sourceBox = await page.locator('.linked-source').boundingBox();
  expect(sourceBox!.y + sourceBox!.height).toBeLessThan(768);
  await page.screenshot({ path: 'output/playwright/v0.2-embedding-desktop.png' });
  await page.getByRole('button', { name: '查看 ID 1 对应的权重表' }).click();
  await expect(page.locator('.code-card-heading')).toContainText('L170');
  await page.getByRole('button', { name: '完整源码', exact: true }).click();
  await expect(page.getByRole('tab', { name: '真实源码' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: '选择代码第 471 行', exact: true }).click();
  await page.getByRole('tab', { name: '交互教材' }).click();
  await expect(page.locator('.code-card-heading')).toContainText('L471');
  await expect(page.getByText('第 1 行', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '打开实验', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByLabel('序列长度', { exact: true }).selectOption('16');
  await expect(page.locator('.axis-t')).toHaveText('T = 16 个位置');
  await page.getByRole('button', { name: '运行实验', exact: true }).click();
  await expect(page.getByRole('heading', { name: '观察结果' })).toBeVisible();
  await expect(page.locator('.shape-results')).toContainText('(2, 16, 256)');
  await expect(page.getByLabel('选择验收实验').locator('option')).toHaveCount(1);
  await page.getByRole('button', { name: '实测回放', exact: true }).click();
  await expect(page.locator('.evidence-label')).toContainText('实测结果回放');
  await expect(page.locator('.vector-cells')).toContainText('-0.30');
  await page.getByRole('button', { name: '序列 1，位置 2，ID 2', exact: true }).click();
  await expect(page.getByText(/此位置未采集向量/)).toBeVisible();
  await page.getByLabel('序列长度', { exact: true }).selectOption('8');
  await page.getByRole('button', { name: '运行实验', exact: true }).click();
  await expect(page.locator('.shape-results')).toContainText('(2, 8, 256)');
  const evidence = page.getByLabel('选择验收实验');
  await expect(evidence.locator('option')).toHaveCount(2);
  await evidence.selectOption({ index: 1 });
  await page.getByRole('radio', { name: '(2, 8, 128)', exact: true }).check();
  await page.getByRole('button', { name: '检查预测', exact: true }).click();
  await expect(page.getByText('客观题回答正确', { exact: true })).toBeVisible();
  await expect(page.locator('.feedback')).toContainText('未记录解释');
  await page.reload();
  await expect(page.locator('.sidebar-bottom')).toContainText('1 / 5');
  await page.getByRole('tab', { name: '关系网络' }).click();
  await page.getByRole('button', { name: '整课网络' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(24);
  await page.getByRole('textbox', { name: '搜索关系网络' }).fill('GPT.forward');
  await page.getByRole('group', { name: '方法：GPT.forward', exact: true }).click();
  await expect(page.getByRole('tab', { name: '真实源码' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Commit Diff' }).click();
  await expect(page.locator('.diff-view')).toContainText('@@');
  await page.getByRole('button', { name: '切换深色主题' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'output/playwright/v0.2-dark.png' });
  await page.getByRole('button', { name: '提问', exact: true }).click();
  await page.getByRole('textbox', { name: '向 Tutor 提问' }).fill('什么叫序列的位置？');
  await page.getByRole('button', { name: '发送问题' }).click();
  await expect(page.getByRole('alert')).toContainText('Tutor 尚未配置');
  await page.getByRole('button', { name: /下一 Token.*选择最后位置/ }).click();
  await page.getByRole('button', { name: '回顾这节课' }).click();
  await expect(page.getByRole('heading', { name: '把五步串起来' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('five diagrams support narrow drawers, keyboard interaction and legacy results', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?step=input&view=guide&intro=3');
  const token = page.getByRole('button', { name: '序列 1，位置 0，ID 0', exact: true });
  await token.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('button', { name: '序列 1，位置 1，ID 1', exact: true }),
  ).toBeFocused();
  for (const name of [
    /Embedding.*索引变向量/,
    /Block.*让上下文参与/,
    /Logits.*投影到词表/,
    /下一 Token.*选择最后位置/,
  ]) {
    await page.getByRole('button', { name: '切换学习导航' }).click();
    await page.getByRole('dialog').getByRole('button', { name }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.learning-diagram')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('button', { name: '切换知识侧栏' }).click();
  await page.screenshot({ path: 'output/playwright/v0.2-mobile.png' });
  await expect(page.getByRole('dialog')).toContainText('来源与延伸阅读');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.route('**/api/runs/legacy', async (route) => {
    await route.fulfill({
      json: {
        run: {
          id: 'legacy',
          lessonId: 'nanochat-forward',
          lessonVersion: '1.0.0',
          experimentId: 'forward-trace',
          status: 'succeeded',
          preset: 'cpu',
          sequenceLength: 8,
          result: { shapes: { logits: [2, 8, 256] } },
        },
      },
    });
  });
  await page.goto('/?step=embedding&view=guide&run=legacy');
  await expect(page.getByRole('button', { name: '实测回放' })).toBeDisabled();
  await expect(page.getByText(/这条旧记录只保存了形状/)).toBeVisible();
});

test('second lesson links real-code anchors, scoped experiments and saved predictions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByLabel('选择课程').selectOption('nanochat-data@1.0.0');
  await expect(page).toHaveURL(/lesson=nanochat-data/);
  await expect(page.locator('.data-diagram')).toBeVisible();
  await page.getByRole('button', { name: '词表 · BPE', exact: true }).click();
  await expect(page.locator('.linked-source')).toContainText('mergeable_ranks');
  await page.getByRole('button', { name: '打开实验', exact: true }).click();
  await page.getByRole('button', { name: '运行实验', exact: true }).click();
  await expect(page.getByRole('heading', { name: '观察结果' })).toBeVisible();
  await page.getByRole('button', { name: '实测回放', exact: true }).click();
  await expect(page.locator('.data-document')).toContainText('Test fixture');
  await page.goto('/?lesson=nanochat-data&version=1.0.0&step=targets');
  await page.getByRole('button', { name: '序列 1 位置 1 输入 11', exact: true }).click();
  await expect(page.locator('.data-pair')).toContainText('目标');
  await expect(page.locator('.linked-source')).toContainText('row_buffer');
  const sourceBox = await page.locator('.linked-source').boundingBox();
  expect(sourceBox!.y + sourceBox!.height).toBeLessThan(768);
  await page.screenshot({ path: 'output/playwright/v0.3-targets-desktop.png' });
  await page.getByRole('radio', { name: '[11, 23, 7]', exact: true }).check();
  await page.getByLabel('选择验收实验').selectOption({ index: 1 });
  await page.getByRole('button', { name: '检查预测', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('未记录解释');
  await page.reload();
  await expect(page.locator('.sidebar-bottom')).toContainText('1 / 3');
  await page.getByLabel('选择课程').selectOption('nanochat-forward@1.0.0');
  await expect(page.locator('.sidebar-bottom')).toContainText('/ 5');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lesson=nanochat-data&version=1.0.0&step=targets');
  const token = page.getByRole('button', { name: '序列 1 位置 1 输入 11', exact: true });
  await token.focus();
  await page.keyboard.press('Enter');
  await expect(token).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/v0.3-targets-mobile.png' });
});
