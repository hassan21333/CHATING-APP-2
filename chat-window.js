import { auth, db } from './app.js';
import { ref, push, update, onChildAdded, query, orderByChild, onValue, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export const getChatWindowHtml = (otherUser) => `
  <div class="chat-window-container">
    <header class="chat-header">
      <button id="back-to-chats-btn" class="back-btn" title="Back to chats"><i class="fas fa-arrow-left"></i></button>
      <img src="${otherUser.profilePicture || 'https://i.stack.imgur.com/34AD2.jpg'}" alt="Avatar" class="avatar">
      <div class="chat-header-info">
        <h3>${otherUser.fullname}</h3>
        <p>offline</p>
      </div>
    </header>
    <main id="message-area" class="message-area">
      <div id="message-list"></div>
    </main>
    <form id="message-form" class="message-input-form">
      <label for="image-upload-input" class="input-action-btn" title="Attach Image">
        <i class="fas fa-paperclip"></i>
      </label>
      <input type="file" id="image-upload-input" class="hidden" accept="image/*">
      <input type="text" id="message-input" placeholder="Type a message..." autocomplete="off">
      <button type="submit" id="send-btn" class="input-action-btn hidden" title="Send">
        <i class="fas fa-paper-plane"></i>
      </button>
      <button type="button" id="mic-btn" class="input-action-btn" title="Record Voice">
        <i class="fas fa-microphone"></i>
      </button>
    </form>
  </div>
`;

// --- Media Handling ---
async function resizeImage(file, maxSize = 800) { /* ... (implementation unchanged) ... */ }
async function handleImageUpload(event, chatId) { /* ... (implementation unchanged) ... */ }
// --- Voice Recording ---
let mediaRecorder;
let audioChunks = [];
async function startRecording() { /* ... (implementation unchanged) ... */ }
function stopRecording(chatId) { /* ... (implementation unchanged) ... */ }

// --- Core Messaging ---

function renderMessage(message, messageId) {
    const messageList = document.getElementById('message-list');
    if (!messageList) return;

    const isOutgoing = message.senderId === auth.currentUser.uid;

    const wrapper = document.createElement('div');
    wrapper.className = `message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;
    wrapper.dataset.timestamp = message.timestamp; // For read receipt check
    wrapper.id = `msg-wrapper-${messageId}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

    switch (message.type) {
        case 'image':
            bubble.classList.add('media');
            bubble.innerHTML = `<img src="${message.imageUrl}" alt="Sent image">`;
            break;
        case 'audio':
            bubble.innerHTML = `<audio controls src="${message.audioUrl}"></audio>`;
            break;
        default:
            bubble.textContent = message.text;
    }

    const metaWrapper = document.createElement('div');
    metaWrapper.className = 'message-meta';

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaWrapper.appendChild(timestamp);

    if (isOutgoing) {
        const receipt = document.createElement('span');
        receipt.className = 'read-receipt';
        receipt.id = `receipt-${messageId}`;
        receipt.innerHTML = '✓'; // Sent
        metaWrapper.appendChild(receipt);
    }

    wrapper.appendChild(bubble);
    wrapper.appendChild(metaWrapper);
    messageList.prepend(wrapper);
}

async function sendMessage(chatId, message, lastMessageText) {
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const newMessageRef = await push(messagesRef, message);

    await update(ref(db, `chats/${chatId}`), {
        lastMessage: lastMessageText || message.text,
        lastMessageTimestamp: message.timestamp,
        [`lastRead/${auth.currentUser.uid}`]: message.timestamp // Mark my own message as read
    });
}

export function initChatWindow(chatId, otherUser, onBack) {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const imageUploadInput = document.getElementById('image-upload-input');

    // --- UI Event Listeners ---
    imageUploadInput.addEventListener('change', (e) => handleImageUpload(e, chatId));
    micBtn.addEventListener('mousedown', startRecording);
    micBtn.addEventListener('mouseup', () => stopRecording(chatId));
    micBtn.addEventListener('mouseleave', () => stopRecording(chatId));
    document.getElementById('back-to-chats-btn').addEventListener('click', onBack);

    // --- REAL-TIME LISTENERS & State ---
    let otherUserOnlineStatus = null;
    let isOtherUserTyping = false;
    const statusEl = document.querySelector('.chat-header-info p');

    function updateStatusUI() {
        if (!statusEl) return;
        if (isOtherUserTyping) {
            statusEl.textContent = 'typing...';
            statusEl.classList.add('typing');
            statusEl.classList.remove('online');
        } else if (otherUserOnlineStatus && otherUserOnlineStatus.state === 'online') {
            statusEl.textContent = 'online';
            statusEl.classList.remove('typing');
            statusEl.classList.add('online');
        } else {
            const lastChanged = otherUserOnlineStatus?.last_changed;
            const lastSeen = lastChanged ? `last seen ${new Date(lastChanged).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'offline';
            statusEl.textContent = lastSeen;
            statusEl.classList.remove('typing');
            statusEl.classList.remove('online');
        }
    }

    // Listen for Online Status
    const otherUserStatusRef = ref(db, '/status/' + otherUser.id);
    onValue(otherUserStatusRef, (snapshot) => {
        otherUserOnlineStatus = snapshot.val();
        updateStatusUI();
    });

    // Listen for Typing Status
    const otherUserTypingRef = ref(db, `typing_status/${chatId}/${otherUser.id}`);
    onValue(otherUserTypingRef, (snapshot) => {
        isOtherUserTyping = snapshot.exists() && snapshot.val() === true;
        updateStatusUI();
    });

    // Listen for Read Receipts
    const otherUserLastReadRef = ref(db, `chats/${chatId}/lastRead/${otherUser.id}`);
    onValue(otherUserLastReadRef, (snapshot) => {
        const lastReadTime = snapshot.val();
        if (!lastReadTime) return;
        document.querySelectorAll('.message-bubble-wrapper.outgoing').forEach(msgWrapper => {
            const msgTime = parseInt(msgWrapper.dataset.timestamp, 10);
            if (msgTime <= lastReadTime) {
                const receiptEl = msgWrapper.querySelector('.read-receipt');
                if (receiptEl) {
                    receiptEl.classList.add('read');
                    receiptEl.innerHTML = '✓✓';
                }
            }
        });
    });

    // Listen for new messages
    const messagesRef = query(ref(db, `chats/${chatId}/messages`), orderByChild('timestamp'));
    onChildAdded(messagesRef, (snapshot) => {
        renderMessage(snapshot.val(), snapshot.key);
        // As we get new messages, if we are focused, mark them as read
        if (document.hasFocus()) {
            set(ref(db, `chats/${chatId}/lastRead/${auth.currentUser.uid}`), Date.now());
        }
    });

    // --- Broadcast Typing & Handle Sending ---
    let typingTimeout;
    const typingRef = ref(db, `typing_status/${chatId}/${auth.currentUser.uid}`);
    messageInput.addEventListener('input', () => {
        const hasText = messageInput.value.trim() !== '';
        sendBtn.classList.toggle('hidden', !hasText);
        micBtn.classList.toggle('hidden', hasText);
        if (hasText) {
            set(typingRef, true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => set(typingRef, false), 2000);
        } else {
            clearTimeout(typingTimeout);
            set(typingRef, false);
        }
    });
    messageInput.dispatchEvent(new Event('input'));

    document.getElementById('message-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text === '') return;
        clearTimeout(typingTimeout);
        set(typingRef, false);
        const message = { type: 'text', text, senderId: auth.currentUser.uid, timestamp: Date.now() };
        await sendMessage(chatId, message);
        messageInput.value = '';
        messageInput.dispatchEvent(new Event('input'));
    });

    // Initial check to mark all currently loaded messages as read
    set(ref(db, `chats/${chatId}/lastRead/${auth.currentUser.uid}`), Date.now());
}
// Note: The unchanged media functions are not shown here for brevity, but they are part of the file.
// I need to make sure I don't delete them. I will re-read the file and replace only the initChatWindow and renderMessage functions.
// No, the previous `replace_with_git_merge_diff` replaces the whole file. I need to get the whole file content and then do the replacement.
// I will just overwrite the whole file with the full content including the unchanged media functions.

// The full file content with all changes:
const fullFileContent = `
import { auth, db } from './app.js';
import { ref, push, update, onChildAdded, query, orderByChild, onValue, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export const getChatWindowHtml = (otherUser) => \`
  <div class="chat-window-container">
    <header class="chat-header">
      <button id="back-to-chats-btn" class="back-btn" title="Back to chats"><i class="fas fa-arrow-left"></i></button>
      <img src="\${otherUser.profilePicture || 'https://i.stack.imgur.com/34AD2.jpg'}" alt="Avatar" class="avatar">
      <div class="chat-header-info">
        <h3>\${otherUser.fullname}</h3>
        <p>offline</p>
      </div>
    </header>
    <main id="message-area" class="message-area">
      <div id="message-list"></div>
    </main>
    <form id="message-form" class="message-input-form">
      <label for="image-upload-input" class="input-action-btn" title="Attach Image">
        <i class="fas fa-paperclip"></i>
      </label>
      <input type="file" id="image-upload-input" class="hidden" accept="image/*">
      <input type="text" id="message-input" placeholder="Type a message..." autocomplete="off">
      <button type="submit" id="send-btn" class="input-action-btn hidden" title="Send">
        <i class="fas fa-paper-plane"></i>
      </button>
      <button type="button" id="mic-btn" class="input-action-btn" title="Record Voice">
        <i class="fas fa-microphone"></i>
      </button>
    </form>
  </div>
\`;

// --- Media Handling ---

async function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleImageUpload(event, chatId) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const resizedImageUrl = await resizeImage(file);
        const message = {
            type: 'image',
            imageUrl: resizedImageUrl,
            senderId: auth.currentUser.uid,
            timestamp: Date.now(),
        };
        await sendMessage(chatId, message, '📷 Image');
    } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to send image.");
    }
}

// --- Voice Recording ---
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.start();
        document.getElementById('mic-btn').classList.add('recording');
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access is required for voice messages.");
    }
}

function stopRecording(chatId) {
    return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            return resolve();
        }
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                const message = {
                    type: 'audio',
                    audioUrl: base64String,
                    senderId: auth.currentUser.uid,
                    timestamp: Date.now(),
                };
                await sendMessage(chatId, message, '🎤 Voice Message');
                resolve();
            };
            reader.readAsDataURL(audioBlob);
            audioChunks = [];
            document.getElementById('mic-btn').classList.remove('recording');
        };
        mediaRecorder.stop();
    });
}


// --- Core Messaging ---

function renderMessage(message, messageId) {
    const messageList = document.getElementById('message-list');
    if (!messageList) return;

    const isOutgoing = message.senderId === auth.currentUser.uid;

    const wrapper = document.createElement('div');
    wrapper.className = \`message-bubble-wrapper \${isOutgoing ? 'outgoing' : 'incoming'}\`;
    wrapper.dataset.timestamp = message.timestamp;
    wrapper.id = \`msg-wrapper-\${messageId}\`;

    const bubble = document.createElement('div');
    bubble.className = \`message-bubble \${isOutgoing ? 'outgoing' : 'incoming'}\`;

    switch (message.type) {
        case 'image':
            bubble.classList.add('media');
            bubble.innerHTML = \`<img src="\${message.imageUrl}" alt="Sent image">\`;
            break;
        case 'audio':
            bubble.innerHTML = \`<audio controls src="\${message.audioUrl}"></audio>\`;
            break;
        default:
            bubble.textContent = message.text;
    }

    const metaWrapper = document.createElement('div');
    metaWrapper.className = 'message-meta';

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaWrapper.appendChild(timestamp);

    if (isOutgoing) {
        const receipt = document.createElement('span');
        receipt.className = 'read-receipt';
        receipt.id = \`receipt-\${messageId}\`;
        receipt.innerHTML = '✓'; // Sent
        metaWrapper.appendChild(receipt);
    }

    wrapper.appendChild(bubble);
    wrapper.appendChild(metaWrapper);
    messageList.prepend(wrapper);
}

async function sendMessage(chatId, message, lastMessageText) {
    const messagesRef = ref(db, \`chats/\${chatId}/messages\`);
    await push(messagesRef, message);

    await update(ref(db, \`chats/\${chatId}\`), {
        lastMessage: lastMessageText || message.text,
        lastMessageTimestamp: message.timestamp,
        [\`lastRead/\${auth.currentUser.uid}\`]: message.timestamp
    });
}

export function initChatWindow(chatId, otherUser, onBack) {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const imageUploadInput = document.getElementById('image-upload-input');

    // --- UI Event Listeners ---
    imageUploadInput.addEventListener('change', (e) => handleImageUpload(e, chatId));
    micBtn.addEventListener('mousedown', startRecording);
    micBtn.addEventListener('mouseup', () => stopRecording(chatId));
    micBtn.addEventListener('mouseleave', () => stopRecording(chatId));
    document.getElementById('back-to-chats-btn').addEventListener('click', onBack);

    // --- REAL-TIME LISTENERS & State ---
    let otherUserOnlineStatus = null;
    let isOtherUserTyping = false;
    const statusEl = document.querySelector('.chat-header-info p');

    function updateStatusUI() {
        if (!statusEl) return;
        if (isOtherUserTyping) {
            statusEl.textContent = 'typing...';
            statusEl.classList.add('typing');
            statusEl.classList.remove('online');
        } else if (otherUserOnlineStatus && otherUserOnlineStatus.state === 'online') {
            statusEl.textContent = 'online';
            statusEl.classList.remove('typing');
            statusEl.classList.add('online');
        } else {
            const lastChanged = otherUserOnlineStatus?.last_changed;
            const lastSeen = lastChanged ? \`last seen \${new Date(lastChanged).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : 'offline';
            statusEl.textContent = lastSeen;
            statusEl.classList.remove('typing');
            statusEl.classList.remove('online');
        }
    }

    // Listen for Online Status
    const otherUserStatusRef = ref(db, \`/status/\${otherUser.id}\`);
    onValue(otherUserStatusRef, (snapshot) => {
        otherUserOnlineStatus = snapshot.val();
        updateStatusUI();
    });

    // Listen for Typing Status
    const otherUserTypingRef = ref(db, \`typing_status/\${chatId}/\${otherUser.id}\`);
    onValue(otherUserTypingRef, (snapshot) => {
        isOtherUserTyping = snapshot.exists() && snapshot.val() === true;
        updateStatusUI();
    });

    // Listen for Read Receipts
    const otherUserLastReadRef = ref(db, \`chats/\${chatId}/lastRead/\${otherUser.id}\`);
    onValue(otherUserLastReadRef, (snapshot) => {
        const lastReadTime = snapshot.val();
        if (!lastReadTime) return;
        document.querySelectorAll('.message-bubble-wrapper.outgoing').forEach(msgWrapper => {
            const msgTime = parseInt(msgWrapper.dataset.timestamp, 10);
            if (msgTime <= lastReadTime) {
                const receiptEl = msgWrapper.querySelector('.read-receipt');
                if (receiptEl) {
                    receiptEl.classList.add('read');
                    receiptEl.innerHTML = '✓✓';
                }
            }
        });
    });

    // Listen for new messages
    const messagesRef = query(ref(db, \`chats/\${chatId}/messages\`), orderByChild('timestamp'));
    onChildAdded(messagesRef, (snapshot) => {
        renderMessage(snapshot.val(), snapshot.key);
        if (document.hasFocus()) {
            set(ref(db, \`chats/\${chatId}/lastRead/\${auth.currentUser.uid}\`), Date.now());
        }
    });

    // --- Broadcast Typing & Handle Sending ---
    let typingTimeout;
    const typingRef = ref(db, \`typing_status/\${chatId}/\${auth.currentUser.uid}\`);
    messageInput.addEventListener('input', () => {
        const hasText = messageInput.value.trim() !== '';
        sendBtn.classList.toggle('hidden', !hasText);
        micBtn.classList.toggle('hidden', hasText);
        if (hasText) {
            set(typingRef, true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => set(typingRef, false), 2000);
        } else {
            clearTimeout(typingTimeout);
            set(typingRef, false);
        }
    });
    messageInput.dispatchEvent(new Event('input'));

    document.getElementById('message-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text === '') return;
        clearTimeout(typingTimeout);
        set(typingRef, false);
        const message = { type: 'text', text, senderId: auth.currentUser.uid, timestamp: Date.now() };
        await sendMessage(chatId, message);
        messageInput.value = '';
        messageInput.dispatchEvent(new Event('input'));
    });

    set(ref(db, \`chats/\${chatId}/lastRead/\${auth.currentUser.uid}\`), Date.now());
}
`;
I'll use `overwrite_file_with_block` with this full content.
