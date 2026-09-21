# LLM-Zero-To-One

## 基于真实源码的 LLM 从 0 到 1 交互式学习平台

**项目代号：** LLM-Zero-To-One  
**项目定位：** 开源学习平台 / LLM 源码导读系统 / AI Tutor 教学系统  
**核心方向：** Large Language Model Training From Scratch  
**目标用户：** 有基础编程能力、但不知道如何系统进入 LLM 模型训练领域的学习者  
**产品形态：** Web + GitHub + Obsidian Knowledge Base + AI Tutor  
**项目阶段：** 0→1 设计阶段  
**开源策略：** 从第一版开始开源  
**核心原则：** 源码为事实底座，资料为知识补充，AI 为教学助手，不让 AI 成为唯一事实来源

---

# 1. 产品背景

近年来 AI 编码工具已经能够生成大量代码。

但是对于想学习大模型的人来说，一个新的问题越来越明显：

> “代码可以让 AI 写出来，但我并没有真正理解这些代码。”

传统的大模型学习路径通常是：

```text
数学
↓
机器学习
↓
深度学习
↓
Transformer
↓
论文
↓
PyTorch
↓
阅读大型项目源码
```

对于有编程能力但没有 LLM 训练经验的人来说，这条路线成本很高。

另一个常见问题是：

```text
GitHub 项目
    ↓
几百～几千行代码
    ↓
不知道从哪一行开始
    ↓
看不懂变量
    ↓
看不懂 Tensor Shape
    ↓
不知道为什么这样设计
    ↓
放弃
```

与此同时，如果直接让 AI：

> “帮我写一个 GPT，并逐步解释。”

又存在另一种风险：

```text
AI 自己重新设计代码
        ↓
某处出现错误
        ↓
学习者不知道
        ↓
错误解释继续向下传递
        ↓
最终进入错误理解
```

因此，本项目要解决的不是单纯的“知识不够”，而是：

> **如何让初学者在真实、可信、可运行的源码基础上，借助 AI 逐步理解 LLM。**

---

# 2. 产品愿景

## 2.1 一句话定位

> **Learn Large Language Models by Reading, Running, and Understanding Real Code.**

中文：

> **从真实开源代码出发，读懂、运行并理解大语言模型。**

---

## 2.2 核心愿景

建立一个开源的 LLM 源码学习系统，让一个“会写代码但不懂大模型”的人，可以：

```text
进入平台
↓
选择学习路线
↓
从真实项目第一步开始
↓
看到当前 Git Commit
↓
看到本次新增代码
↓
逐行理解
↓
查看背后的知识
↓
阅读权威资料
↓
运行实验
↓
回答问题
↓
继续下一个 Commit
↓
最终理解一个完整 LLM
```

最终不是让用户：

> “知道 Transformer 是什么。”

而是让用户能够：

> **打开真实 LLM 项目源码，知道代码为什么这么写。**

---

# 3. 产品核心理念

## 3.1 不重新发明已有优秀项目

平台不以“自己写一个 GPT”作为核心价值。

而是优先选择优秀开源项目作为蓝本：

```text
真实优秀源码
+
真实 Git 历史
+
官方论文
+
官方文档
+
优秀课程
+
实验
```

我们的工作重点是：

> **组织、关联、解释和教学。**

---

## 3.2 AI 不是真理来源

这是整个产品最重要的设计原则。

知识可信度按照：

```text
一级：源码 / Git Commit
二级：官方文档
三级：原始论文 / 官方课程
四级：高质量公开资料
五级：AI 解释
```

AI 生成的内容必须明确标记：

```text
[Source]
[Official]
[Paper]
[Explanation]
[Inference]
```

不允许让 AI 把自己的解释伪装成源码事实。

---

## 3.3 不让 AI 一次性写完整项目

AI Tutor 必须遵循：

```text
当前 Commit
↓
当前文件
↓
当前函数
↓
当前代码片段
↓
当前知识点
```

只在当前学习上下文内工作。

禁止直接：

```text
生成完整 Transformer
生成完整 GPT
重构教材源码
使用高层 API 隐藏底层实现
```

除非学习者已经完成对应学习阶段。

---

