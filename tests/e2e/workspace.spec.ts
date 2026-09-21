import { test, expect } from '@playwright/test';

test('guide, source, graph, theme, experiment and assessment remain linked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '输入：模型接收什么' })).toBeVisible();
  await page.getByRole('button', { name: /Embedding：索引变向量/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Embedding：索引变向量', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '完整源码', exact: true }).click();
  await expect(page.getByRole('tab', { name: '真实源码' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('[data-line="471"]')).toContainText('self.transformer.wte');
  await page.getByRole('button', { name: 'Commit Diff' }).click();
  await expect(page.locator('.diff-view')).toContainText('@@');
  await page.getByRole('tab', { name: '关系网络' }).click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await page.getByRole('button', { name: '整课网络' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(24);
  await page.getByRole('textbox', { name: '搜索关系网络' }).fill('GPT.forward');
  await expect(page.locator('.graph-dim').first()).toBeVisible();
  await page.getByRole('group', { name: '方法：GPT.forward', exact: true }).click();
  await expect(page.getByRole('tab', { name: '真实源码' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.selected-line').first()).toBeVisible();
  await page.getByRole('tab', { name: '关系网络' }).click();
  await page.getByRole('button', { name: '切换深色主题' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('tab', { name: '关系网络' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('tab', { name: '导学讲解' }).click();
  await page.getByRole('button', { name: /Embedding：索引变向量/ }).click();
  await page.getByRole('button', { name: '运行实验', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: '运行实验', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: '运行实验', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: '观察结果' })).toBeVisible();
  await expect(dialog.locator('table')).toContainText('(2, 8, 256)');
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('radio', { name: '(2, 8, 128)', exact: true }).check();
  await page
    .getByLabel('用自己的话解释这次变换')
    .fill('每个 Token 索引变成 128 维向量，批次和序列轴保持不变。');
  await page.getByRole('button', { name: '提交验收', exact: true }).click();
  await expect(page.getByText('客观题回答正确', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.sidebar-bottom')).toContainText('1 / 5');
  await page.getByRole('button', { name: 'AI 导师', exact: true }).click();
  await page.getByRole('textbox', { name: '向 Tutor 提问' }).fill('为什么输入的两个轴仍然保留？');
  await page.getByRole('button', { name: '发送问题', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tutor 尚未配置');
  expect(errors).toEqual([]);
});

test('narrow layout provides accessible drawers without horizontal page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '输入：模型接收什么' })).toBeVisible();
  await page.getByRole('button', { name: '切换学习导航' }).click();
  const navigation = page.getByRole('dialog');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('button', { name: /Logits：投影到词表/ }).click();
  await expect(navigation).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Logits：投影到词表', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '切换知识侧栏' }).click();
  await expect(page.getByRole('dialog')).toContainText('Logits · 还不是概率');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
