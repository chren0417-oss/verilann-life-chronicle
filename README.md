# 维尔兰 · 人生之书

原创中世纪西幻人生模拟器，依据用户提供框架补全。页面语言为简体中文。

实现：逐项建角、六地区、八职业、二十四分支事件、四档难度、技能成长、物品交易、关系家庭、委托、借贷、工坊、衰老继承、多存档和二十步撤回。完整设计说明见 public/rules.md，尚未实现的大型系统在游戏规则面板明确标记。

运行：pnpm dev。验证：node test-game.mjs、pnpm exec tsc --noEmit、pnpm build。

当前使用浏览器本地存档及确定性规则引擎，无生成式AI调用。导出JSON用于备份和跨浏览器恢复。

验证记录：147项游戏状态、存档、独立档位与撤回检查通过。类型检查与正式构建通过。未执行浏览器交互测试。浏览器未提供可调用的WebMCP验证上下文，两个工具仅在支持document.modelContext的环境注册；不宣称完成WebMCP运行验证。

## AI 阶段目标

新增「AI目标」面板。用户可用自然语言给出某段时间的目标，AI通过OpenAI Responses API理解目的、优先级、限制与期限，然后每次只建议一步。状态由现有规则引擎结算，模型不能修改财富、属性或伪造结果。

目标与里程碑保存于Game.aiGoal，旧存档仍可加载。每步有自己的撤回记录，切换存档、手动操作、撤回或换目标后，版本计数会作废旧请求。刷新后需主动点击继续，不会自动重启。

自动推进每批最多12步，累计200步封顶。日期、食宿、生命、现有委托和债务期限由本地规则检查。新事件和重大选择暂停，用户可批准具体步骤。所有目标进度以实际状态核算。

服务端只访问 https://api.openai.com/v1/responses，密钥使用OPENAI_API_KEY环境变量，默认模型gpt-5-mini（可通过OPENAI_MODEL配置）。API密钥不进入前端、存档或模型输入，使用store:false。API路由验证Sites派发的已登录用户身份和同源请求，并做单实例限速与并发限制；网站继续保持仅站点所有者可访问。

本次验证：原有147项检查、51项AI目标及模拟接口检查、TypeScript检查。没有实际OpenAI密钥，因此未做真实模型调用、语义质量评测或声称账号已接通。未执行浏览器交互测试。缺少OpenAI Developers插件密钥授权工具时需由用户启用后再配置服务端秘密。

官方接口依据：https://developers.openai.com/api/docs/guides/structured-outputs 和 https://developers.openai.com/api/docs/quickstart 。