# 4. 目标用户

## 4.1 核心用户

具备：

```text
Python 基础
基本编程经验
知道什么是 AI
可能使用过 ChatGPT / Copilot / Codex
```

但不了解：

```text
Tensor
Backpropagation
Attention
Transformer
Tokenizer
Training Loop
Distributed Training
```

他们最大的困难不是“不会编程”，而是：

> **不知道怎么从代码进入大模型。**

---

## 4.2 次级用户

已经了解 Transformer，但希望：

```text
深入源码
理解训练过程
理解 GPU
理解分布式训练
理解数据工程
研究现代 LLM
```

---

# 5. 用户最终应该获得什么能力

学习完成后，用户至少能够回答：

### 模型层

```text
Token 是什么？
Embedding 是什么？
Attention 为什么存在？
Q/K/V 是什么？
Transformer Block 怎么工作？
GPT 为什么可以生成下一个 Token？
```

### 训练层

```text
Loss 是什么？
Cross Entropy 为什么适合语言模型？
Backpropagation 在做什么？
AdamW 在做什么？
Learning Rate 为什么重要？
Gradient Accumulation 是什么？
Mixed Precision 为什么能提高训练效率？
```

### 数据层

```text
文本怎样变成 Token？
训练数据怎么构造？
为什么需要去重？
为什么数据质量重要？
```

### 工程层

```text
模型为什么放不进一张 GPU？
DDP 是什么？
FSDP 是什么？
为什么需要分布式训练？
```

### 源码层

用户能够独立进入一个 LLM 项目：

```text
git log
↓
找到训练主入口
↓
找到模型定义
↓
找到数据加载
↓
找到 Loss
↓
找到 Optimizer
↓
找到 Training Loop
```

并逐步理解这些代码。

---

# 6. 学习路线设计

平台不是只有一个项目，而是：

> **主蓝本 + 交叉蓝本 + 进阶蓝本。**

---

## 6.1 原理路线

### micrograd

目标：

```text
计算图
Gradient
Backpropagation
Autograd
```

学习问题：

> 神经网络到底是怎么学会的？

---

## 6.2 GPT 最小路线

### microgpt

目标：

```text
Tokenizer
Embedding
Attention
MLP
Transformer
Training
Inference
```

特点：

> 极小代码量，让初学者第一次完整看到“一个 GPT 是怎么组成的”。

---

## 6.3 Transformer 源码路线

### minGPT

目标：

```text
完整 Transformer
GPT Model
Forward
Sampling
```

学习问题：

> Transformer 的代码结构到底是什么样？

---

## 6.4 核心源码路线

### build-nanogpt

作为平台第一核心主线。

核心方式：

```text
Git Commit 01
↓
Git Commit 02
↓
Git Commit 03
↓
……
↓
完整 GPT
```

学习者沿真实 Commit 演进学习。

重点：

```text
模型
数据
训练
优化
性能
分布式
```

---

## 6.5 系统路线

### llm.c

目标：

```text
C
CUDA
GPU
Kernel
Memory
Performance
Training System
```

学习问题：

> 大模型真正跑在 GPU 上的时候到底发生了什么？

---

## 6.6 现代完整 LLM 路线

### nanochat

目标：

```text
Training
Evaluation
Chat
Inference
完整 LLM 产品
```

学习问题：

> 一个真正可用的小型语言模型是怎么从训练走到聊天系统的？

---

## 6.7 系统理论路线

### Stanford CS336

作为贯穿全站的理论/作业验证路线。

覆盖：

```text
Tokenizer
Transformer
GPU
Kernels
Parallel Training
Data
Scaling
Evaluation
Post-training
```

不是独立替代源码路线，而是：

```text
源码
↕
CS336
```

---

## 6.8 工程补充路线

根据内容逐步加入：

```text
LitGPT
llm-from-scratch
Hugging Face Course
PyTorch 官方文档
Transformer 原论文
```

---

# 7. 学习路径结构

用户不应该看到一堆仓库。

首页首先看到：

```text
你现在在哪里？
```

然后给出：

### 路线 A：零基础进入

```text
micrograd
↓
microgpt
↓
minGPT
```

### 路线 B：会 Python，想直接学 GPT

