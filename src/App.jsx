import {
  ChevronDown,
  ChevronRight,
  Columns3,
  FileText,
  FileDown,
  LocateFixed,
  Printer,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

const lanes = [
  { id: "sales", label: "SALES", cn: "销售", className: "lane-sales" },
  { id: "cs", label: "CS", cn: "客服", className: "lane-cs" },
  { id: "op", label: "OP", cn: "操作", className: "lane-op" },
];

const modules = [
  {
    id: "inquiry",
    no: "01",
    title: "询价发起",
    badge: "新/老客户判断",
    rule: "新客户可由 SALES 或 CS 发需求给 OP；老客户固定由 CS 发 inquiry 给 OP。",
    flow: "新客户：SALES/CS → OP；老客户：CS → OP",
    steps: [
      {
        id: "inquiry-sales-new",
        lane: "sales",
        type: "decision",
        title: "新客户",
        text: "SALES 可首次跨部门发需求",
        responsibility: "销售判断是否自己发起首轮需求，或交由 CS 发起。",
        inputs: "客户基础资料、航线/货物/时效需求、报价背景。",
        outputs: "完整询价需求。",
        notes: "仅限新客户首轮场景；需保证信息完整，不把不确定内容当确认条件。",
      },
      {
        id: "inquiry-cs-old",
        lane: "cs",
        type: "decision",
        title: "老客户",
        text: "CS 发 inquiry 给 OP",
        responsibility: "客服作为老客户询价入口，整理需求后发给 OP。",
        inputs: "老客户需求、历史合作信息、服务要求。",
        outputs: "inquiry 给 OP。",
        notes: "老客户不要绕过 CS 直接让 SALES 对 OP 发起 inquiry。",
      },
      {
        id: "inquiry-op",
        lane: "op",
        type: "action",
        title: "OP 接收询价",
        text: "开始报价准备",
        responsibility: "操作根据 inquiry 或需求准备报价。",
        inputs: "SALES/CS 发来的有效询价信息。",
        outputs: "报价准备结果或补充问题。",
        notes: "如信息不完整，按对应入口反馈，不扩大沟通对象。",
      },
    ],
  },
  {
    id: "sc-transfer",
    no: "02",
    title: "SC 传递",
    badge: "禁止 SALES 直发 OP",
    rule: "SALES 不可以发 SC 给 OP，必须通过 CS；OP 有问题找 CS，不找 SALES。",
    flow: "SALES → CS → OP；OP 问题反馈 → CS",
    steps: [
      {
        id: "sc-sales",
        lane: "sales",
        type: "blocked",
        title: "SALES 交给 CS",
        text: "不直接发 SC 给 OP",
        responsibility: "销售将 SC 交由 CS 作为传递口。",
        inputs: "SC、客户确认信息。",
        outputs: "发给 CS 的 SC。",
        notes: "红线：SALES 不直接把 SC 发给 OP。",
      },
      {
        id: "sc-cs",
        lane: "cs",
        type: "action",
        title: "CS 转发 SC",
        text: "统一发给 OP",
        responsibility: "客服审核并转发 SC，承接 OP 后续问题。",
        inputs: "SALES 提供的 SC。",
        outputs: "发给 OP 的 SC；OP 问题回复。",
        notes: "OP 有疑问时，CS 是唯一回问对象。",
      },
      {
        id: "sc-op",
        lane: "op",
        type: "feedback",
        title: "OP 接收 SC",
        text: "有问题只反馈 CS",
        responsibility: "操作按 CS 发来的 SC 开始执行。",
        inputs: "CS 转发的 SC。",
        outputs: "操作执行动作；必要时反馈给 CS。",
        notes: "不向 SALES 追问 SC 问题，避免职责链断裂。",
      },
    ],
  },
  {
    id: "operation-issues",
    no: "03",
    title: "操作问题处理",
    badge: "OP 默认直联客人",
    rule: "操作问题由 OP 直接问客人；特殊情况才升级 CS。",
    flow: "OP → 客人；特殊情况 → CS",
    steps: [
      {
        id: "issue-cs",
        lane: "cs",
        type: "exception",
        title: "CS 介入",
        text: "不配合 / 失联 / 额外费用",
        responsibility: "客服只在特殊情况介入协调。",
        inputs: "OP 说明的异常原因、客户沟通记录、费用影响。",
        outputs: "协调结果或客户确认。",
        notes: "不是所有操作问题都回到 CS；仅处理升级场景。",
      },
      {
        id: "issue-op",
        lane: "op",
        type: "action",
        title: "OP 直接联系客人",
        text: "解决日常操作问题",
        responsibility: "操作直接向客人确认操作细节并推动解决。",
        inputs: "订舱/运输/单证/现场执行中的具体问题。",
        outputs: "客户确认结果、操作处理结论。",
        notes: "除非客户不配合、找不到人或产生额外费用，否则不用通过 CS/SALES。",
      },
    ],
  },
  {
    id: "gap",
    no: "04",
    title: "费用差额录入",
    badge: "CNY 200 阈值",
    rule: "应收/应付 GAP ≤ CNY 200，OP 直接确认录入系统；超过 CNY 200 再请 CS 确认。",
    flow: "GAP ≤ 200：OP 录入；GAP > 200：OP → CS → 录入",
    steps: [
      {
        id: "gap-cs",
        lane: "cs",
        type: "exception",
        title: "GAP > CNY 200",
        text: "CS 确认后再录入",
        responsibility: "客服确认超过阈值的费用差额是否可接受。",
        inputs: "OP 提供的差额明细、应收/应付依据。",
        outputs: "费用确认结果。",
        notes: "仅超过 CNY 200 时触发 CS 确认。",
      },
      {
        id: "gap-op",
        lane: "op",
        type: "action",
        title: "GAP ≤ CNY 200",
        text: "OP 直接确认录入系统",
        responsibility: "操作自行判断并录入系统。",
        inputs: "应收/应付差额、系统费用记录。",
        outputs: "系统录入完成。",
        notes: "CNY 200 以内无需再问 CS 是否确认。",
      },
    ],
  },
  {
    id: "billing",
    no: "05",
    title: "账单与催款",
    badge: "首催 OP，后续 CS",
    rule: "OP 开账单给客人并第一次催款；仍未支付时，后续由 CS 催款。",
    flow: "OP 开账单/首催 → 未付款 → CS 后续催款",
    steps: [
      {
        id: "billing-cs",
        lane: "cs",
        type: "handoff",
        title: "仍未付款",
        text: "CS 接手后续催款",
        responsibility: "客服承接后续催款沟通。",
        inputs: "OP 首催记录、账单、客户未付款状态。",
        outputs: "后续催款结果。",
        notes: "以 OP 首催为起点，避免重复或无人跟进。",
      },
      {
        id: "billing-op",
        lane: "op",
        type: "action",
        title: "OP 开账单",
        text: "第一次催款由 OP 执行",
        responsibility: "操作出账单并完成第一次催款。",
        inputs: "费用明细、账单信息、客户开票要求。",
        outputs: "发送给客户的账单、首催记录。",
        notes: "首催后仍未支付，及时交接给 CS。",
      },
    ],
  },
  {
    id: "contract",
    no: "06",
    title: "新客户合同",
    badge: "SALES 独立寄出",
    rule: "新客户合同由 SALES 寄出，不由 CS 或 OP 寄出。",
    flow: "SALES → 客户",
    steps: [
      {
        id: "contract-sales",
        lane: "sales",
        type: "action",
        title: "SALES 寄出合同",
        text: "新客户合同唯一出口",
        responsibility: "销售负责新客户合同寄送。",
        inputs: "新客户合同、客户收件信息。",
        outputs: "已寄出的合同与寄送记录。",
        notes: "CS/OP 不参与合同寄送动作。",
      },
      {
        id: "contract-cs",
        lane: "cs",
        type: "blocked",
        title: "CS 不寄合同",
        text: "仅按需知会",
        responsibility: "客服不承担新客户合同寄送。",
        inputs: "必要的合同状态知会。",
        outputs: "无寄送动作。",
        notes: "不要替代 SALES 发出新客户合同。",
      },
      {
        id: "contract-op",
        lane: "op",
        type: "blocked",
        title: "OP 不寄合同",
        text: "不介入合同寄送",
        responsibility: "操作不承担新客户合同寄送。",
        inputs: "无。",
        outputs: "无寄送动作。",
        notes: "保持合同责任归 SALES。",
      },
    ],
  },
  {
    id: "sensitive",
    no: "07",
    title: "敏感物品文件",
    badge: "先审核再问价",
    rule: "SALES/CS 审核敏感物品文件，提取有效信息后再发出问价；OP 不接触原始敏感文件。",
    flow: "SALES/CS 审核提取 → CS → OP 问价",
    steps: [
      {
        id: "sensitive-sales",
        lane: "sales",
        type: "action",
        title: "SALES 审核文件",
        text: "提取有效信息",
        responsibility: "销售审核原始敏感文件并提取问价所需信息。",
        inputs: "客户原始敏感物品文件。",
        outputs: "有效信息摘要。",
        notes: "不要把原始敏感文件直接抛给 OP。",
      },
      {
        id: "sensitive-cs",
        lane: "cs",
        type: "action",
        title: "CS 审核/转发",
        text: "脱敏后发 OP 询价",
        responsibility: "客服审核或复核有效信息，并作为转发口。",
        inputs: "原始文件或 SALES 提取信息。",
        outputs: "脱敏后的有效询价信息。",
        notes: "发给 OP 的应是可用于问价的信息，不是未经处理的敏感材料。",
      },
      {
        id: "sensitive-op",
        lane: "op",
        type: "action",
        title: "OP 收到有效信息",
        text: "基于脱敏信息问价",
        responsibility: "操作使用有效信息进行问价。",
        inputs: "CS 转来的脱敏有效信息。",
        outputs: "问价反馈。",
        notes: "OP 不接触原始敏感文件。",
      },
    ],
  },
  {
    id: "export",
    no: "08",
    title: "出口港到港",
    badge: "OP 跟进至 Alert",
    rule: "出口 OP 只跟进港到港；发完 Alert 后，由 CS 补充箱单发票。",
    flow: "OP 港到港/Alert → CS 补充箱单发票",
    steps: [
      {
        id: "export-cs",
        lane: "cs",
        type: "handoff",
        title: "CS 补充文件",
        text: "箱单 + 发票",
        responsibility: "客服在 OP 发出 Alert 后补充箱单与发票。",
        inputs: "OP Alert、客户单证资料。",
        outputs: "补充后的箱单与发票。",
        notes: "Alert 后的文件补充责任归 CS。",
      },
      {
        id: "export-op",
        lane: "op",
        type: "action",
        title: "OP 跟进港到港",
        text: "完成后发出 Alert",
        responsibility: "出口操作跟进港到港全程并发 Alert。",
        inputs: "SC、订舱/运输执行信息。",
        outputs: "港到港进度、Alert。",
        notes: "出口 OP 范围止于港到港与 Alert，不负责 Alert 后箱单发票补充。",
      },
    ],
  },
  {
    id: "import",
    no: "09",
    title: "进口港到港",
    badge: "CS 收 Alert 后派发要求",
    rule: "进口 OP 只跟进港到港；CS 收到代理 Alert 后发 SC 给 OP，并告知派送、清关、账单等要求；清关要求箱单发票由 OP 补充。",
    flow: "CS 收代理 Alert/发 SC → OP 港到港/补单证；CS 传达派送清关账单要求",
    steps: [
      {
        id: "import-cs-alert",
        lane: "cs",
        type: "action",
        title: "CS 收代理 Alert",
        text: "发 SC 给 OP",
        responsibility: "客服接收代理 Alert，并把 SC 发给 OP。",
        inputs: "代理 Alert、客户要求、SC。",
        outputs: "发给 OP 的 SC 与操作要求。",
        notes: "进口启动入口在 CS 收到代理 Alert 后。",
      },
      {
        id: "import-cs-requirements",
        lane: "cs",
        type: "handoff",
        title: "CS 告知要求",
        text: "派送 / 清关 / 账单",
        responsibility: "客服向 OP 明确派送、清关、账单等要求。",
        inputs: "客户要求、代理信息、账单要求。",
        outputs: "清晰的操作要求转达。",
        notes: "要求要一次说清，减少 OP 反复确认。",
      },
      {
        id: "import-op",
        lane: "op",
        type: "action",
        title: "OP 跟进港到港",
        text: "清关需补箱单 + 发票",
        responsibility: "进口操作跟进港到港，并按清关需要补充箱单发票。",
        inputs: "CS 发来的 SC、代理 Alert、清关资料要求。",
        outputs: "港到港跟进结果、补充箱单发票。",
        notes: "进口 OP 范围为港到港；清关所需箱单发票由 OP 补充。",
      },
    ],
  },
];

const typeLabels = {
  action: "执行",
  decision: "判断",
  feedback: "反馈",
  exception: "升级",
  handoff: "交接",
  blocked: "禁区",
};

const nodeIssues = {
  "inquiry-sales-new": "新客户首轮信息不完整，或 SALES/CS 谁发需求没有先说清，容易造成 OP 重复确认。",
  "inquiry-cs-old": "老客户 inquiry 绕过 CS，会导致历史要求、账期或服务习惯没有被带入。",
  "inquiry-op": "报价前发现资料缺项时，若没有回到正确入口，后续价格和责任容易失真。",
  "sc-sales": "SALES 直接发 OP 会绕开 CS，后续 OP 问题无人统一承接。",
  "sc-cs": "CS 未复核 SC 或转发遗漏，会让 OP 按错误条件操作。",
  "sc-op": "OP 直接找 SALES 追问，会破坏 SC 单向传递规则。",
  "issue-cs": "普通操作问题被过早升级，会拉长处理链路；真正异常未升级则可能影响费用或客户配合。",
  "issue-op": "OP 未直接联系客人会拖慢现场处理；涉及失联、不配合、额外费用时未升级会形成风险。",
  "gap-cs": "超过 CNY 200 未经 CS 确认，可能产生客户争议或账务差错。",
  "gap-op": "CNY 200 内仍反复请示，会降低录入效率；但金额判断错误会误用规则。",
  "billing-cs": "OP 首催记录未交接清楚，CS 后续催款会重复、漏催或口径不一致。",
  "billing-op": "首催未做或未留记录，后续催款责任会不清。",
  "contract-sales": "合同寄送信息错误或 SALES 未寄出，会影响新客户启动。",
  "contract-cs": "CS 代寄合同会打乱合同责任边界。",
  "contract-op": "OP 介入合同寄送会把操作责任扩到商务责任。",
  "sensitive-sales": "原始敏感文件未审核就外发，可能造成合规或客户信息泄露风险。",
  "sensitive-cs": "脱敏不充分或有效信息提取不完整，OP 问价会失准。",
  "sensitive-op": "OP 接触原始敏感文件，违反“只接收脱敏有效信息”的边界。",
  "export-cs": "Alert 后箱单发票未及时补充，会影响后续文件完整性。",
  "export-op": "OP 跟进范围超出港到港，容易与 CS 后续文件职责重叠。",
  "import-cs-alert": "代理 Alert 收到后未及时发 SC 给 OP，会拖延进口启动。",
  "import-cs-requirements": "派送、清关、账单要求没有讲清，OP 会反复确认或按默认处理。",
  "import-op": "清关所需箱单发票未补充，可能影响清关进度；OP 范围也不应扩成全链路客服。",
};

function getIssueText(step) {
  return nodeIssues[step.id] || "当前节点需保持责任边界清晰，避免信息遗漏、重复沟通或越权处理。";
}

const moduleSopDetails = {
  inquiry: {
    precheck: "确认客户类型、贸易条款、货物属性、起运港/目的港、件毛体、时效、是否敏感货、是否需清关/派送。",
    action: "按固定询价模板整理；新客户允许 SALES 或 CS 发起，老客户固定 CS 发起；OP 只接收完整需求后报价。",
    handoff: "询价单必须包含客户名、联系人、货描、航线、服务范围、目标价/时效、附件状态和截止时间。",
    exception: "资料缺项、敏感货、危险品、超尺寸、冷链、特殊目的港先退回补齐，不直接凭口头信息报价。",
    closure: "OP 输出报价结果、有效期、未包含费用和待确认条件；CS/SALES 回传给客户前复核口径。",
  },
  "sc-transfer": {
    precheck: "确认 SC 是否为客户最终确认版本，价格、航线、服务范围、付款条款、特殊要求是否一致。",
    action: "SALES 只把 SC 交给 CS，CS 复核后转 OP；OP 执行中只向 CS 反馈 SC 问题。",
    handoff: "SC 转发需带版本号、客户确认时间、报价对应关系、附件和特殊备注。",
    exception: "价格冲突、服务范围不一致、客户临时改要求、OP 发现不可执行条件时，CS 统一协调。",
    closure: "OP 确认收到可执行 SC，系统记录责任入口，后续问题不再回 SALES 多线沟通。",
  },
  "operation-issues": {
    precheck: "区分日常操作问题和需要 CS 介入的商务/客户关系/费用问题。",
    action: "舱位、放舱、截单、提箱、进仓、到港、单证补料等操作问题由 OP 直接联系客人闭环。",
    handoff: "OP 升级给 CS 时必须写明客户联系人、沟通记录、卡点、影响时间和费用影响。",
    exception: "客户不配合、失联、拒绝承担费用、产生额外费用、投诉倾向时立即升级 CS。",
    closure: "问题解决后 OP 更新系统状态；如 CS 介入，CS 回写客户确认结果。",
  },
  gap: {
    precheck: "核对应收/应付来源、币种、汇率、账单项目、供应商账单和客户确认价格。",
    action: "CNY 200 内 OP 直接确认录入；超过 CNY 200，OP 提交差额说明给 CS 确认。",
    handoff: "差额说明包含原金额、新金额、差额原因、责任方、是否可向客户收取。",
    exception: "重复费用、供应商临时加价、客户未确认费用、币种汇率异常不得直接录入。",
    closure: "系统费用录入完成并留痕；超过阈值的保留 CS 确认记录。",
  },
  billing: {
    precheck: "确认费用完整、税点/币种/付款方正确、账单抬头和客户开票要求无误。",
    action: "OP 开账单并做第一次催款；超过约定时间未付，CS 接手后续催款。",
    handoff: "OP 交接给 CS 时附账单、发送时间、首催记录、客户反馈、预计付款时间。",
    exception: "客户质疑费用、要求折扣、扣款、拒付、账期争议，由 CS 介入处理。",
    closure: "款项到账或形成明确付款计划；催款动作在系统中可追踪。",
  },
  contract: {
    precheck: "确认新客户主体、收件人、合同版本、价格条款、信用/账期要求和签署路径。",
    action: "新客户合同只由 SALES 寄出；CS/OP 只查看状态，不替代寄送。",
    handoff: "SALES 在系统记录寄出日期、快递单号/电子签链接、客户签回状态。",
    exception: "客户修改合同、账期争议、法务条款变更，回 SALES 统一处理。",
    closure: "合同签回或明确暂缓；未签回前标记新客户风险状态。",
  },
  sensitive: {
    precheck: "识别品名、成分、用途、MSDS/鉴定书/监管条件、是否危险品或敏感品。",
    action: "SALES/CS 先审核原始文件，提取脱敏有效字段，再由 CS 转 OP 问价。",
    handoff: "发给 OP 的只包含问价必要字段：品名类别、UN/危险等级如适用、包装、重量、目的港限制和文件结论。",
    exception: "文件缺失、品名模糊、监管条件不清、疑似禁运，先停问价并补文件。",
    closure: "OP 基于脱敏信息完成问价；原始敏感文件权限不扩散。",
  },
  export: {
    precheck: "确认 SC、订舱要求、截关截单、VGM、箱单发票状态、发货人/收货人信息。",
    action: "出口 OP 跟进港到港，完成订舱、提箱/进港、截单、装船、发 Alert。",
    handoff: "OP 发 Alert 后，CS 接手补充箱单、发票和客户后续文件要求。",
    exception: "甩柜、查验、截单失败、客户补料延迟、额外费用，按影响和费用规则升级。",
    closure: "Alert 已发，港到港节点完成；箱单发票补充责任转 CS。",
  },
  import: {
    precheck: "CS 收代理 Alert，核对到港信息、提单、费用、清关/派送/账单要求。",
    action: "CS 发 SC 给 OP 并说明要求；OP 跟进港到港并补清关所需箱单发票。",
    handoff: "SC 给 OP 时必须包含代理 Alert、到港时间、清关要求、派送地址、账单要求和联系人。",
    exception: "资料不齐、换单/到港费用异常、清关资料缺失、派送要求不明，CS 与客户确认。",
    closure: "港到港跟进完成，清关文件补齐，派送/账单要求已按 CS 指令执行。",
  },
};

const nodeRunbook = {
  "inquiry-sales-new": {
    checklist: "判断是否新客户；收集客户主体、货物、路线、时效、目标价；决定 SALES 直发还是交 CS 发。",
    handoff: "给 OP 或 CS 的需求必须使用同一模板，不允许只转聊天记录。",
    done: "OP 收到完整需求且无需再追问核心字段。",
  },
  "inquiry-cs-old": {
    checklist: "调取历史合作要求；核对账期、常用服务、历史报价；整理 inquiry 给 OP。",
    handoff: "CS 是老客户 inquiry 唯一入口，需带历史偏好和特殊要求。",
    done: "OP 可直接据此报价或明确一次性补料清单。",
  },
  "inquiry-op": {
    checklist: "检查货物/路线/时效/敏感属性；确认供应商或代理询价对象；标注报价有效期和不含项。",
    handoff: "缺项时按入口退回 SALES/CS，不私自扩大沟通链。",
    done: "输出可对外报价、待确认条件、风险提示。",
  },
  "sc-sales": {
    checklist: "确认客户已接受报价；整理 SC 版本、价格、服务范围和客户确认依据。",
    handoff: "只交 CS，不抄送 OP 作为执行指令。",
    done: "CS 收到可复核 SC 和客户确认依据。",
  },
  "sc-cs": {
    checklist: "复核 SC 与报价一致；检查费用、路线、服务范围；转 OP 并成为问题回收口。",
    handoff: "转发时标明版本、客户确认时间、特殊要求和不可变更项。",
    done: "OP 确认可执行；后续 SC 问题全部回 CS。",
  },
  "sc-op": {
    checklist: "按 CS 发来的 SC 建档；核对可执行性；有冲突一次性反馈 CS。",
    handoff: "问题反馈写清字段、影响和建议处理方案。",
    done: "操作启动且系统记录 SC 来源为 CS。",
  },
  "issue-cs": {
    checklist: "确认是否满足升级条件；协调客户配合、费用承担或联系人问题。",
    handoff: "向 OP 回传客户确认结果和下一步动作。",
    done: "客户配合恢复、联系人确认或费用处理口径明确。",
  },
  "issue-op": {
    checklist: "直接联系客人确认操作细节；记录电话/邮件/微信结果；判断是否升级。",
    handoff: "升级时附沟通记录、时间影响和费用影响。",
    done: "问题闭环并更新系统状态。",
  },
  "gap-cs": {
    checklist: "复核差额原因；判断是否向客户收取、内部吸收或供应商调整。",
    handoff: "给 OP 明确同意/拒绝/需改账的结论。",
    done: "系统有 CS 确认记录，OP 可据此录入。",
  },
  "gap-op": {
    checklist: "核对差额是否在 CNY 200 内；确认不是重复费用或异常币种；直接录入。",
    handoff: "无需问 CS，但需保留差额原因。",
    done: "费用录入完成且可追溯。",
  },
  "billing-cs": {
    checklist: "接收 OP 首催记录；按客户账期跟进；处理客户费用异议。",
    handoff: "对客户保持同一催款口径，不重复发送冲突账单。",
    done: "到账、承诺付款日确认，或升级为账款风险。",
  },
  "billing-op": {
    checklist: "核对费用完整；开账单；发送给客户；做第一次催款并记录。",
    handoff: "仍未付款时，把账单、首催时间、客户反馈交给 CS。",
    done: "首催完成，系统有账单和催款记录。",
  },
  "contract-sales": {
    checklist: "确认合同版本、客户主体、收件信息；寄出并记录单号/电子签链接。",
    handoff: "合同状态同步给 CS/OP 查看，不转移寄送责任。",
    done: "合同寄出并有签回/待签状态。",
  },
  "contract-cs": {
    checklist: "查看合同状态；如客户问及，仅反馈状态，不代寄。",
    handoff: "客户提出合同修改或签署问题，回 SALES。",
    done: "CS 不产生合同寄送动作。",
  },
  "contract-op": {
    checklist: "查看客户是否具备操作启动条件；不处理合同寄送。",
    handoff: "合同缺失影响执行时，反馈 CS/Sales 状态风险。",
    done: "OP 不承担商务合同责任。",
  },
  "sensitive-sales": {
    checklist: "识别敏感属性；核对原始文件；提取问价必要字段并隐藏客户敏感信息。",
    handoff: "把有效字段交 CS 复核，不直接给 OP 原件。",
    done: "形成脱敏有效信息。",
  },
  "sensitive-cs": {
    checklist: "复核脱敏字段；确认文件结论；统一转 OP 问价。",
    handoff: "只发问价所需字段、结论和限制条件。",
    done: "OP 收到可问价信息且无原始敏感文件。",
  },
  "sensitive-op": {
    checklist: "按脱敏信息询价；如供应商要求原件，回 CS 判断是否可提供。",
    handoff: "问价反馈包含限制、附加费和所需补充文件。",
    done: "完成问价且未扩散原始敏感资料。",
  },
  "export-cs": {
    checklist: "接收 Alert；补箱单、发票；确认客户是否需要额外单证。",
    handoff: "文件补充后同步 OP 或系统状态。",
    done: "Alert 后单证齐全。",
  },
  "export-op": {
    checklist: "订舱、跟进港到港、截单、装船、发送 Alert。",
    handoff: "Alert 发出后把箱单发票缺项交 CS。",
    done: "港到港节点完成，Alert 已发。",
  },
  "import-cs-alert": {
    checklist: "接收代理 Alert；核对到港、费用、清关/派送要求；发 SC 给 OP。",
    handoff: "SC 附 Alert、派送、清关、账单要求。",
    done: "OP 收到进口启动包。",
  },
  "import-cs-requirements": {
    checklist: "把派送地址、清关要求、账单对象、客户特殊要求一次性说明。",
    handoff: "要求变更时更新版本并通知 OP。",
    done: "OP 对服务边界和要求无歧义。",
  },
  "import-op": {
    checklist: "跟进港到港；按清关要求补箱单发票；反馈异常费用或资料缺失。",
    handoff: "清关/派送/账单要求不明时回 CS。",
    done: "港到港完成，清关所需单证补齐。",
  },
};

function getNodeRunbook(step) {
  return nodeRunbook[step.id] || {
    checklist: "按节点职责完成当前动作，并在系统保留关键沟通记录。",
    handoff: "交接时说明责任人、文件、状态、异常和下一步。",
    done: "下一节点可直接接手，无需重复确认核心信息。",
  };
}

const moduleCollaborationTips = [
  {
    match: "inquiry",
    tip: "使用固定询价模板，至少包含客户类型、货物信息、航线、时效、敏感属性和特殊要求，减少 OP 反复补问。",
  },
  {
    match: "sc",
    tip: "SC 设置 CS 为唯一转发口和问题回收口，系统中保留版本号，避免 SALES/OP 多线沟通。",
  },
  {
    match: "issue",
    tip: "普通操作问题由 OP 直接闭环；升级给 CS 时必须写明触发原因、客户反馈和费用影响。",
  },
  {
    match: "gap",
    tip: "把 CNY 200 阈值做成系统判断：小额直接录入，大额自动要求 CS 确认并留痕。",
  },
  {
    match: "billing",
    tip: "OP 首催后生成催款记录，超过约定时间仍未付款再交给 CS，避免重复催款或漏催。",
  },
  {
    match: "contract",
    tip: "新客户合同归 SALES 单点负责，CS/OP 只查看状态，不替代寄送动作。",
  },
  {
    match: "sensitive",
    tip: "敏感物品文件先审核、脱敏、提取有效字段，再进入问价链路；原始资料权限最小化。",
  },
  {
    match: "export",
    tip: "出口以 Alert 为 OP 到 CS 的交接点，交接清单固定为 Alert、箱单、发票和缺项说明。",
  },
  {
    match: "import",
    tip: "进口以代理 Alert 为启动点，CS 一次性转达派送、清关、账单要求，OP 补齐清关单证。",
  },
];

const collaborationPrinciples = [
  "单一入口",
  "交接清单",
  "异常阈值",
  "单证完整",
  "系统留痕",
];

function getCollaborationTip(step) {
  return moduleCollaborationTips.find((item) => step.id.includes(item.match))?.tip || "把责任人、输入、输出和异常条件写进系统字段，减少口头交接。";
}

const orbitCenter = { x: 50, y: 48 };

const moduleOrbit = [
  { id: "inquiry", x: 50, y: 17 },
  { id: "sc-transfer", x: 72, y: 22 },
  { id: "operation-issues", x: 86, y: 38 },
  { id: "gap", x: 86, y: 60 },
  { id: "billing", x: 68, y: 76 },
  { id: "contract", x: 48, y: 78 },
  { id: "sensitive", x: 29, y: 70 },
  { id: "export", x: 16, y: 48 },
  { id: "import", x: 27, y: 28 },
];

const laneXOffsets = {
  sales: -3.8,
  cs: 0,
  op: 3.8,
};

function projectNode(modulePoint, laneId, stepIndex) {
  const dx = modulePoint.x - orbitCenter.x;
  const dy = modulePoint.y - orbitCenter.y;
  const distance = Math.hypot(dx, dy) || 1;
  const radial = { x: dx / distance, y: dy / distance };
  const tangent = { x: -radial.y, y: radial.x };
  const laneOrder = { sales: -1, cs: 0, op: 1 };
  const radialDistance = 7.2 + stepIndex * 4.6;
  const laneDistance = (laneOrder[laneId] || 0) * 5.8;
  const x = modulePoint.x + radial.x * radialDistance + tangent.x * laneDistance;
  const y = modulePoint.y + radial.y * radialDistance + tangent.y * laneDistance;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(91, Math.max(12, y)),
  };
}

