import json
import requests
import tkinter as tk
from tkinter import scrolledtext

class ChatApp:
    def __init__(self, root):
        # 设置窗口
        self.root = root
        self.root.title("知识库聊天助手")
        self.root.geometry("600x500")
        
        # 创建聊天历史显示区域
        self.chat_history = scrolledtext.ScrolledText(root, wrap=tk.WORD, width=70, height=20)
        self.chat_history.grid(row=0, column=0, columnspan=2, padx=10, pady=10)
        self.chat_history.config(state="disabled")
        
        # 创建用户输入区域
        self.user_input = tk.Text(root, wrap=tk.WORD, width=50, height=3)
        self.user_input.grid(row=1, column=0, padx=10, pady=10)
        self.user_input.bind("<Return>", self.send_message)
        
        # 创建发送按钮
        self.send_button = tk.Button(root, text="发送", command=self.send_message)
        self.send_button.grid(row=1, column=1, padx=10, pady=10)
        
        # API配置
        self.account_id = "2101490001"  # 替换为您的账户ID
        self.g_knowledge_base_domain = "api-knowledgebase.mlp.cn-beijing.volces.com"
        self.apikey = "cfcf3cb3-fa18-487b-b5f5-00216d7bcb68"  # 替换为您的API密钥
        self.service_resource_id = "kb-service-600869b718af9700"  # 替换为您的服务资源ID
    
    def prepare_request(self, method, path, params=None, data=None, doseq=0):
        if params:
            for key in params:
                if (isinstance(params[key], int) or 
                    isinstance(params[key], float) or 
                    isinstance(params[key], bool)):
                    params[key] = str(params[key])
                elif isinstance(params[key], list):
                    if not doseq:
                        params[key] = ",".join(params[key])
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Host": self.g_knowledge_base_domain,
            'Authorization': f'Bearer {self.apikey}'
        }
        
        return {
            "method": method,
            "url": f"http://{self.g_knowledge_base_domain}{path}",
            "headers": headers,
            "data": json.dumps(data) if data is not None else None
        }
    
    def knowledge_service_chat(self, query):
        method = "POST"
        path = "/api/knowledge/service/chat"
        request_params = {
            "service_resource_id": self.service_resource_id,
            "messages": [
                {
                    "role": "user",
                    "content": query
                }
            ],
            "stream": False
        }

        req_info = self.prepare_request(method=method, path=path, data=request_params)
        
        try:
            rsp = requests.request(
                method=req_info["method"],
                url=req_info["url"],
                headers=req_info["headers"],
                data=req_info["data"]
            )
            rsp.encoding = "utf-8"
            
            response_data = json.loads(rsp.text)
            if "data" in response_data and "message" in response_data["data"]:
                return response_data["data"]["message"]["content"]
            else:
                return "抱歉，无法获取回答。" + rsp.text
        except Exception as e:
            return f"发生错误: {str(e)}"
    
    def update_chat_history(self, sender, message):
        self.chat_history.config(state="normal")
        self.chat_history.insert(tk.END, f"{sender}: {message}\n\n")
        self.chat_history.see(tk.END)
        self.chat_history.config(state="disabled")
    
    def send_message(self, event=None):
        user_message = self.user_input.get("1.0", "end-1c").strip()
        if user_message:
            # 清空输入框
            self.user_input.delete("1.0", tk.END)
            
            # 显示用户消息
            self.update_chat_history("你", user_message)
            
            # 获取AI回复
            ai_response = self.knowledge_service_chat(user_message)
            
            # 显示AI回复
            self.update_chat_history("AI", ai_response)
        
        # 阻止回车键的默认行为（在文本框中换行）
        return "break"

# 创建应用
if __name__ == "__main__":
    root = tk.Tk()
    app = ChatApp(root)
    root.mainloop()