```text
microgpt
↓
build-nanogpt
```

### 路线 C：已经了解 Transformer

```text
build-nanogpt
↓
CS336
↓
llm.c
```

### 路线 D：想深入训练系统

```text
build-nanogpt
↓
llm.c
↓
Distributed
↓
Scaling
↓
Data
```

---

# 8. 核心产品体验

整个产品最重要的是学习页面。

建议采用：

```text
┌────────────┬──────────────────────────┬─────────────────────┐
│            │                          │                     │
│ 学习路线    │       当前源码            │      学习助手         │
│            │                          │                     │
│ Commit 01  │  110 xxxxx               │ 这行代码做什么？      │
│ Commit 02  │  111 xxxxx               │                     │
│ Commit 03  │  112 xxxxx   ← 当前       │ 输入 / 输出          │
│ Commit 04  │  113 xxxxx               │                     │
│            │                          │ 原理                 │
│            │                          │                     │
│            │                          │ Tensor Shape         │
│            │                          │                     │
│            │                          │ 相关资料             │
│            │                          │                     │
└────────────┴──────────────────────────┴─────────────────────┘
```

---

# 9. 逐行代码教学

点击一行代码：

```python
x = self.c_fc(x)
```

右侧出现：

## 这行代码做什么？

用线性层把 hidden dimension 扩大。

## 输入

```text
(B, T, C)
```

## 输出

```text
(B, T, 4C)
```

## 数学意义

```text
Y = XW + b
```

## 为什么这样做？

解释 Transformer MLP 中间层的作用。

## 相关概念

```text
Linear
Matrix Multiplication
MLP
Transformer Block
```

## 相关源码

```text
minGPT
build-nanogpt
其他实现
```

## 相关资料

```text
论文
官方文档
课程
视频
高质量文章
```

## 实验

```text
修改 hidden dimension
重新运行
观察输出
```

---

# 10. 代码解释的最小单位

解释不能只做到“逐行”。

应该建立：

```text
代码文件
↓
函数
↓
代码块
↓
代码行
↓
Token / 变量
↓
Tensor
↓
Shape
↓
数学运算
```

例如：

```text
self.c_fc
↓
nn.Linear
↓
Weight
↓
Matrix Multiplication
↓
MLP
↓
Transformer
```

最终形成知识关联网络。

---

# 11. Knowledge Graph

每个知识点都是一个独立节点。

例如：

```text
Attention
│
├── microgpt
├── minGPT
├── build-nanogpt
├── llm.c
├── CS336
├── Transformer Paper
├── PyTorch
└── 实验
```

每一个知识点包含：

```text
定义
直觉
数学
代码
源码位置
论文
官方文档
实验
常见误解
前置知识
后继知识
```

---

# 12. Source Registry

所有外部资料进入统一资料库。

数据结构：

```yaml
title:
author:
url:
type:
source_type:
license:
trust_level:
relevance:
related_topics:
related_code:
last_verified:
```

类型：

```text
official
paper
course
documentation
github
video
article
book
```

资料不是简单链接列表。

而是：

```text
资料
↓
对应知识点
↓
对应代码
↓
对应 Commit
```

例如：

```text
Attention
    ↓
build-nanogpt line 120-140
    ↓
Attention Is All You Need
    ↓
CS336 Attention Lecture
    ↓
PyTorch SDPA
```

---

# 13. AI Tutor

AI Tutor 是产品核心功能之一。

## 13.1 AI 的角色

AI 不是：

```text
代码生成器
```

而是：

```text
源码导读老师
实验指导老师
概念解释老师
学习路径协调员
```

---

# 14. AI Tutor 教学协议

每次开始教学时：

### Step 1

告诉学生：

```text
当前项目
当前 Commit
当前文件
当前学习目标
```

### Step 2

展示当前 Diff。

### Step 3

只讲新增内容。

### Step 4

逐行解释：

```text
语法
变量
数据结构
Tensor Shape
数学
设计原因
```

### Step 5

关联知识库。

### Step 6

提供资料。

### Step 7

运行实验。

### Step 8

让学习者回答问题。

### Step 9

验证。

### Step 10