function drawHubPath(modulePoint) {
  return `M ${orbitCenter.x} ${orbitCenter.y} C ${(orbitCenter.x + modulePoint.x) / 2} ${orbitCenter.y}, ${(orbitCenter.x + modulePoint.x) / 2} ${modulePoint.y}, ${modulePoint.x} ${modulePoint.y}`;
}

function drawConnectorPath(start, end) {
  const mid = (start.x + end.x) / 2;
  return `M ${start.x} ${start.y} C ${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`;
}

function drawModuleNodePath(node) {
  return `M ${node.moduleX} ${node.moduleY} C ${(node.moduleX + node.x) / 2} ${node.moduleY}, ${(node.moduleX + node.x) / 2} ${node.y}, ${node.x} ${node.y}`;
}

function buildNetworkNodes() {
  const modulePointMap = Object.fromEntries(moduleOrbit.map((item) => [item.id, item]));
  return modules.flatMap((module, moduleIndex) => {
    const modulePoint = modulePointMap[module.id] || moduleOrbit[moduleIndex];
    return module.steps.map((step, stepIndex) => {
      const lane = lanes.find((item) => item.id === step.lane);
      const point = projectNode(modulePoint, step.lane, stepIndex);
      return {
        ...step,
        laneLabel: lane?.label || step.lane.toUpperCase(),
        laneClass: lane?.className || "",
        moduleId: module.id,
        moduleNo: module.no,
        moduleTitle: module.title,
        moduleX: modulePoint.x,
        moduleY: modulePoint.y,
        x: point.x,
        y: point.y,
      };
    });
  });
}

