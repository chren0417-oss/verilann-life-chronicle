# 维尔兰 · 人生之书

原创中世纪西幻人生模拟器，依据用户提供框架补全。页面语言为简体中文。

实现：逐项建角、六地区、八职业、二十四分支事件、四档难度、技能成长、物品交易、关系家庭、委托、借贷、工坊、衰老继承、多存档和二十步撤回。完整设计说明见 public/rules.md，尚未实现的大型系统在游戏规则面板明确标记。

运行：pnpm dev。验证：node test-game.mjs、pnpm exec tsc --noEmit、pnpm build。

当前使用浏览器本地存档及确定性规则引擎，AI目标功能可连接服务端配置的模型。导出JSON用于备份和跨浏览器恢复。

验证记录：147项游戏状态、存档、独立档位与撤回检查通过。类型检查与正式构建通过。未执行浏览器交互测试。浏览器未提供可调用的WebMCP验证上下文，两个工具仅在支持document.modelContext的环境注册；不宣称完成WebMCP运行验证。

## AI 阶段目标

「AI目标」面板支持自然语言阶段目标。AI通过配置的服务理解目的、优先级、限制与期限，每次只建议一步。状态由现有规则引擎结算，模型不能修改财富、属性或伪造结果。

目标与里程碑保存于Game.aiGoal，旧存档仍可加载。每步有自己的撤回记录，切换存档、手动操作、撤回或换目标后，版本计数会作废旧请求。刷新后需主动点击继续，不会自动重启。

自动推进每批最多12步，累计200步封顶。日期、食宿、生命、现有委托和债务期限由本地规则检查。新事件和重大选择暂停，用户可批准具体步骤。所有目标进度以实际状态核算。

服务端支持两种明确选择的供应商，互不回退或共用密钥：

- `AI_PROVIDER=openai`：使用 `OPENAI_API_KEY`、`OPENAI_MODEL`（默认 `gpt-5-mini`），调用固定的 OpenAI Responses API，`store:false`。
- `AI_PROVIDER=bailian`：使用 `DASHSCOPE_API_KEY`、`BAILIAN_BASE_URL`、`BAILIAN_MODEL`（默认 `qwen-plus`）。只接受百炼北京地域官方 HTTPS 接口及业务空间地址。使用 Chat Completions 非思考 JSON Object 模式，将完整 Schema 交给模型后在本地验证；拒绝截断或额外字段。免费使用时须在百炼控制台为所用模型开启“免费额度用完即停”，接口不会自动启用该控制台开关。

API密钥不进入前端、存档或模型输入，不跟随HTTP重定向。路由验证Sites派发的已登录用户身份和同源请求，并做单实例限速与并发限制；网站继续保持仅站点所有者可访问。公开连接状态只表示配置存在，实际请求验证权限和额度。

验证命令：`node test-game.mjs`、`node test-goal.mjs`、`node test-bailian.mjs`、`pnpm exec tsc --noEmit`、`pnpm build`。测试覆盖147项游戏检查、51项目标检查、42项百炼协议、收支计算与凭据隔离检查。百炼已用独立内存测试角色成功调用；真实模型内容仍需按游戏规则校验，有限示例不能保证所有目标的规划质量。测试不读写玩家的浏览器存档。未执行浏览器交互测试。

官方接口依据：https://developers.openai.com/api/docs/guides/structured-outputs 和 https://developers.openai.com/api/docs/quickstart 。

百炼接口依据：https://help.aliyun.com/zh/model-studio/qwen-structured-output 和 https://help.aliyun.com/en/model-studio/base-url 。