才允许进入下一个 Commit。

---

# 15. AI 禁止事项

禁止：

```text
一次生成完整项目
隐藏核心实现
无依据发明架构
随意重构教材源码
用高级 API 替代核心代码
把自己的推断说成源码事实
```

如果 AI 不确定：

```text
明确说“不确定”
```

如果源码与现代实现不同：

```text
先解释源码
再解释现代实现
```

而不是直接替换。

---

# 16. 学习闭环

每个 Lesson 必须包含：

```text
① 目标
② 源码
③ Diff
④ 逐行解释
⑤ 知识点
⑥ 数学
⑦ 资料
⑧ 实验
⑨ 问题
⑩ 验收
```

---

# 17. 实验系统

学习不能停留在阅读。

每个重要概念设计实验。

例如：

## Attention 实验

```text
关闭 causal mask
↓
观察结果
```

## Loss 实验

```text
修改 learning rate
↓
观察 loss curve
```

## Batch 实验

```text
batch=1
vs
batch=32
```

## Model Size 实验

```text
10M
vs
50M
```

实验结果自动保存到：

```text
experiments/
```

---

# 18. 验收机制

用户不能仅通过“看完页面”标记完成。

需要：

```text
理解题
↓
代码题
↓
运行题
↓
解释题
```

例如：

> 为什么 Attention 不能看到未来 Token？

用户回答后 AI 判断：

```text
理解
部分理解
需要重新学习
```

---

# 19. Obsidian 的定位

Obsidian 不是废弃的个人笔记工具。

它是：

> **内容生产后台 / 知识库后台。**

推荐结构：

```text
obsidian/
│
├── 00_入口/
├── 01_学习路线/
├── 02_源码蓝本/
├── 03_知识/
├── 04_课程/
├── 05_论文/
├── 06_资料/
├── 07_实验/
├── 08_验收/
├── 09_AI_Tutor/
└── 99_模板/
```

---

# 20. Obsidian → Web 数据流

```text
Obsidian
    ↓
Markdown
    ↓
Structured Metadata
    ↓
Git
    ↓
Web Build
    ↓
学习平台
```

不允许 Web 成为唯一内容源。

所有重要内容尽量保持：

```text
Markdown
JSON
YAML
```

从而保证：

```text
可阅读
可版本控制
可迁移
可开源
可被 AI 使用
```

---

# 21. 推荐数据模型

核心实体：

```text
LearningPath
Lesson
Commit
File
CodeBlock
CodeLine
Knowledge
Source
Experiment
Assessment
TutorPrompt
```

关系：

```text
LearningPath
    ↓
Lesson
    ↓
Commit
    ↓
File
    ↓
CodeBlock
    ↓
Knowledge
    ↓
Source
    ↓
Experiment
    ↓
Assessment
```

---

# 22. Lesson 数据示例

```yaml
id: build-nanogpt-0012

path: build-nanogpt

commit: abc123

title: Implement Self Attention

difficulty: beginner

code:
  file: train_gpt2.py
  start_line: 120
  end_line: 145

knowledge:
  - attention
  - qkv
  - softmax
  - causal-mask

sources:
  - attention-is-all-you-need
  - pytorch-attention
  - cs336-attention

experiments:
  - causal-mask-test

assessment:
  - explain-qkv
  - tensor-shape
```

---

# 23. Git 集成

项目必须围绕 Git 设计。

核心能力：

```text
Repository
↓
Commit History
↓
Commit Diff
↓
Changed Files
↓
Changed Lines
```

不能只展示最新源码。

因为：

> **“为什么增加这几行代码”本身就是学习内容。**

---

# 24. 版本固定

为了防止上游项目变化导致教学内容失效：

所有 Lesson 必须绑定：

```text
repository URL
commit SHA
file path
line range
```

而不是只写：

```text
main branch
```

这样未来即使上游代码变化：

```text
旧教材
↓
仍然可复现
```

---

# 25. 开源项目结构

建议：

