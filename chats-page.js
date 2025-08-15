import { auth, db } from './app.js';
import { ref, get, query, orderByChild, equalTo, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export const getChatsPageHtml = () => `
  <div class="chats-page-container">
    <div id="chat-list" class="chat-list">
      <p class="placeholder-text">Loading chats...</p>
    </div>
    <button id="new-chat-btn" class="fab" title="New Chat">
      <i class="fas fa-comment-alt"></i>
    </button>
  </div>
`;

async function loadUserChats(onChatSelected) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const chatListContainer = document.getElementById('chat-list');
    chatListContainer.innerHTML = '<p class="placeholder-text">Loading chats...</p>';

    const userChatsRef = ref(db, `users/${currentUser.uid}/chats`);
    const userChatsSnapshot = await get(userChatsRef);

    if (!userChatsSnapshot.exists()) {
        chatListContainer.innerHTML = '<p class="placeholder-text">No chats yet. Start a new one!</p>';
        return;
    }

    const chatIds = Object.keys(userChatsSnapshot.val());
    const chatPromises = chatIds.map(chatId => get(ref(db, `chats/${chatId}`)).then(snap => ({ id: chatId, ...snap.val() })));
    const chatsData = await Promise.all(chatPromises);

    const finalChatsPromises = chatsData.map(async (chat) => {
        const otherUserId = Object.keys(chat.participants || {}).find(id => id !== currentUser.uid);
        if (!otherUserId) return null;

        const userSnap = await get(ref(db, `users/${otherUserId}`));
        return { ...chat, otherUser: { id: otherUserId, ...userSnap.val() } };
    });

    let finalChats = (await Promise.all(finalChatsPromises)).filter(Boolean);
    finalChats.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
    renderChatList(finalChats, onChatSelected);
}

function renderChatList(chats, onChatSelected) {
    const chatListContainer = document.getElementById('chat-list');
    if (!chats || chats.length === 0) {
        chatListContainer.innerHTML = '<p class="placeholder-text">No chats yet. Start a new one!</p>';
        return;
    }

    chatListContainer.innerHTML = chats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}">
            <img src="${chat.otherUser.profilePicture || 'https://i.stack.imgur.com/34AD2.jpg'}" alt="Avatar" class="avatar">
            <div class="chat-item-details">
                <div class="chat-item-header">
                    <span class="chat-item-name">${chat.otherUser.fullname}</span>
                    <span class="chat-item-timestamp">${new Date(chat.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p class="chat-item-snippet">${chat.lastMessage || ''}</p>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.dataset.chatId;
            const chatData = chats.find(c => c.id === chatId);
            if (chatData && onChatSelected) {
                onChatSelected(chatId, chatData.otherUser);
            }
        });
    });
}

async function createNewChat() {
    const phone = prompt("Enter the phone number of the user you want to chat with:");
    if (!phone) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('phone'), equalTo(phone));
    const snapshot = await get(q);

    if (!snapshot.exists()) {
        alert("User not found.");
        return;
    }

    const userData = snapshot.val();
    const otherUserId = Object.keys(userData)[0];
    const otherUserData = userData[otherUserId];

    if (otherUserId === currentUser.uid) {
        alert("You can't start a chat with yourself.");
        return;
    }

    const chatId = currentUser.uid < otherUserId ? `${currentUser.uid}_${otherUserId}` : `${otherUserId}_${currentUser.uid}`;
    const chatRef = ref(db, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);

    if (chatSnapshot.exists()) {
        alert("Chat already exists.");
        // We'll navigate to the chat in a future step. For now, we do nothing.
    } else {
        const now = Date.now();
        const newChatData = {
            participants: { [currentUser.uid]: true, [otherUserId]: true },
            createdAt: now,
            lastMessage: "Chat created",
            lastMessageTimestamp: now,
        };
        await set(chatRef, newChatData);

        await set(ref(db, `users/${currentUser.uid}/chats/${chatId}`), true);
        await set(ref(db, `users/${otherUserId}/chats/${chatId}`), true);

        alert(`Chat started with ${otherUserData.fullname}!`);
        await loadUserChats(); // This will not have the callback. We need to fix this.
    }
}

export async function initChatsPage(onChatSelected) {
    console.log("Initializing chats page");
    // Re-bind the createNewChat to pass the onChatSelected callback for refresh
    document.getElementById('new-chat-btn').addEventListener('click', async () => {
        // A bit of a hacky way to refresh with the callback.
        await createNewChat();
        await loadUserChats(onChatSelected);
    });
    await loadUserChats(onChatSelected);
}