function createInitialNodePositions() {
  return Object.fromEntries(buildNetworkNodes().map((node) => [node.id, { x: node.x, y: node.y }]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildRelatedNodeMap(nodes, links) {
  const related = new Map(nodes.map((node) => [node.id, new Map()]));

  function addRelation(from, to, weight) {
    if (!related.has(from) || from === to) return;
    const current = related.get(from).get(to) || 0;
    related.get(from).set(to, Math.max(current, weight));
  }

  links.forEach(([from, to]) => {
    addRelation(from, to, 0.34);
    addRelation(to, from, 0.24);
  });

  modules.forEach((module) => {
    const ids = module.steps.map((step) => step.id);
    ids.forEach((from) => {
      ids.forEach((to) => addRelation(from, to, 0.13));
    });
  });

  return Object.fromEntries(
    Array.from(related.entries()).map(([nodeId, relationMap]) => [
      nodeId,
      Array.from(relationMap.entries()).map(([id, weight]) => ({ id, weight })),
    ])
  );
}

const networkLinks = [
  ["inquiry-sales-new", "inquiry-op"],
  ["inquiry-cs-old", "inquiry-op"],
  ["sc-sales", "sc-cs"],
  ["sc-cs", "sc-op"],
  ["sc-op", "sc-cs", "feedback"],
  ["issue-op", "issue-cs", "exception"],
  ["gap-op", "gap-cs", "exception"],
  ["billing-op", "billing-cs"],
  ["sensitive-sales", "sensitive-cs"],
  ["sensitive-cs", "sensitive-op"],
  ["export-op", "export-cs"],
  ["import-cs-alert", "import-op"],
  ["import-cs-alert", "import-cs-requirements"],
  ["import-cs-requirements", "import-op", "handoff"],
];

function App() {
  const [visibleLanes, setVisibleLanes] = useState(() => lanes.map((lane) => lane.id));
  const [expanded, setExpanded] = useState(() => new Set(["sc-cs"]));
  const [activeModule, setActiveModule] = useState("inquiry");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [nodePositions, setNodePositions] = useState(createInitialNodePositions);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFlowIndex((current) => (current + 1) % moduleOrbit.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedNodeId(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const activeLanes = useMemo(
    () => lanes.filter((lane) => visibleLanes.includes(lane.id)),
    [visibleLanes]
  );

  const baseNetworkNodes = useMemo(() => buildNetworkNodes(), []);
  const baseNodeMap = useMemo(
    () => Object.fromEntries(baseNetworkNodes.map((node) => [node.id, node])),
    [baseNetworkNodes]
  );
  const relatedNodeMap = useMemo(
    () => buildRelatedNodeMap(baseNetworkNodes, networkLinks),
    [baseNetworkNodes]
  );
  const networkNodes = useMemo(
    () => baseNetworkNodes.map((node) => ({ ...node, ...(nodePositions[node.id] || { x: node.x, y: node.y }) })),
    [baseNetworkNodes, nodePositions]
  );

  const networkNodeMap = useMemo(
    () => Object.fromEntries(networkNodes.map((node) => [node.id, node])),
    [networkNodes]
  );
  const activeFlowModuleId = moduleOrbit[activeFlowIndex]?.id || "inquiry";

  const gridStyle = {
    gridTemplateColumns: `repeat(${activeLanes.length || 1}, minmax(220px, 1fr))`,
  };

  function toggleLane(laneId) {
    setVisibleLanes((current) => {
      if (current.includes(laneId) && current.length === 1) return current;
      return current.includes(laneId)
        ? current.filter((id) => id !== laneId)
        : lanes.map((lane) => lane.id).filter((id) => id === laneId || current.includes(id));
    });
  }

  function toggleNode(nodeId) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(modules.flatMap((module) => module.steps.map((step) => step.id))));
  }

  function resetView() {
    setVisibleLanes(lanes.map((lane) => lane.id));
    setExpanded(new Set(["sc-cs"]));
    setActiveModule("inquiry");
    setSelectedNodeId(null);
    setNodePositions(createInitialNodePositions());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function printPdf() {
    expandAll();
    window.setTimeout(() => window.print(), 80);
  }

  function moveNetworkNode(nodeId, point, delta) {
    setNodePositions((current) => {
      const next = { ...current, [nodeId]: point };
      const relatedNodes = relatedNodeMap[nodeId] || [];

      relatedNodes.forEach(({ id, weight }) => {
        const currentPosition = current[id] || baseNodeMap[id];
        if (!currentPosition) return;
        const attraction = 0.035 * weight;
        next[id] = {
          x: clamp(
            currentPosition.x + delta.x * weight + (point.x - currentPosition.x) * attraction,
            6,
            94
          ),
          y: clamp(
            currentPosition.y + delta.y * weight + (point.y - currentPosition.y) * attraction,
            8,
            92
          ),
        };
      });

      return next;
    });
  }

  return (
    <main className="app-shell">
      <NetworkMap
        nodes={networkNodes}
        nodeMap={networkNodeMap}
        links={networkLinks}
        selectedNodeId={selectedNodeId}
        activeFlowModuleId={activeFlowModuleId}
        onCloseDetails={() => setSelectedNodeId(null)}
        onNodeMove={moveNetworkNode}
        onSelect={(node) => {
          const nextModuleId = modules.find((module) => module.steps.some((step) => step.id === node.id))?.id || activeModule;
          const nextFlowIndex = moduleOrbit.findIndex((modulePoint) => modulePoint.id === nextModuleId);
          setSelectedNodeId((current) => (current === node.id ? null : node.id));
          setActiveModule(nextModuleId);
          if (nextFlowIndex >= 0) setActiveFlowIndex(nextFlowIndex);
        }}
        onPrint={printPdf}
      />

      <section id="swimlane-detail" className="detail-shell">
        <header className="topbar">
          <div>
            <p className="kicker">SWIMLANE DETAIL</p>
            <h1>泳道明细</h1>
            <p className="summary">九个会议流程模块按 SALES / CS / OP 责任边界展开，可折叠部门泳道并逐节点查看责任、输入、输出和注意事项。</p>
          </div>
          <div className="toolbar" aria-label="流程图操作">
            <button type="button" className="tool-button" onClick={expandAll}>
              <ChevronDown size={18} aria-hidden="true" />
              展开节点
            </button>
            <button type="button" className="tool-button" onClick={resetView}>
              <RotateCcw size={18} aria-hidden="true" />
              重置视图
            </button>
            <button type="button" className="tool-button primary" onClick={printPdf}>
              <FileDown size={18} aria-hidden="true" />
              导出 PDF
            </button>
            <button type="button" className="icon-button" onClick={() => window.print()} aria-label="打印">
              <Printer size={19} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="control-row" aria-label="部门泳道开关">
          <div className="lane-toggle-title">
            <Columns3 size={18} aria-hidden="true" />
            泳道
          </div>
          {lanes.map((lane) => (
            <button
              key={lane.id}
              type="button"
              data-testid={`lane-toggle-${lane.id}`}
              className={`lane-toggle ${lane.className} ${visibleLanes.includes(lane.id) ? "is-on" : ""}`}
              onClick={() => toggleLane(lane.id)}
              aria-pressed={visibleLanes.includes(lane.id)}
            >
              <span>{lane.label}</span>
              <small>{lane.cn}</small>
            </button>
          ))}
        </section>

        <div className="workspace">
          <aside className="module-nav" aria-label="流程模块">
            {modules.map((module) => (
              <button
                key={module.id}
                type="button"
                className={activeModule === module.id ? "is-active" : ""}
                onClick={() => {
                  setActiveModule(module.id);
                  document.getElementById(module.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span>{module.no}</span>
                {module.title}
              </button>
            ))}
          </aside>

          <section className="diagram" aria-label="三部门泳道流程">
            <div className="lane-heads" style={gridStyle}>
              {activeLanes.map((lane) => (
                <div key={lane.id} className={`lane-head ${lane.className}`}>
                  <strong>{lane.label}</strong>
                  <span>{lane.cn}</span>
                </div>
              ))}
            </div>

            {modules.map((module) => (
              <article
                key={module.id}
                id={module.id}
                className={`module-card ${activeModule === module.id ? "is-current" : ""}`}
                onMouseEnter={() => setActiveModule(module.id)}
              >
                <div className="module-title">
                  <div className="module-number">{module.no}</div>
                  <div>
                    <h2>{module.title}</h2>
                    <p>{module.rule}</p>
                  </div>
                  <span className="module-badge">{module.badge}</span>
                </div>

                <div className="flow-strip">
                  <span>流向</span>
                  <strong>{module.flow}</strong>
                </div>
                {moduleSopDetails[module.id] && (
                  <div className="sop-grid">
                    <div>
                      <span>前置条件</span>
                      <p>{moduleSopDetails[module.id].precheck}</p>
                    </div>
                    <div>
                      <span>标准动作</span>
                      <p>{moduleSopDetails[module.id].action}</p>
                    </div>
                    <div>
                      <span>交接标准</span>
                      <p>{moduleSopDetails[module.id].handoff}</p>
                    </div>
                    <div>
                      <span>异常处理</span>
                      <p>{moduleSopDetails[module.id].exception}</p>
                    </div>
                    <div>
                      <span>关闭标准</span>
                      <p>{moduleSopDetails[module.id].closure}</p>
                    </div>
                  </div>
                )}

                <div className="step-grid" style={gridStyle}>
                  {activeLanes.map((lane) => {
                    const laneSteps = module.steps.filter((step) => step.lane === lane.id);
                    return (
                      <div key={lane.id} className="lane-column">
                        {laneSteps.length === 0 ? (
                          <div className="empty-slot" aria-hidden="true" />
                        ) : (
                          laneSteps.map((step) => (
                            <FlowNode
                              key={step.id}
                              lane={lane}
                              step={step}
                              expanded={expanded.has(step.id)}
                              onToggle={() => toggleNode(step.id)}
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>

      <CompleteFlowChart />
    </main>
  );
}

function CompleteFlowChart() {
  return (
    <section id="complete-flow" className="complete-flow" aria-label="完整流程图">
      <header className="complete-flow-header">
        <p className="kicker">END TO END MAP</p>
        <h1>完整流程图</h1>
        <p className="summary">从询价到进口/出口收尾，把 9 个模块按业务发生顺序串联；每一段都保留 SALES、CS、OP 的职责边界和交接标准。</p>
      </header>

      <div className="complete-flow-track">
        {modules.map((module, index) => (
          <article key={module.id} className="complete-flow-card">
            <div className="complete-flow-card-head">
              <span>{module.no}</span>
              <div>
                <h2>{module.title}</h2>
                <p>{module.rule}</p>
              </div>
            </div>

            <div className="complete-role-grid">
              {lanes.map((lane) => {
                const laneSteps = module.steps.filter((step) => step.lane === lane.id);
                return (
                  <div key={lane.id} className={`complete-role ${lane.className}`}>
                    <strong>{lane.label}</strong>
                    {laneSteps.length === 0 ? (
                      <p>本模块无直接动作</p>
                    ) : (
                      laneSteps.map((step) => (
                        <p key={step.id}>{step.title}：{step.text}</p>
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            {moduleSopDetails[module.id] && (
              <div className="complete-standards">
                <div>
                  <span>交接</span>
                  <p>{moduleSopDetails[module.id].handoff}</p>
                </div>
                <div>
                  <span>异常</span>
                  <p>{moduleSopDetails[module.id].exception}</p>
                </div>
                <div>
                  <span>关闭</span>
                  <p>{moduleSopDetails[module.id].closure}</p>
                </div>
              </div>
            )}

            {index < modules.length - 1 && (
              <div className="complete-flow-arrow" aria-hidden="true">
                <ChevronDown size={22} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function NetworkMap({ nodes, nodeMap, links, selectedNodeId, activeFlowModuleId, onSelect, onCloseDetails, onNodeMove, onPrint }) {
  const selectedNode = selectedNodeId ? nodeMap[selectedNodeId] : null;
  const selectedModule = selectedNode ? modules.find((module) => module.id === selectedNode.moduleId) : null;
  const selectedSop = selectedModule ? moduleSopDetails[selectedModule.id] : null;
  const selectedRunbook = selectedNode ? getNodeRunbook(selectedNode) : null;
  const activeFlowModule = modules.find((module) => module.id === activeFlowModuleId);
  const activeFlowIndex = moduleOrbit.findIndex((modulePoint) => modulePoint.id === activeFlowModuleId);
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);

  function getStagePoint(event) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 5.5, 94.5),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 7, 93),
    };
  }

  function startNodeDrag(event, node) {
    if (event.button !== undefined && event.button !== 0) return;
    const point = getStagePoint(event);
    if (!point) return;
    dragStateRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      lastPoint: point,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingNodeId(node.id);
  }

  function moveDraggedNode(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getStagePoint(event);
    if (!point) return;
    const delta = {
      x: point.x - drag.lastPoint.x,
      y: point.y - drag.lastPoint.y,
    };
    if (Math.abs(delta.x) < 0.04 && Math.abs(delta.y) < 0.04) return;

    drag.moved = true;
    drag.lastPoint = point;
    event.preventDefault();
    onNodeMove(drag.id, point, delta);
  }

  function endNodeDrag(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      event.preventDefault();
      event.stopPropagation();
      const draggedId = drag.id;
      const suppressReleaseClick = (clickEvent) => {
        const clickedNode = clickEvent.target instanceof Element
          ? clickEvent.target.closest("[data-testid]")
          : null;
        if (clickedNode?.dataset.testid === `network-node-${draggedId}`) {
          clickEvent.preventDefault();
          clickEvent.stopImmediatePropagation();
        }
        window.removeEventListener("click", suppressReleaseClick, true);
      };
      window.addEventListener("click", suppressReleaseClick, true);
      window.setTimeout(() => window.removeEventListener("click", suppressReleaseClick, true), 180);
    }
    dragStateRef.current = null;
    setDraggingNodeId(null);
  }

  function handleNodeClick(node) {
    onSelect(node);
  }

  return (
    <section className="constellation" aria-label="星空网络流程总览">
      <div className="constellation-copy">
        <p className="constellation-kicker">
          <Sparkles size={16} aria-hidden="true" />
          SALES / CS / OP 会议版 SOP
        </p>
        <h1>货代三部门操作流程图</h1>
        <p>九个流程模块压缩成一张星图，所有节点和跨部门流向在第一屏完整呈现。</p>
        <div className="constellation-actions">
          <button
            type="button"
            className="stellar-button primary"
            onClick={() => document.getElementById("swimlane-detail")?.scrollIntoView({ behavior: "smooth" })}
          >
            <LocateFixed size={18} aria-hidden="true" />
            泳道明细
          </button>
          <button type="button" className="stellar-button" onClick={onPrint}>
            <FileText size={18} aria-hidden="true" />
            导出 PDF
          </button>
        </div>
        <div className="constellation-principles" aria-label="协作原则">
          {collaborationPrinciples.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div
        className={`constellation-stage ${draggingNodeId ? "is-dragging" : ""}`}
        ref={stageRef}
        onPointerMove={moveDraggedNode}
        onPointerUp={endNodeDrag}
        onPointerCancel={endNodeDrag}
      >
        <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="stellar-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          <ellipse className="orbit-guide" cx="50" cy="48" rx="36" ry="34" />
          {moduleOrbit.slice(0, -1).map((modulePoint, index) => {
            const nextPoint = moduleOrbit[index + 1];
            const isActive = index === activeFlowIndex || index + 1 === activeFlowIndex;
            return (
              <path
                key={`sequence-${modulePoint.id}-${nextPoint.id}`}
                id={`sequence-flow-${modulePoint.id}-${nextPoint.id}`}
                className={`network-link sequence-link ${isActive ? "is-active" : ""}`}
                d={drawConnectorPath(modulePoint, nextPoint)}
                markerEnd="url(#stellar-arrow)"
                style={{ animationDelay: `${index * 65}ms` }}
              />
            );
          })}
          {moduleOrbit.map((modulePoint, index) => (
            <path
              key={`hub-${modulePoint.id}`}
              id={`hub-flow-${modulePoint.id}`}
              className={`network-link hub-link ${activeFlowModuleId === modulePoint.id ? "is-active" : ""}`}
              d={drawHubPath(modulePoint)}
              style={{ animationDelay: `${index * 55}ms` }}
            />
          ))}
          {nodes.map((node, index) => (
            <path
              key={`module-${node.id}`}
              id={`module-flow-${node.id}`}
              className={`network-link module-link ${node.moduleId === activeFlowModuleId ? "is-active" : ""}`}
              d={drawModuleNodePath(node)}
              style={{ animationDelay: `${180 + index * 35}ms` }}
            />
          ))}
          {links.map(([from, to, mode], index) => {
            const start = nodeMap[from];
            const end = nodeMap[to];
            if (!start || !end) return null;
            const isActive = start.moduleId === activeFlowModuleId || end.moduleId === activeFlowModuleId;
            return (
              <path
                key={`${from}-${to}-${index}`}
                id={`transfer-flow-${from}-${to}-${index}`}
                className={`network-link transfer-link ${mode ? `link-${mode}` : ""} ${isActive ? "is-active" : ""}`}
                d={drawConnectorPath(start, end)}
                markerEnd="url(#stellar-arrow)"
                style={{ animationDelay: `${index * 70}ms` }}
              />
            );
          })}
        </svg>

        <div className="stellar-core" style={{ left: `${orbitCenter.x}%`, top: `${orbitCenter.y}%` }}>
          <span>协作核心</span>
          <strong>SOP</strong>
          <em>{activeFlowModule?.no} {activeFlowModule?.title}</em>
        </div>

        {moduleOrbit.map((modulePoint) => {
          const module = modules.find((item) => item.id === modulePoint.id);
          return (
            <div
              key={modulePoint.id}
              className={`module-beacon ${activeFlowModuleId === modulePoint.id ? "is-active" : ""}`}
              style={{ left: `${modulePoint.x}%`, top: `${modulePoint.y}%` }}
            >
              <span>{module?.no}</span>
              {module?.title}
            </div>
          );
        })}

        {lanes.map((lane, index) => (
          <div
            key={lane.id}
            className={`constellation-lane-label ${lane.className}`}
            style={{ left: `${8 + index * 8}%`, top: `${88 + index * 4}%` }}
          >
            {lane.label}
            <span>{lane.cn}</span>
          </div>
        ))}

        {nodes.map((node, index) => (
          <button
            key={node.id}
            type="button"
            data-testid={`network-node-${node.id}`}
            draggable={false}
            className={`star-node ${node.laneClass} node-${node.type} ${node.moduleId === activeFlowModuleId ? "is-flow-active" : ""} ${draggingNodeId === node.id ? "is-dragging" : ""} ${selectedNode?.id === node.id ? "is-selected" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${180 + index * 48}ms` }}
            onPointerDown={(event) => startNodeDrag(event, node)}
            onPointerUp={endNodeDrag}
            onPointerCancel={endNodeDrag}
            onClick={() => handleNodeClick(node)}
            aria-pressed={selectedNode?.id === node.id}
          >
            <span className="star-dot" />
            <span className="star-copy">
              <small>{node.moduleNo} · {node.laneLabel}</small>
              <strong>{node.title}</strong>
            </span>
          </button>
        ))}
      </div>

      {selectedNode && (
        <aside className={`constellation-detail ${selectedNode.laneClass}`}>
          <button type="button" className="detail-close" onClick={onCloseDetails} aria-label="关闭节点详情">
            <X size={18} aria-hidden="true" />
          </button>
          <div>
            <span>{selectedNode.moduleNo} · {selectedNode.moduleTitle}</span>
            <h2>{selectedNode.title}</h2>
            <p>{selectedNode.text}</p>
            {selectedSop && (
              <div className="module-sop">
                <strong>模块标准</strong>
                <p>{selectedSop.precheck}</p>
                <p>{selectedSop.action}</p>
              </div>
            )}
          </div>
          <dl>
            {selectedRunbook && (
              <>
                <div>
                  <dt>执行清单</dt>
                  <dd>{selectedRunbook.checklist}</dd>
                </div>
                <div>
                  <dt>交接标准</dt>
                  <dd>{selectedRunbook.handoff}</dd>
                </div>
                <div>
                  <dt>完成标准</dt>
                  <dd>{selectedRunbook.done}</dd>
                </div>
              </>
            )}
            <div>
              <dt>责任人</dt>
              <dd>{selectedNode.responsibility}</dd>
            </div>
            <div>
              <dt>输入</dt>
              <dd>{selectedNode.inputs}</dd>
            </div>
            <div>
              <dt>输出</dt>
              <dd>{selectedNode.outputs}</dd>
            </div>
            <div>
              <dt>注意</dt>
              <dd>{selectedNode.notes}</dd>
            </div>
            <div>
              <dt>可能问题</dt>
              <dd>{getIssueText(selectedNode)}</dd>
            </div>
            <div>
              <dt>协作建议</dt>
              <dd>{getCollaborationTip(selectedNode)}</dd>
            </div>
          </dl>
        </aside>
      )}
    </section>
  );
}

function FlowNode({ lane, step, expanded, onToggle }) {
  const runbook = getNodeRunbook(step);
  return (
    <button
      type="button"
      data-testid={`flow-node-${step.id}`}
      className={`flow-node ${lane.className} node-${step.type} ${expanded ? "is-expanded" : ""}`}
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <div className="node-topline">
        <span className="node-type">{typeLabels[step.type]}</span>
        {expanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </div>
      <h3>{step.title}</h3>
      <p>{step.text}</p>
      {expanded && (
        <dl className="node-detail">
          <div>
            <dt>执行清单</dt>
            <dd>{runbook.checklist}</dd>
          </div>
          <div>
            <dt>交接标准</dt>
            <dd>{runbook.handoff}</dd>
          </div>
          <div>
            <dt>完成标准</dt>
            <dd>{runbook.done}</dd>
          </div>
          <div>
            <dt>责任人</dt>
            <dd>{step.responsibility}</dd>
          </div>
          <div>
            <dt>输入文件</dt>
            <dd>{step.inputs}</dd>
          </div>
          <div>
            <dt>输出文件</dt>
            <dd>{step.outputs}</dd>
          </div>
          <div>
            <dt>注意事项</dt>
            <dd>{step.notes}</dd>
          </div>
          <div>
            <dt>可能问题</dt>
            <dd>{getIssueText(step)}</dd>
          </div>
          <div>
            <dt>协作建议</dt>
            <dd>{getCollaborationTip(step)}</dd>
          </div>
        </dl>
      )}
    </button>
  );
}

export default App;