```text
LLM-Zero-To-One/
│
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
│
├── apps/
│   └── web/
│
├── content/
│   ├── paths/
│   ├── lessons/
│   ├── knowledge/
│   ├── sources/
│   ├── experiments/
│   └── assessments/
│
├── obsidian/
│
├── data/
│   ├── repositories/
│   └── manifests/
│
├── scripts/
│
├── docs/
│
└── .github/
    ├── workflows/
    └── issue_templates/
```

---

# 26. 技术架构

## MVP 推荐

前端：

```text
TypeScript
React
Next.js / Astro
```

代码阅读：

```text
Shiki
Monaco Editor
```

知识内容：

```text
Markdown
MDX
YAML
JSON
```

搜索：

第一阶段：

```text
静态搜索
```

第二阶段：

```text
全文搜索
```

第三阶段：

```text
Semantic Search
Embedding
RAG
```

AI：

```text
LLM API
+
Repository Context
+
Lesson Context
+
Knowledge Context
+
Source Context
```

---

# 27. AI Context 架构

AI 不直接拿整个互联网作为上下文。

而是：

```text
当前 Lesson
      ↓
当前 Commit
      ↓
当前代码
      ↓
相关 Knowledge
      ↓
可信 Source
      ↓
学习者历史
      ↓
AI Tutor
```

必要时才扩展到：

```text
Repository
CS336
官方文档
论文
```

---

# 28. 推荐前端交互

## 左侧

```text
Learning Path
├── 01 Token
├── 02 Dataset
├── 03 Embedding
├── 04 Attention
├── 05 Transformer
└── 06 Training
```

## 中间

```text
Git Commit
↓
Diff
↓
Code
↓
Current Line
```

## 右侧

```text
Explain
Why
Shape
Math
Knowledge
Sources
Experiment
AI Tutor
```

---

# 29. “知识点侧栏”必须成为核心功能

例如点击：

```text
Cross Entropy
```

显示：

```text
是什么
↓
为什么语言模型使用它
↓
数学表达
↓
代码在哪
↓
源码里怎么使用
↓
官方文档
↓
论文
↓
视频
↓
实验
↓
常见错误
```

这样学习者不用离开当前页面去 Google。

---

# 30. AI 搜索与资料推荐

未来允许 AI 根据：

```text
当前代码
当前知识点
当前学习阶段
```

寻找候选资料。

但 AI 推荐资料时必须返回：

```text
为什么相关
来源类型
作者
原始链接
可信等级
```

不允许：

```text
AI 随便搜一篇博客
↓
直接当权威教材
```

---

# 31. 社区贡献

开放贡献：

```text
新知识解释
新实验
错误修正
资料补充
中文资料
英文资料
源码注释
翻译
课程关联
```

贡献者不一定需要提交代码。

未来可以：

```text
这个知识点解释不好
↓
Submit Improvement
↓
社区审核
↓
合并
```

---

# 32. 内容审核

内容分成：

```text
Verified
Reviewed
Community
AI Generated
```

其中：

### Verified

经过源码 / 官方资料验证。

### Reviewed

人工审核。

### Community

社区贡献，尚未完全审核。

### AI Generated

AI 自动生成，需要人工验证。

---

# 33. 第三方资料版权策略

项目不复制第三方整篇内容。

允许：

```text
链接
简短引用
元信息
摘要
自己的解释
```

第三方代码严格按照对应许可证处理。

项目自身建议区分：

```text
Code License
Content License
```

例如：

```text
Code → MIT
Original Educational Content → CC BY-SA
```

具体许可证最终根据仓库内容组成确定。

---

# 34. MVP 范围

第一版不做：

```text
所有模型
所有课程
所有仓库
完整社交系统
复杂用户体系
复杂推荐算法
```

只做：

# “第一个完整学习闭环”

即：

```text
build-nanogpt
↓
选取前若干关键 Commit
↓
源码
↓
Diff
↓
逐行解释
↓
Knowledge
↓
Source
↓
Experiment
↓
Assessment
↓
AI Tutor
```

---

# 35. MVP 第一阶段

第一阶段建议只完成：

```text
micrograd
microgpt
build-nanogpt
```

不要一开始就把所有项目做进去。

目标：

> 用三个项目证明“源码驱动学习”这个产品模型可行。

---

# 36. MVP 第一批 Lesson

建议先制作：

