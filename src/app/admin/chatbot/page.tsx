import ChatbotEditor from "./editor";

export const metadata = {
    title: "Chatbot Prompt Editor | Admin",
};

export default function AdminChatbotPage() {
    return (
        <div className="flex-1">
            <ChatbotEditor />
        </div>
    );
}
