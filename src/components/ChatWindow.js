import { useState, useEffect, useRef } from "react";
import { Send, X, User } from "lucide-react";
import { sendMessage, listenToMessages } from "../utils/firestoreService";

/**
 * A simple chat window for customers to message a restaurant.
 */
export default function ChatWindow({ restaurantId, restaurantName, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  // Listen for messages
  useEffect(() => {
    if (!restaurantId) return;
    const unsub = listenToMessages(restaurantId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [restaurantId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    
    try {
      await sendMessage(restaurantId, currentUser.uid, currentUser.displayName || "Customer", text);
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, 
      display: "flex", flexDirection: "column", background: "#fff"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px", background: "#78350F", color: "#fff", 
        display: "flex", alignItems: "center", justifyContent: "space-between" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: 6 }}>
            <User size={20}/>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{restaurantName}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Live Chat</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          <X size={24}/>
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: "#FDFCFB" }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 13 }}>
            No messages yet. Say hi to {restaurantName}!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser?.uid;
            return (
              <div key={m.id} style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: isMe ? "#78350F" : "#fff",
                color: isMe ? "#fff" : "#1C1917",
                padding: "8px 12px",
                borderRadius: isMe ? "14px 14px 0 14px" : "14px 14px 14px 0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                border: isMe ? "none" : "1px solid #F3F4F6",
                fontSize: 14
              }}>
                {m.text}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: 12, borderTop: "1px solid #F3F4F6", display: "flex", gap: 8, background: "#fff" }}>
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          style={{ 
            flex: 1, border: "1px solid #E5E7EB", borderRadius: 12, 
            padding: "10px 14px", fontSize: 14, outline: "none" 
          }}
        />
        <button 
          type="submit"
          disabled={!text.trim()}
          style={{ 
            background: "#78350F", color: "#fff", border: "none", 
            borderRadius: 12, width: 44, height: 44, 
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", opacity: text.trim() ? 1 : 0.5
          }}
        >
          <Send size={18}/>
        </button>
      </form>
    </div>
  );
}