```text
01 什么是 Token
02 Tokenizer
03 Dataset
04 Embedding
05 Tensor Shape
06 Linear
07 QKV
08 Attention
09 Causal Mask
10 MLP
11 Transformer Block
12 Logits
13 Cross Entropy
14 Backpropagation
15 AdamW
16 Training Loop
17 Sampling
```

这些内容可以跨项目复用。

---

# 37. 第二阶段

加入：

```text
100M GPT
↓
Mixed Precision
↓
Gradient Accumulation
↓
Checkpoint
↓
Evaluation
```

并加入：

```text
CS336
```

作为理论验证体系。

---

# 38. 第三阶段

进入：

```text
llm.c
↓
GPU
↓
CUDA
↓
Kernel
↓
Memory
↓
Performance
```

---

# 39. 第四阶段

进入：

```text
DDP
↓
FSDP
↓
Parallel Training
↓
Scaling
↓
Large Dataset
```

---

# 40. 第五阶段

加入：

```text
nanochat
↓
完整训练
↓
Evaluation
↓
Inference
↓
Chat
```

最终形成完整 LLM 路线。

---

# 41. 第一版用户旅程

一个新用户进入首页：

```text
我会 Python
但不懂大模型
```

点击：

```text
Start from Zero
```

进入：

```text
micrograd
```

学习 20～30 分钟。

完成：

```text
第一张计算图
↓
第一次 Backprop
```

然后：

```text
进入 microgpt
```

第一次看到：

```text
Tokenizer
Embedding
Attention
GPT
```

随后：

```text
进入 build-nanogpt
```

开始第一次真正源码考古。

最终：

```text
看到完整 GPT
↓
跑起来
↓
训练
↓
生成
```

这是整个产品的“第一次价值”。

---

# 42. 成功指标

早期不以用户数量为唯一指标。

首先衡量学习效果：

```text
首次进入 → 开始学习
首次学习 → 跑通实验
首次实验 → 完成 Lesson
Lesson → 独立回答问题
完成路线 → 能解释源码
```

核心指标：

```text
First Run Success
Lesson Completion
Experiment Completion
Assessment Success
Source Click-through
Knowledge Exploration
```

最终最有价值的指标：

> **用户是否能够独立解释真实 LLM 源码。**

---

# 43. 项目核心壁垒

不是：

```text
代码
```

因为代码可以被复制。

真正的壁垒是：

```text
源码版本映射
+
代码解释
+
知识图谱
+
资料关联
+
实验
+
学习路径
+
AI Tutor Protocol
+
社区积累
```

最终形成：

> **“LLM 源码 → Knowledge → Source → Experiment → Learning”知识网络。**

---

# 44. 与普通 AI 教程的差异

普通教程：

```text
老师告诉你：
Attention 是什么
```

本项目：

```text
你看到真实代码
↓
这一行为什么存在？
↓
它新增了什么？
↓
它为什么必须出现在这里？
↓
输入是什么？
↓
输出是什么？
↓
Tensor Shape？
↓
数学上是什么？
↓
论文在哪里？
↓
不同项目怎么写？
↓
实验验证
```

---

# 45. 与普通 GitHub 项目的差异

普通 GitHub：

```text
Code
README
```

本项目：

```text
Code
+
Git History
+
Diff
+
Explanation
+
Knowledge
+
Sources
+
Experiments
+
Assessment
+
AI Tutor
```

---

# 46. 与 AI Coding 的差异

AI Coding：

```text
需求
↓
AI 写代码
↓
运行
```

本项目：

```text
真实代码
↓
AI 带读
↓
理解
↓
运行
↓
验证
↓
自己修改
```

AI 是老师，而不是替学生完成学习。

---

# 47. 第一阶段开发任务

## P0

必须完成：

```text
项目仓库初始化
Obsidian Knowledge Base
学习路线数据模型
Lesson 数据模型
Commit 数据模型
Source 数据模型
Web MVP
源码 Diff 页面
代码行选中
知识侧栏
AI Tutor 基础协议
```

## P1

随后完成：

```text
Experiment
Assessment
全文搜索
知识图谱
多蓝本关联
```

## P2

之后：

