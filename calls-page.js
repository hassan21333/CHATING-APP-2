import { auth, db } from './app.js';
import { ref, get, query, orderByChild, equalTo, push, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export const getCallsPageHtml = () => `
  <div class="calls-page-container">
    <div id="call-list" class="call-list">
      <p class="placeholder-text">No recent calls.</p>
    </div>
    <button id="new-call-btn" class="fab" title="New Call">
      <i class="fas fa-phone-plus"></i>
    </button>
  </div>
`;

function getCallStatusInfo(call, currentUserId) {
    if (call.callerId === currentUserId) {
        // It's an outgoing call from my perspective
        return { icon: 'fa-arrow-up-right', color: '#25D366' }; // Green arrow out
    } else {
        // It's an incoming call from my perspective
        if (call.status === 'missed') {
            return { icon: 'fa-arrow-down-left', color: '#FF0000' }; // Red arrow in
        }
        return { icon: 'fa-arrow-down-left', color: '#34B7F1' }; // Blue arrow in
    }
}

function renderCallList(calls) {
    const callListContainer = document.getElementById('call-list');
    const currentUserId = auth.currentUser.uid;

    if (!calls || calls.length === 0) {
        callListContainer.innerHTML = '<p class="placeholder-text">No recent calls.</p>';
        return;
    }

    callListContainer.innerHTML = calls.map(call => {
        const otherUser = call.callerId === currentUserId ? call.receiver : call.caller;
        const statusInfo = getCallStatusInfo(call, currentUserId);
        return `
            <div class="call-item">
                <img src="${otherUser.profilePicture || 'https://i.stack.imgur.com/34AD2.jpg'}" alt="Avatar" class="avatar">
                <div class="call-item-details">
                    <span class="call-item-name" style="${statusInfo.color === '#FF0000' ? 'color: red;' : ''}">${otherUser.fullname}</span>
                    <div class="call-item-meta">
                        <i class="fas ${statusInfo.icon}" style="color: ${statusInfo.color};"></i>
                        <span>${new Date(call.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <i class="fas ${call.type === 'video' ? 'fa-video' : 'fa-phone'}" style="color: #075E54; cursor: pointer;" title="Call back"></i>
            </div>
        `;
    }).join('');
}

async function loadCallHistory() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const callListContainer = document.getElementById('call-list');
    callListContainer.innerHTML = '<p class="placeholder-text">Loading call history...</p>';

    const userCallsRef = ref(db, `users/${currentUser.uid}/calls`);
    const userCallsSnapshot = await get(userCallsRef);

    if (!userCallsSnapshot.exists()) {
        callListContainer.innerHTML = '<p class="placeholder-text">No recent calls.</p>';
        return;
    }

    const callIds = Object.keys(userCallsSnapshot.val());
    const callPromises = callIds.map(callId => get(ref(db, `calls/${callId}`)).then(snap => ({ id: callId, ...snap.val() })));
    let callsData = await Promise.all(callPromises);

    const finalCallsPromises = callsData.map(async (call) => {
        if (!call.callerId || !call.receiverId) return null;
        const callerSnap = await get(ref(db, `users/${call.callerId}`));
        const receiverSnap = await get(ref(db, `users/${call.receiverId}`));
        return {
            ...call,
            caller: { id: call.callerId, ...callerSnap.val() },
            receiver: { id: call.receiverId, ...receiverSnap.val() }
        };
    });

    let finalCalls = (await Promise.all(finalCallsPromises)).filter(Boolean);
    finalCalls.sort((a, b) => b.timestamp - a.timestamp);
    renderCallList(finalCalls);
}

async function createNewCall() {
    const phone = prompt("Enter the phone number of the user to call:");
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

    if (otherUserId === currentUser.uid) {
        alert("You can't call yourself.");
        return;
    }

    const callType = confirm("Make a video call? (Cancel for voice call)") ? 'video' : 'voice';

    const newCallRef = push(ref(db, 'calls'));
    const newCallData = {
        callerId: currentUser.uid,
        receiverId: otherUserId,
        timestamp: Date.now(),
        type: callType,
        status: 'outgoing', // For simplicity, we just log it as a completed outgoing call.
                           // A real implementation would have ringing, answered, missed statuses.
    };
    await set(newCallRef, newCallData);

    const callId = newCallRef.key;
    await set(ref(db, `users/${currentUser.uid}/calls/${callId}`), true);
    await set(ref(db, `users/${otherUserId}/calls/${callId}`), true);

    alert(`Calling ${userData[otherUserId].fullname}... (This is a simulation and only logs the call)`);
    await loadCallHistory();
}

export async function initCallsPage() {
    document.getElementById('new-call-btn').addEventListener('click', createNewCall);
    await loadCallHistory();
}
