import van from "vanjs-core";
import { goto, Route } from "vanjs-router";

// 辅助函数：将字符串转换为 SHA-256 16进制字符串
async function calculateHash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const getOrGenerateDeviceId = () => {
    let id = localStorage.getItem("ollama_device_id");
    if (!id) {
        // 生成类似 "DEV-X8K9M2" 的随机码
        id = "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("ollama_device_id", id);
    }
    return id;
};

// Ollama API 基础路径（根据实际部署调整，默认本地）
const OLLAMA_HOST = "https://ollama.icewind.qzz.io";

export const OllamaChatTitle = () => {
    return van.tags.section(
        van.tags.div(
            { class: "content-title" },
            van.tags.a(
                { class: "router", onclick: () => { goto("OllamaChat"); } },
                van.tags.h2("🤖 Ollama Chat")
            )
        )
    );
};

export const OllamaChat = () => {
    // --- 状态定义 ---
    // 1. 认证相关状态
    const deviceName = van.state(getOrGenerateDeviceId());
    const accessKey = van.state("");
    const isAuthorized = van.state(localStorage.getItem("ollama_auth_passed") === "true");
    const authError = van.state("");

    // 2. 模型对话相关状态
    const selectedModel = van.state("gemma4-12b-heretic");
    const previousModel = van.state("");
    const isModelLoading = van.state(false);
    const inputMessage = van.state("");
    const isResponding = van.state(false);

    // 从 localStorage 初始化历史记录
    const cachedHistory = localStorage.getItem("ollama_chat_history");
    const chatHistory = van.state(cachedHistory ? JSON.parse(cachedHistory) : []);

    // --- 样式定义 (Material Design 风格内联/局部注入) ---
    const styles = `
    .md-card { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: #333; margin-bottom: 20px; transition: all 0.3s; }
    .md-field { position: relative; margin-bottom: 20px; width: 100%; }
    .md-input { width: 100%; padding: 12px 16px; border: 1px solid #79747E; border-radius: 4px; box-sizing: border-box; font-size: 16px; background: transparent; transition: border-color 0.2s; }
    .md-input:focus { outline: none; border-color: #6750A4; border-width: 2px; }
    .md-btn { background: #6750A4; color: white; border: none; padding: 10px 24px; border-radius: 100px; font-weight: 500; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: background 0.2s, box-shadow 0.2s; }
    .md-btn:hover { background: #533F8A; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
    .md-btn:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; }
    .md-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 8px; }
    .badge-speed { background: #E8DEF8; color: #4F378B; }
    .badge-accuracy { background: #D0E1FD; color: #1A4175; }
    .chat-box { max-height: 400px; overflow-y: auto; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; background: #F5F5F5; margin-bottom: 16px; }
    .msg-user { text-align: right; margin-bottom: 12px; }
    .msg-user span { background: #D0BCFF; padding: 8px 14px; border-radius: 16px 16px 2px 16px; display: inline-block; max-width: 70%; word-break: break-all; }
    .msg-assistant { text-align: left; margin-bottom: 12px; }
    .msg-assistant span { background: #E3E3E3; padding: 8px 14px; border-radius: 16px 16px 16px 2px; display: inline-block; max-width: 70%; word-break: break-all; white-space: pre-wrap; }
    .loader-status { color: #6750A4; font-weight: bold; display: flex; align-items: center; gap: 8px; margin: 10px 0; }
    .spinner { width: 16px; height: 16px; border: 2px solid #6750A4; border-top-color: transparent; border-radius: 50%; animation: spin 1s infinite linear; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

    // 动态注入样式
    if (!document.getElementById("md-ollama-styles")) {
        const styleEl = van.tags.style({ id: "md-ollama-styles" }, styles);
        document.head.appendChild(styleEl);
    }

    // --- 核心业务逻辑 ---

    // 1. 权限校验
    const handleVerify = async () => {
        if (!deviceName.val.trim() || !accessKey.val.trim()) {
            authError.val = "请填写完整的计算机名/手机名以及通行密钥！";
            return;
        }
        const calculatedHash = await calculateHash(deviceName.val.trim());
        if (calculatedHash === accessKey.val.trim()) {
            isAuthorized.val = true;
            authError.val = "";
            localStorage.setItem("ollama_auth_passed", "true");
        } else {
            authError.val = "密钥校验未通过，请检查计算机名或联系管理员。";
        }
    };

    // 2. 模型切换（卸载旧模型 -> 加载新模型）
    const handleModelChange = async (e) => {
        const nextModel = e.target.value;
        previousModel.val = selectedModel.val;
        selectedModel.val = nextModel;

        isModelLoading.val = true;

        try {
            // 显式向 Ollama 发送请求卸载上一个模型 (keep_alive: 0)
            if (previousModel.val) {
                await fetch(`${OLLAMA_HOST}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: previousModel.val, keep_alive: 0 })
                }).catch(err => console.log("卸载旧模型提示:", err));
            }

            // 预加载新模型 (通过发送一个空提示词让其置入内存)
            await fetch(`${OLLAMA_HOST}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: nextModel, prompt: "", keep_alive: -1 }) // -1 代表让模型驻留内存
            });

        } catch (error) {
            console.error("加载模型切换异常: ", error);
        } finally {
            isModelLoading.val = false;
        }
    };

    // 3. 发送 AI 对话请求
    const handleSendMessage = async () => {
        if (!inputMessage.val.trim() || isResponding.val || isModelLoading.val) return;

        const userText = inputMessage.val.trim();
        // 1. 将用户的输入存入历史并立即渲染
        const updatedHistory = [...chatHistory.val, { role: "user", content: userText }];
        chatHistory.val = updatedHistory;
        localStorage.setItem("ollama_chat_history", JSON.stringify(updatedHistory));

        inputMessage.val = "";
        isResponding.val = true;

        // 2. 添加一个空的 AI 响应占位，用于后续不断追加文字
        chatHistory.val = [...chatHistory.val, { role: "assistant", content: "" }];

        try {
            const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: selectedModel.val,
                    // 注意：发送给后端的历史记录不应该包含刚刚放进去的空占位符，所以传 updatedHistory
                    messages: updatedHistory,
                    stream: true // 开启流式传输
                })
            });

            if (!response.ok) throw new Error(`Ollama 服务响应异常: ${response.status}`);

            // 3. 获取数据读取器和解码器
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let assistantContent = ""; // 用于累加 AI 的回复内容

            // 4. 循环读取流数据
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break; // 数据流结束
                }

                // 解码当前数据块 (加上 { stream: true } 防止切断多字节字符)
                const chunk = decoder.decode(value, { stream: true });

                // Ollama 返回的是以换行符分割的 JSON 字符串，按行拆分
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message && data.message.content) {
                            // 累加字符
                            assistantContent += data.message.content;

                            // 5. 实时更新 VanJS 状态
                            // 拷贝当前数组，修改最后一条记录的 content 并重新赋值，触发视图更新
                            const currentHistory = [...chatHistory.val];
                            currentHistory[currentHistory.length - 1] = {
                                role: "assistant",
                                content: assistantContent
                            };
                            chatHistory.val = currentHistory;
                        }
                    } catch (parseError) {
                        console.error("JSON 解析错误，跳过此行:", line, parseError);
                    }
                }
            }

            // 6. 对话彻底结束后，将完整的记录存入 localStorage
            localStorage.setItem("ollama_chat_history", JSON.stringify(chatHistory.val));

        } catch (err) {
            // 捕获到错误时，直接覆盖最后一条的占位内容为报错信息
            const currentHistory = [...chatHistory.val];
            currentHistory[currentHistory.length - 1] = {
                role: "assistant",
                content: `❌ 出错了: ${err.message}`
            };
            chatHistory.val = currentHistory;
        } finally {
            isResponding.val = false;
        }
    };
    const clearHistory = () => {
        chatHistory.val = [];
        localStorage.removeItem("ollama_chat_history");
    };

    // --- 视图渲染分流 ---
    return van.tags.main({ class: "blog" }, [
        van.tags.h1("Ollama Chat"),

        // 未授权面板
        () => !isAuthorized.val ? van.tags.div({ class: "md-card" },
            van.tags.h3("🔐 访问受限 - 请执行安全校验"),
            van.tags.p("请将下方自动生成的设备码提供给管理员，以换取通行密钥。"),

            van.tags.div({ class: "md-field" },
                // 将输入框改为只读 (readonly)，展示自动生成的设备码
                van.tags.input({
                    class: "md-input",
                    style: "background: #f0f0f0; color: #666; cursor: not-allowed;",
                    readonly: true,
                    value: deviceName
                }),
                // 添加一个快速复制按钮提升体验
                van.tags.button({
                    class: "md-btn",
                    style: "position: absolute; right: 4px; top: 4px; padding: 6px 12px; font-size: 12px;",
                    onclick: () => navigator.clipboard.writeText(deviceName.val).then(() => alert("设备码已复制！"))
                }, "复制设备码")
            ),

            van.tags.div({ class: "md-field" },
                van.tags.input({
                    class: "md-input", type: "password", placeholder: "请输入管理员下发的通行密钥 (SHA-256)",
                    value: accessKey, oninput: e => accessKey.val = e.target.value
                })
            ),
            van.tags.button({ class: "md-btn", onclick: handleVerify }, "验证通行权限"),
            () => authError.val ? van.tags.p({ style: "color: #B3261E; margin-top: 12px;" }, authError.val) : ""
        ) : "",

        // 已授权面板
        () => isAuthorized.val ? van.tags.div({ class: "md-card" },
            van.tags.h3("⚙️ 模型配置与交互"),

            // 模型选择器
            van.tags.div({ class: "md-field" },
                van.tags.label({ style: "display:block; margin-bottom:8px; font-weight:500;" }, "选择运行的模型："),
                van.tags.select({
                    class: "md-input", style: "background:#fff;",
                    value: selectedModel, onchange: handleModelChange
                },
                    van.tags.option({ value: "gemma4-12b-heretic" }, "gemma4-12b-heretic (q4量化)"),
                    van.tags.option({ value: "gemma4-26b-heretic" }, "gemma4-26b-heretic (q4量化)")
                )
            ),

            // 模型特点标注
            van.tags.div({ style: "margin-bottom: 20px; font-size: 14px; background:#F7F2FA; padding:12px; border-radius:8px;" },
                () => selectedModel.val === "gemma4-12b-heretic"
                    ? van.tags.div(
                        van.tags.span({ class: "md-badge badge-speed" }, "⚡ 极速推理"),
                        van.tags.p({ style: "margin: 8px 0 0 8px;" }, "特点：参数量较轻，响应延迟低。但复杂长文本的准确率上限相对稍低。")
                    )
                    : van.tags.div(
                        van.tags.span({ class: "md-badge badge-accuracy" }, "🎯 高精准确"),
                        van.tags.p({ style: "margin: 8px 0 0 8px;" }, "特点：参数量大，对复杂上下文的理解能力极强。输出速度会比 12b 慢。")
                    )
            ),

            // 加载状态捕获
            () => isModelLoading.val ? van.tags.div({ class: "loader-status" },
                van.tags.div({ class: "spinner" }),
                van.tags.span("正在通知 Ollama 卸载旧模型并动态加载新模型中，请稍候...")
            ) : "",

            van.tags.hr({ style: "border:0; border-top:1px solid #eee; margin:20px 0;" }),

            // 对话区域
            van.tags.div({ class: "chat-box" },
                () => chatHistory.val.length === 0
                    ? van.tags.p({ style: "text-align:center; color:#999;" }, "暂无对话记录，发送一条消息开始吧")
                    : van.tags.div(chatHistory.val.map(msg =>
                        van.tags.div({ class: msg.role === "user" ? "msg-user" : "msg-assistant" },
                            van.tags.span(msg.content)
                        )
                    ))
            ),

            // 输入框与发送按钮
            van.tags.div({ style: "display:flex; gap:12px;" },
                van.tags.input({
                    class: "md-input", placeholder: isModelLoading.val ? "模型加载中，暂停输入..." : "说点什么吧...",
                    value: inputMessage, disabled: () => isModelLoading.val || isResponding.val,
                    oninput: e => inputMessage.val = e.target.value,
                    onkeydown: e => { if (e.key === "Enter") handleSendMessage(); }
                }),
                van.tags.button({
                    class: "md-btn",
                    disabled: () => !isAuthorized.val || isModelLoading.val || isResponding.val || !inputMessage.val.trim(),
                    onclick: handleSendMessage
                }, "发送")
            ),

            van.tags.button({
                class: "md-btn",
                style: "background: #E6E1E5; color: #49454F; margin-top: 16px; box-shadow:none;",
                onclick: clearHistory
            }, "清空本地对话缓存")
        ) : ""
    ]);
};

export const OllamaChatRouter = () => {
    return Route({
        rule: "OllamaChat",
        Loader: () => OllamaChat()
    });
};