```text
Semantic Search
RAG
用户账户
学习进度
社区贡献
AI 自动资料关联
自动 Commit 分析
```

---

# 48. AI Coding Agent 的开发原则

Codex / ZCODE 不允许：

```text
一次性生成整个项目
```

开发必须：

```text
PRD
↓
Architecture
↓
Module
↓
Task
↓
Implementation
↓
Test
↓
Review
```

每完成一个模块：

```text
代码审查
↓
测试
↓
文档
↓
Commit
```

---

# 49. AI Tutor 与 Coding Agent 分离

这是一个非常重要的设计。

### Coding Agent

负责：

```text
开发平台
写代码
测试
修 Bug
```

### AI Tutor

负责：

```text
教学习者
解释源码
提出问题
引导实验
```

两者不能混成一个角色。

---

# 50. 最终产品形态

最终首页应该不是：

> “这是一个 Transformer 教程。”

而是：

```text
┌──────────────────────────────────────┐
│                                      │
│       Learn LLMs from Real Code      │
│                                      │
│   从真实开源代码开始学习大语言模型      │
│                                      │
│       [ 从 0 开始 ] [ 查看路线 ]        │
│                                      │
└──────────────────────────────────────┘
```

下面：

```text
我完全不会
    ↓
micrograd

我会 Python
    ↓
microgpt

我想真正理解 GPT
    ↓
build-nanogpt

我想研究训练系统
    ↓
llm.c / CS336

我想研究完整 LLM
    ↓
nanochat
```

---

# 51. 最终目标

这个项目不是为了让用户：

> “看完一个网站。”

而是为了让用户经历：

```text
不会
 ↓
敢看源码
 ↓
能读源码
 ↓
能运行
 ↓
能修改
 ↓
能解释
 ↓
能独立研究
```

最终达到：

> **AI 时代真正的“源码理解能力”。**

---

# 52. 项目核心 Slogan

### English

**Learn LLMs by Reading Real Code.**

### 中文

**从真实源码开始，真正学会大模型。**

辅助文案：

> 不只是看懂 Transformer，而是沿着真实开源项目，从第一行代码一路走到模型训练完成。

---

# 53. 第一版 Definition of Done

当下面全部完成时，MVP 才算真正完成：

```text
□ 用户可以进入学习路线
□ 可以查看真实 Git Commit
□ 可以查看 Commit Diff
□ 可以定位代码行
□ 可以查看逐行解释
□ 可以看到 Tensor Shape
□ 可以看到相关知识点
□ 可以看到相关论文 / 官方资料
□ 可以看到实验
□ 可以运行实验
□ 可以完成理解题
□ AI Tutor 能基于当前上下文教学
□ AI Tutor 不直接替用户完成学习
□ 所有 Lesson 绑定固定 Commit SHA
□ Obsidian 可以作为内容源
□ Web 可以构建
□ GitHub 可以直接运行
□ 新贡献者可以添加 Lesson
```

---

# 54. 长期愿景

未来这个系统可以从：

```text
GPT
```

扩展到：

```text
LLaMA
DeepSeek
MoE
Vision-Language
Diffusion
Speech
Multimodal
```

最终从一个：

> LLM 学习网站

变成：

> **“通过真实源码学习现代 AI 系统”的开源知识平台。**

---

# 55. 最重要的一条产品原则

整个项目始终坚持：

> **不要让 AI 替人理解代码，而是让 AI 帮人理解代码。**

真实源码负责“事实”。

资料负责“背景”。

实验负责“验证”。

Obsidian 负责“知识沉淀”。

AI Tutor 负责“教学”。

GitHub 负责“开放协作”。

Web 负责“最终学习体验”。

最终形成：

```text
             ┌──────────────┐
             │ 真实开源源码  │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Git Commit    │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Code / Diff   │
             └──────┬───────┘
                    ↓
       ┌────────────┼────────────┐
       ↓            ↓            ↓
    Knowledge      Source      Experiment
       ↓            ↓            ↓
       └────────────┼────────────┘
                    ↓
              AI Tutor
                    ↓
                Learner
                    ↓
                Assessment
                    ↓
              真正理解源码
```

**这就是 LLM-Zero-To-One 的完整产品定义。**
