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

// 辅助函数：检测 LocalStorage 剩余空间是否小于 10%
const checkStorageCapacity = () => {
    let totalBytes = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            // 字符串长度 * 2 (UTF-16 每个字符 2 字节)
            totalBytes += (localStorage[key].length + key.length) * 2;
        }
    }
    const maxBytes = 5 * 1024 * 1024; // 大多数浏览器限制为 5MB
    if (totalBytes > maxBytes * 0.9) {
        alert("⚠️ 本地存储空间剩余不足 10%，请及时清理废旧不用的 Session！");
    }
};

// Ollama API 基础路径
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
    const deviceName = van.state(getOrGenerateDeviceId());
    const accessKey = van.state("");
    const isAuthorized = van.state(localStorage.getItem("ollama_auth_passed") === "true");
    const authError = van.state("");

    const selectedModel = van.state("gemma4-12b-heretic");
    const previousModel = van.state("");
    const isModelLoading = van.state(false);
    const inputMessage = van.state("");
    const isResponding = van.state(false);

    // --- Session 管理初始化 ---
    const initSessions = () => {
        const storedSessions = localStorage.getItem("ollama_sessions");
        if (storedSessions) {
            return JSON.parse(storedSessions);
        }
        // 兼容旧版代码，将旧的 chatHistory 迁移到默认 Session 中
        const legacyHistory = localStorage.getItem("ollama_chat_history");
        const defaultSession = {
            id: Date.now().toString(),
            title: "新会话",
            messages: legacyHistory ? JSON.parse(legacyHistory) : []
        };
        return [defaultSession];
    };

    const sessions = van.state(initSessions());
    const activeSessionId = van.state(localStorage.getItem("ollama_active_session") || sessions.val[0].id);

    // 辅助获取当前激活的会话消息列表
    const getActiveMessages = () => {
        const active = sessions.val.find(s => s.id === activeSessionId.val);
        return active ? active.messages : [];
    };

    // 保存所有会话数据并检测容量
    const saveSessionsData = (newSessions) => {
        sessions.val = newSessions;
        localStorage.setItem("ollama_sessions", JSON.stringify(newSessions));
        checkStorageCapacity();
    };

    // --- 样式定义 ---
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
    .chat-box { max-height: 400px; min-height: 200px; overflow-y: auto; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; background: #F5F5F5; margin-bottom: 16px; }
    .msg-user { text-align: right; margin-bottom: 12px; }
    .msg-user span { background: #D0BCFF; padding: 8px 14px; border-radius: 16px 16px 2px 16px; display: inline-block; max-width: 70%; word-break: break-all; }
    .msg-assistant { text-align: left; margin-bottom: 12px; }
    .msg-assistant span { background: #E3E3E3; padding: 8px 14px; border-radius: 16px 16px 16px 2px; display: inline-block; max-width: 70%; word-break: break-all; white-space: pre-wrap; }
    .loader-status { color: #6750A4; font-weight: bold; display: flex; align-items: center; gap: 8px; margin: 10px 0; }
    .spinner { width: 16px; height: 16px; border: 2px solid #6750A4; border-top-color: transparent; border-radius: 50%; animation: spin 1s infinite linear; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* 新增 Session 管理区域样式 */
    .session-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #E0E0E0; }
    .session-bar::-webkit-scrollbar { height: 4px; }
    .session-bar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    .session-chip { background: #E6E1E5; color: #49454F; border: none; padding: 6px 16px; border-radius: 16px; cursor: pointer; white-space: nowrap; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; gap: 8px; font-weight: 500;}
    .session-chip.active { background: #6750A4; color: white; }
    .session-chip .del-btn { background: transparent; border: none; color: inherit; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; opacity: 0.7; }
    .session-chip .del-btn:hover { opacity: 1; transform: scale(1.1); }
  `;

    if (!document.getElementById("md-ollama-styles")) {
        const styleEl = van.tags.style({ id: "md-ollama-styles" }, styles);
        document.head.appendChild(styleEl);
    }

    // --- 业务逻辑 ---

    // 1. Session 操作
    const createNewSession = () => {
        const newId = Date.now().toString();
        const newSession = { id: newId, title: "新会话", messages: [] };
        saveSessionsData([newSession, ...sessions.val]);
        activeSessionId.val = newId;
        localStorage.setItem("ollama_active_session", newId);
    };

    const switchSession = (id) => {
        if (isResponding.val) return; // 正在回复时禁止切换
        activeSessionId.val = id;
        localStorage.setItem("ollama_active_session", id);
    };

    const deleteSession = (id) => {
        if (isResponding.val) return;
        const newSessions = sessions.val.filter(s => s.id !== id);

        // 如果删光了，自动创建一个新的
        if (newSessions.length === 0) {
            const newId = Date.now().toString();
            newSessions.push({ id: newId, title: "新会话", messages: [] });
            activeSessionId.val = newId;
        } else if (activeSessionId.val === id) {
            // 如果删除的是当前处于激活状态的会话，默认切换到第一个
            activeSessionId.val = newSessions[0].id;
        }

        localStorage.setItem("ollama_active_session", activeSessionId.val);
        saveSessionsData(newSessions);
    };

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

    const handleModelChange = async (e) => {
        if (selectedModel.val === e.target.value) return;
        previousModel.val = selectedModel.val;
        selectedModel.val = e.target.value;
        isModelLoading.val = true;

        try {
            if (previousModel.val) {
                await fetch(`${OLLAMA_HOST}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: previousModel.val, keep_alive: 0 })
                }).catch(err => console.log("卸载旧模型提示:", err));
            }
            await fetch(`${OLLAMA_HOST}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: selectedModel.val, prompt: "", keep_alive: -1 })
            });
        } catch (error) {
            console.error("加载模型切换异常: ", error);
        } finally {
            isModelLoading.val = false;
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.val.trim() || isResponding.val || isModelLoading.val) return;

        const userText = inputMessage.val.trim();
        let currentSessions = [...sessions.val];
        let activeIdx = currentSessions.findIndex(s => s.id === activeSessionId.val);

        // 【核心修改点】：如果这是新会话的第一条消息，用它来命名会话，最大截取前十个字
        if (currentSessions[activeIdx].messages.length === 0) {
            currentSessions[activeIdx].title = userText.substring(0, 10);
        }

        // 将用户输入推入当前激活的 session 消息列表中
        currentSessions[activeIdx].messages.push({ role: "user", content: userText });
        saveSessionsData(currentSessions); // 持久化更新 localStorage 并检查容量

        inputMessage.val = "";
        isResponding.val = true;

        // 添加一个空的 AI 响应占位
        currentSessions = [...sessions.val];
        currentSessions[activeIdx].messages.push({ role: "assistant", content: "" });
        sessions.val = currentSessions;

        // 提取发送给 API 的历史记录（排除刚才加的空占位）
        const historyForApi = currentSessions[activeIdx].messages.slice(0, -1);

        try {
            const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: selectedModel.val,
                    messages: historyForApi,
                    stream: true
                })
            });

            if (!response.ok) throw new Error(`Ollama 服务响应异常: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let assistantContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message && data.message.content) {
                            assistantContent += data.message.content;

                            // 实时更新当前激活的 Session
                            const updatedSessions = [...sessions.val];
                            const idx = updatedSessions.findIndex(s => s.id === activeSessionId.val);
                            updatedSessions[idx].messages[updatedSessions[idx].messages.length - 1].content = assistantContent;
                            sessions.val = updatedSessions;
                        }
                    } catch (parseError) {
                        console.error("JSON 解析错误，跳过此行:", line, parseError);
                    }
                }
            }

            // 流读取完毕后，统一存入 localStorage 并检查容量
            saveSessionsData(sessions.val);

        } catch (err) {
            const updatedSessions = [...sessions.val];
            const idx = updatedSessions.findIndex(s => s.id === activeSessionId.val);
            updatedSessions[idx].messages[updatedSessions[idx].messages.length - 1].content = `❌ 出错了: ${err.message}`;
            saveSessionsData(updatedSessions);
        } finally {
            isResponding.val = false;
        }
    };

    // 视图渲染
    return van.tags.main({ class: "blog" }, [
        van.tags.h1("Ollama Chat"),

        // 未授权面板
        () => !isAuthorized.val ? van.tags.div({ class: "md-card" },
            van.tags.h3("🔐 访问受限 - 请执行安全校验"),
            van.tags.p("请将下方自动生成的设备码提供给管理员，以换取通行密钥。"),
            van.tags.div({ class: "md-field" },
                van.tags.input({
                    class: "md-input",
                    style: "background: #f0f0f0; color: #666; cursor: not-allowed;",
                    readonly: true,
                    value: deviceName
                }),
                van.tags.button({
                    class: "md-btn",
                    style: "position: absolute; right: 4px; top: 4px; padding: 6px 12px; font-size: 12px;",
                    onclick: () => navigator.clipboard.writeText(deviceName.val).then(() => alert("设备码已复制！"))
                }, "复制设备码")
            ),
            van.tags.div({ class: "md-field" },
                van.tags.input({
                    class: "md-input", type: "password", placeholder: "请输入管理员下发的通行密钥",
                    value: accessKey, oninput: e => accessKey.val = e.target.value
                })
            ),
            van.tags.button({ class: "md-btn", onclick: handleVerify }, "验证通行权限"),
            () => authError.val ? van.tags.p({ style: "color: #B3261E; margin-top: 12px;" }, authError.val) : ""
        ) : "",

        // 已授权面板
        () => isAuthorized.val ? van.tags.div({ class: "md-card" },
            van.tags.h3("⚙️ 模型配置与交互"),

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

            van.tags.div({ style: "margin-bottom: 20px; font-size: 14px; background:#F7F2FA; padding:12px; border-radius:8px;" },
                () => selectedModel.val === "gemma4-12b-heretic"
                    ? van.tags.div(
                        van.tags.span({ class: "md-badge badge-speed" }, "⚡ 极速推理"),
                        van.tags.p({ style: "margin: 8px 0 0 8px; font-size: 15px" }, "特点：参数量较轻，响应延迟低。但复杂长文本的准确率上限相对稍低。")
                    )
                    : van.tags.div(
                        van.tags.span({ class: "md-badge badge-accuracy" }, "🎯 高精准确"),
                        van.tags.p({ style: "margin: 8px 0 0 8px; font-size: 15px" }, "特点：参数量大，对复杂上下文的理解能力极强。输出速度会比 12b 慢。")
                    )
            ),

            () => isModelLoading.val ? van.tags.div({ class: "loader-status" },
                van.tags.div({ class: "spinner" }),
                van.tags.span("正在通知 Ollama 卸载旧模型并动态加载新模型中，请稍候...")
            ) : "",

            van.tags.hr({ style: "border:0; border-top:1px solid #eee; margin:20px 0;" }),

            // --- 新增：Session 管理工具栏 ---
            van.tags.div({ class: "session-bar" },
                van.tags.button({
                    class: "md-btn",
                    style: "padding: 6px 14px; font-size: 14px; margin-right: 8px; flex-shrink: 0; background: #E8DEF8; color: #4F378B;",
                    onclick: createNewSession
                }, "＋ 新建 Session"),

                // 渲染所有 Session Tag
                () => van.tags.div({ style: "display: flex; gap: 8px; align-items: center;" },
                    sessions.val.map(session => van.tags.div(
                        {
                            class: () => "session-chip" + (activeSessionId.val === session.id ? " active" : ""),
                            onclick: () => switchSession(session.id)
                        },
                        van.tags.span(session.title),
                        van.tags.button({
                            class: "del-btn",
                            onclick: (e) => {
                                e.stopPropagation();
                                if (confirm(`确定删除会话 "${session.title}" 吗？`)) deleteSession(session.id);
                            },
                            title: "删除会话"
                        }, "×")
                    ))
                )
            ),

            // 对话区域 (动态渲染当前激活的 Session 消息)
            van.tags.div({ class: "chat-box" },
                () => {
                    const currentMessages = getActiveMessages();
                    return currentMessages.length === 0
                        ? van.tags.p({ style: "text-align:center; color:#999; margin-top: 40px;" }, "暂无对话记录，发送一条消息开始吧")
                        : van.tags.div(currentMessages.map(msg =>
                            van.tags.div({ class: msg.role === "user" ? "msg-user" : "msg-assistant" },
                                van.tags.span(msg.content)
                            )
                        ))
                }
            ),

            van.tags.div({ style: "display:flex; gap:12px;" },
                van.tags.input({
                    class: "md-input", placeholder: () => isModelLoading.val ? "模型加载中，暂停输入..." : "说点什么吧...",
                    value: inputMessage, disabled: () => isModelLoading.val || isResponding.val,
                    oninput: e => inputMessage.val = e.target.value,
                    onkeydown: e => { if (e.key === "Enter") handleSendMessage(); }
                }),
                van.tags.button({
                    class: "md-btn",
                    disabled: () => !isAuthorized.val || isModelLoading.val || isResponding.val || !inputMessage.val.trim(),
                    onclick: handleSendMessage
                }, "发送")
            )
        ) : ""
    ]);
};

export const OllamaChatRouter = () => {
    return Route({
        rule: "OllamaChat",
        Loader: () => OllamaChat()
    });
};