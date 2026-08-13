import type { ScriptFixture } from '../features/search/types';

export const SYNTHETIC_SCRIPTS: readonly ScriptFixture[] = Object.freeze([
  Object.freeze({
    scriptId: 'syn-prod-001',
    domain: '产品',
    questionVariants: [
      '青岚智能灯怎么调节亮度',
      '青岚灯怎么调亮度',
      '青岚智能灯亮度调节',
      '青岚灯太亮了怎么调暗',
    ],
    answerText:
      '请打开「青岚家居」App，进入青岚智能灯详情页，用亮度滑杆调节 1%–100%。也可在灯体侧键短按一次循环三档：夜灯 / 日常 / 阅读。该说明仅用于 Demo 合成场景，不代表真实产品说明书。',
    platform: 'App + 设备按键',
    scopeLabel: '青岚智能灯全系（合成）',
    riskLevel: 'low',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-prod-002',
    domain: '产品',
    questionVariants: [
      '云栖音箱连不上蓝牙',
      '云栖音箱 Pro 蓝牙连接失败',
      '云栖音箱配对手机',
      '云栖音箱搜不到设备',
    ],
    answerText:
      '请先长按云栖音箱 Pro 顶部配对键 3 秒，指示灯变为蓝色闪烁后再在手机蓝牙列表选择「Yunqi-Speaker-Demo」。若仍失败，关闭其他已连接设备后重启音箱。此为合成排障话术，未连接真实设备日志。',
    platform: '蓝牙',
    scopeLabel: '云栖音箱 Pro（合成）',
    riskLevel: 'low',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-prod-003',
    domain: '产品',
    questionVariants: [
      '雾屿加湿器怎么换档',
      '雾屿加湿器档位说明',
      '雾屿加湿器雾量太大',
      '雾屿加湿器自动档怎么关',
    ],
    answerText:
      '雾屿加湿器正面旋钮顺时针为增雾，逆时针为减雾；按入旋钮 1 秒可开关自动档。自动档会按「雾屿环境」传感器估算湿度，仅作 Demo 说明，不读取真实环境数据。',
    platform: '设备旋钮',
    scopeLabel: '雾屿加湿器 H2（合成）',
    riskLevel: 'low',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-camp-001',
    domain: '活动',
    questionVariants: [
      '夏日星河节满减怎么用',
      '夏日星河节优惠规则',
      '星河节满 300 减 40',
      '夏日星河节活动怎么参加',
    ],
    answerText:
      '「夏日星河节」为合成活动：单笔实付满 300 减 40，每位用户限用 1 次，不与会员日券叠加。结算页需勾选「星河节满减」。Demo 不核验真实订单或库存。',
    platform: '商城结算页',
    scopeLabel: '夏日星河节 · 全店合成商品',
    riskLevel: 'medium',
    effectiveFrom: '2026-08-01',
    effectiveTo: '2026-08-31',
  }),
  Object.freeze({
    scriptId: 'syn-camp-002',
    domain: '活动',
    questionVariants: [
      '青岚会员日积分怎么兑',
      '青岚会员日兑换规则',
      '会员日 100 积分换什么',
      '青岚积分兑换截止了吗',
    ],
    answerText:
      '「青岚会员日」为已结束的合成活动：每 100 积分可兑 5 元券，每日限兑 2 张。当前有效期已过，请告知用户活动已结束，不要承诺补发。此条仅用于演示过期状态。',
    platform: '会员中心',
    scopeLabel: '青岚会员日（合成 · 已结束）',
    riskLevel: 'medium',
    effectiveFrom: '2026-06-01',
    effectiveTo: '2026-06-30',
  }),
  Object.freeze({
    scriptId: 'syn-pre-001',
    domain: '售前',
    questionVariants: [
      '流光手表 S2 防水吗',
      '流光手表能不能游泳',
      '流光手表防水等级',
      '流光手表下雨能戴吗',
    ],
    answerText:
      '流光手表 S2 标注合成防水等级 5ATM，可日常防水与溅水，不建议游泳、潜水或热水淋浴。如需运动防水，请引导用户查看「流光运动表」合成对比页，不要承诺真实质检结果。',
    platform: '售前咨询',
    scopeLabel: '流光手表 S2（合成）',
    riskLevel: 'medium',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-pre-002',
    domain: '售前',
    questionVariants: [
      '青岚智能灯支持星桥协议吗',
      '青岚灯能不能接入星桥网关',
      '青岚灯兼容星桥吗',
      '青岚智能灯第三方网关',
    ],
    answerText:
      '青岚智能灯仅官方声明兼容虚构协议「星桥 Bridge-X」。第三方网关、HomeLab 或未认证音箱不在支持范围。请避免承诺“一定能连上”，必要时升级到话术师复核。',
    platform: '售前咨询',
    scopeLabel: '青岚智能灯 × 星桥协议（合成）',
    riskLevel: 'medium',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-after-001',
    domain: '售后',
    questionVariants: [
      '云栖音箱保修多久',
      '云栖音箱 Pro 质保政策',
      '云栖音箱坏了怎么保修',
      '云栖音箱保修范围',
    ],
    answerText:
      '云栖音箱 Pro 合成质保为购机之日起 12 个月，仅覆盖主机硬件故障。进液、跌落、私拆不在范围。用户需提供合成订单号（格式 YQ-DEMO-XXXX）。Demo 不会创建真实工单。',
    platform: '售后工单',
    scopeLabel: '云栖音箱 Pro 质保（合成）',
    riskLevel: 'medium',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-after-002',
    domain: '售后',
    questionVariants: [
      '流光手表进水了怎么保修',
      '流光手表进水保修吗',
      '手表进水了能修吗',
      '流光手表进水售后',
    ],
    answerText:
      '流光手表进水不属于合成质保范围。请先引导用户立即断电并停止充电，再登记外观与进水时间。不要承诺免费维修或一定能修好；高风险场景需话术师复核后再答复。',
    platform: '售后工单',
    scopeLabel: '流光手表进液（合成）',
    riskLevel: 'high',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
  Object.freeze({
    scriptId: 'syn-after-003',
    domain: '售后',
    questionVariants: [
      '雾屿加湿器能退货吗',
      '雾屿加湿器七天无理由',
      '雾屿加湿器退换货规则',
      '加湿器拆封了还能退吗',
    ],
    answerText:
      '雾屿加湿器合成规则：未激活且附件齐全可 7 天无理由退货；已注水或激活后仅支持质量问题换货。涉及退款路径时不要口头承诺到账时间，请转人工话术师核对。',
    platform: '售后 / 退换货',
    scopeLabel: '雾屿加湿器退换（合成）',
    riskLevel: 'high',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  }),
]) satisfies readonly ScriptFixture[];

export const EXAMPLE_QUESTIONS = [
  '青岚智能灯怎么调节亮度',
  '夏日星河节满减怎么用',
  '流光手表进水了怎么保修',
] as const;
