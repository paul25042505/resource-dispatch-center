import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, enableIndexedDbPersistence, collection, doc, addDoc, setDoc,
    updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXq7TwBQB0kStv2RsqDl8bzTkrlly8ADg",
    authDomain: "resource-dispatch-center-92600.firebaseapp.com",
    projectId: "resource-dispatch-center-92600",
    storageBucket: "resource-dispatch-center-92600.firebasestorage.app",
    messagingSenderId: "918583881592",
    appId: "1:918583881592:web:6561383b516bc8e11c228d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 啟用離線持久化；多分頁同時開啟或瀏覽器不支援時會失敗，不影響其餘功能，僅記錄警告。
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('離線持久化未啟用：偵測到多個分頁同時開啟本頁面。');
        } else if (err.code === 'unimplemented') {
            console.warn('目前瀏覽器不支援離線持久化。');
        } else {
            console.warn('啟用離線持久化時發生錯誤', err);
        }
    });
} catch (err) {
    console.warn('啟用離線持久化時發生錯誤', err);
}

// 版本紀錄（與 index.html 開頭 Change Log 註解同步維護）
const CHANGELOG = [
    {
        version: "v0.0.14",
        notes: "入庫登錄選擇「自有物資」時，不再需要（也不會顯示）借入方式欄位，因為自己單位既有的東西沒有書面借據或口頭刷臉的問題；總表與入庫來源紀錄也會相應省略該欄位顯示。數量欄位加上 inputmode=\"numeric\"，手機點擊時會直接跳出純數字鍵盤。登錄借入成功後會跳出「✅ 登錄完成」提示框。"
    },
    {
        version: "v0.0.13",
        notes: "修正編輯入庫紀錄時，把修正過的物品/來源文字誤加進設定頁快捷選取清單的問題。編輯單純是修正錯字或調整既有紀錄，不應該產生新的快捷選項；只有新增入庫/領用/歸還時才會自動記錄快捷選項。"
    },
    {
        version: "v0.0.12",
        notes: "手機下拉重新整理手勢改為直接重新載入整個網頁（window.location.reload），取代原本只在背景靜默同步 Firestore 資料的方式，行為更符合一般下拉刷新的預期。"
    },
    {
        version: "v0.0.11",
        notes: "修正「⋮」選單在清單捲動範圍內被裁切、看不到編輯/刪除按鈕的問題：改為底部彈出的操作列（跟編輯/版本紀錄彈窗同一種呈現方式），不會再被清單的捲動容器裁掉。"
    },
    {
        version: "v0.0.10",
        notes: "入庫來源紀錄每一筆新增「⋮」選單，可以編輯或刪除該筆紀錄。編輯會開啟彈窗表單，可修改物品、來源類型、來源/存放位置、數量、借入方式（含其他說明）與備註；刪除前會先跳出確認視窗。"
    },
    {
        version: "v0.0.9",
        notes: "瀏覽畫面停用手機的雙指縮放/放大手勢，操作更像原生 App。物資總表卡片的來源明細，在🌐/🏠圖示前面補上物品名稱，跟入庫來源紀錄的呈現方式一致。"
    },
    {
        version: "v0.0.8",
        notes: "物資總表新增篩選列：可依物品名稱關鍵字搜尋，或選擇小組直接列出該小組目前持有中（已領未還）的所有物品與數量。底部導覽列的「小組管理」分頁改名為「設定」；快捷選取清單管理的物品／來源單位／經辦人員三個分類改為可收合卡片，預設收合並顯示項目數量，點開才看到完整清單與新增/編輯/刪除/排序，避免清單越加越長讓頁面過度冗長。"
    },
    {
        version: "v0.0.7",
        notes: "物品／來源單位／經辦人員的快捷選取，由按鈕列改為下拉選單，物品類的選單會在每個選項後面附註「（庫房剩餘：X 件）」，選取前就能比較各物品的庫存量。入庫登錄的來源欄位改為依「來源類型」動態顯示：外部借入顯示「外部單位名稱」，自有物資則顯示「存放位置」，物資總表的來源明細也會標示對應的存放位置／來源文字，方便日後尋找自有物資的實際擺放處。"
    },
    {
        version: "v0.0.6",
        notes: "入庫登錄的借入方式新增「其他」選項，選取後會多跳出一個文字框讓你填寫自訂說明。領用簽收表單在輸入/選取物品名稱後，會即時顯示「目前庫房剩餘」數量；歸還登記表單在輸入物品名稱與選擇小組後，會即時顯示該小組目前領用中尚未歸還的數量，填寫前就知道可以填多少。若送出的數量超過可用量，會先跳出確認視窗而不是直接擋下，避免因為系統資料誤差而卡住現場作業。"
    },
    {
        version: "v0.0.5",
        notes: "修正「專案管理」新增／刪除無回應的問題：新增專案、新增小組原本沒有錯誤處理，Firestore 寫入被拒絕時會完全無聲失敗；讀取專案清單的監聽器也沒有錯誤回呼，權限被拒時會卡在「資料庫同步中...」不會顯示原因。現在所有失敗都會跳出明確錯誤訊息（含 permission-denied 時提示檢查 Firestore 安全性規則），並在專案清單讀取失敗時於畫面上顯示錯誤提示。"
    },
    {
        version: "v0.0.4",
        notes: "入庫登錄新增「來源類型」欄位，區分🌐外部借入（跟外單位借，如302旅）與🏠自有物資（本單位既有的東西），物資總表的來源明細會顯示對應標籤。所有物資進出（入庫／領用／歸還）都會透過 Firestore transaction 自動配發全專案共用的流水單號，總表的來源明細與分配明細前面會標示單號方便查核追蹤。"
    },
    {
        version: "v0.0.3",
        notes: "大規模重構為「多專案階層式管理平台」：新增 Level 0 專案主控台（新增／刪除專案），點入專案後進入 Level 1，提供物資總表／進出作業／小組管理三大模組，並以左上角「返回主控台」按鈕確保導覽不迷路。小組管理整合了小組名單與快捷選取清單管理（皆已改為逐專案獨立）。啟用 Firebase 離線持久化，離線時頂端連線燈號改為紅色提示；新增手機下拉重新整理手勢，可手動強制向伺服器同步最新資料。所有資料讀取皆以 projects/{currentProjectId}/... 子集合隔離，切換專案或返回主控台時會正確取消先前的監聽，避免重複監聽。既有舊資料會自動搬遷進「既有資料」預設專案。程式碼拆分為 index.html + style.css + app.js。"
    },
    {
        version: "v0.0.2",
        notes: "底部導覽列新增「設定」分頁：可檢視完整版本紀錄，並管理物品名稱／來源單位／經辦人員的快捷選取清單（新增、編輯、刪除、排序）。物資進出作業表單新增快捷選取按鈕，首次手動輸入送出後會自動儲存為快捷選項，下次可直接點選免打字。"
    },
    {
        version: "v0.0.1",
        notes: "全新古早味鄉村風 UI/UX 改版；標題更名為「資源調度所」；改為手機優先版面，新增底部導覽列與上方子選單列；按鈕與輸入框觸控面積調整至 44x44px 以上；物資總表在手機版改為卡片式檢視以提升可讀性；任務列表新增手機卡片版；修正 Firebase 重複初始化與無效 bare-specifier import 導致頁面無法執行的錯誤。"
    }
];

// 新專案（含搬遷出的「既有資料」預設專案）預設種入的小組名單
const DEFAULT_GROUPS = [
    { id: "1", name: "行政組" },
    { id: "2", name: "教管組" },
    { id: "3", name: "站上組" },
    { id: "4", name: "教管一組 (子)" },
    { id: "5", name: "教管二組 (子)" }
];

const QP_CATEGORIES = {
    item: { listId: "qpList-item" },
    source: { listId: "qpList-source" },
    person: { listId: "qpList-person" }
};
// 表單欄位對應的快捷選取分類與下拉選單；showStock 的欄位會在選項後附註目前庫房剩餘
const QP_FIELD_BINDINGS = [
    { inputId: "srcItem", selectId: "qpSelect-srcItem", category: "item", showStock: true },
    { inputId: "srcUnit", selectId: "qpSelect-srcUnit", category: "source", showStock: false },
    { inputId: "allocItem", selectId: "qpSelect-allocItem", category: "item", showStock: true },
    { inputId: "allocUser", selectId: "qpSelect-allocUser", category: "person", showStock: false },
    { inputId: "retItem", selectId: "qpSelect-retItem", category: "item", showStock: true },
    { inputId: "retReceiver", selectId: "qpSelect-retReceiver", category: "person", showStock: false }
];

// ---- 全域狀態 ----
let rawProjects = [];
let currentProjectId = null;
let currentProjectName = '';
let rawSources = [], rawAllocations = [], rawReturns = [], rawGroups = [], rawQuickpicks = [];
// 目前專案底下所有 onSnapshot 的取消訂閱函式；切換／離開專案時務必全部呼叫，避免重複監聽。
let projectListeners = [];

window.addEventListener('DOMContentLoaded', async () => {
    updateConnectionStatusUI();
    renderChangeLog();
    bindGlobalEvents();
    initPullToRefresh();
    await migrateLegacyDataIfNeeded();
    setupProjectListListener();
});

window.addEventListener('online', updateConnectionStatusUI);
window.addEventListener('offline', updateConnectionStatusUI);

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
function showToast(message) {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    if (!el || !msgEl) return;
    msgEl.textContent = message;
    el.classList.remove('hidden');
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.classList.add('hidden'), 300);
    }, 1800);
}

// ============ 連線狀態 ============
function updateConnectionStatusUI() {
    const pill = document.getElementById('connStatus');
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    if (navigator.onLine) {
        pill.classList.remove('is-offline');
        pill.classList.add('is-online');
        dot.classList.remove('bg-rose-400');
        dot.classList.add('bg-emerald-400');
        text.textContent = '雲端資料庫已連線';
    } else {
        pill.classList.remove('is-online');
        pill.classList.add('is-offline');
        dot.classList.remove('bg-emerald-400');
        dot.classList.add('bg-rose-400');
        text.textContent = '離線模式：變更將於連線後自動同步';
    }
}

// ============ 舊資料一次性搬遷 ============
// 透過 meta/migration 文件搶佔遷移權，避免多個裝置同時啟動時重複搬遷。
// 目的地文件 ID 皆沿用來源文件 ID，即使意外重跑也只會覆寫、不會產生重複資料。
async function migrateLegacyDataIfNeeded() {
    const metaRef = doc(db, 'meta', 'migration');
    let shouldMigrate = false;
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(metaRef);
            if (snap.exists() && snap.data().legacyMigratedV6) {
                shouldMigrate = false;
                return;
            }
            tx.set(metaRef, { legacyMigratedV6: true, migratedAt: new Date() });
            shouldMigrate = true;
        });
    } catch (err) {
        console.warn('遷移狀態檢查失敗，略過本次遷移嘗試', err);
        return;
    }
    if (!shouldMigrate) return;

    try {
        await setDoc(doc(db, 'projects', 'default'), { name: '既有資料（預設專案）', createdAt: new Date() }, { merge: true });
        await seedDefaultGroups('default');

        const legacyCollections = ['sources', 'allocations', 'returns', 'tasks', 'quickpicks'];
        for (const colName of legacyCollections) {
            const snap = await getDocs(collection(db, colName));
            for (const docSnap of snap.docs) {
                await setDoc(doc(db, 'projects', 'default', colName, docSnap.id), docSnap.data());
            }
        }
        console.info('既有資料已搬遷至「既有資料（預設專案）」');
    } catch (err) {
        console.warn('搬遷既有資料時發生錯誤', err);
    }
}

async function seedDefaultGroups(projectId) {
    for (let i = 0; i < DEFAULT_GROUPS.length; i++) {
        const g = DEFAULT_GROUPS[i];
        await setDoc(doc(db, 'projects', projectId, 'groups', g.id), { name: g.name, order: i });
    }
}

// ============ Level 0：專案主控台 ============
function firestoreErrorMessage(context, err) {
    console.error(`[Firestore] ${context}`, err);
    if (err && err.code === 'permission-denied') {
        return `${context}失敗：Firestore 權限不足 (permission-denied)。請檢查 Firebase Console 的 Firestore 安全性規則是否允許讀寫（test mode 規則有 30 天期限，過期後會全部拒絕）。`;
    }
    return `${context}失敗：${err && err.message ? err.message : err}`;
}

function setupProjectListListener() {
    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'asc'));
    onSnapshot(qProjects, (snap) => {
        rawProjects = [];
        snap.forEach(d => rawProjects.push({ docId: d.id, ...d.data() }));
        renderProjectList();
    }, (err) => {
        const el = document.getElementById('projectList');
        if (el) el.innerHTML = `<div class="p-6 text-center text-rose-600 font-medium text-sm">⚠️ ${escapeHtml(firestoreErrorMessage('讀取專案清單', err))}</div>`;
    });
}

function renderProjectList() {
    const el = document.getElementById('projectList');
    if (rawProjects.length === 0) {
        el.innerHTML = `<div class="p-6 text-center text-[var(--brown-300)] font-medium text-sm">尚無專案，請先在上方新增一個專案。</div>`;
        return;
    }
    el.innerHTML = rawProjects.map(p => `
        <div class="project-card flex items-center gap-3 px-4 py-1">
            <button class="btn-open-project flex-1 text-left flex items-center gap-2 min-h-[44px]" data-id="${p.docId}" data-name="${escapeHtml(p.name)}">
                <span class="text-xl">📁</span>
                <span class="font-bold text-[var(--brown-900)]">${escapeHtml(p.name)}</span>
            </button>
            <button class="btn-delete-project qp-icon-btn text-rose-600" data-id="${p.docId}" data-name="${escapeHtml(p.name)}">❌</button>
        </div>
    `).join('');

    document.querySelectorAll('.btn-open-project').forEach(b => {
        b.onclick = () => enterProject(b.dataset.id, b.dataset.name);
    });
    document.querySelectorAll('.btn-delete-project').forEach(b => {
        b.onclick = () => deleteProject(b.dataset.id, b.dataset.name);
    });
}

async function addProject() {
    const input = document.getElementById('newProjectName');
    const name = input.value.trim();
    if (!name) return alert('請輸入專案名稱');
    try {
        const ref = await addDoc(collection(db, 'projects'), { name, createdAt: new Date() });
        await seedDefaultGroups(ref.id);
        input.value = '';
    } catch (err) {
        alert(firestoreErrorMessage('新增專案', err));
    }
}

async function deleteProject(projectId, projectName) {
    if (!confirm(`確定刪除專案「${projectName}」？此專案底下所有物資、進出紀錄與小組資料都會一併刪除，且無法復原。`)) return;
    const subcollections = ['sources', 'allocations', 'returns', 'groups', 'quickpicks', 'tasks', 'meta'];
    try {
        for (const colName of subcollections) {
            const snap = await getDocs(collection(db, 'projects', projectId, colName));
            for (const d of snap.docs) {
                await deleteDoc(doc(db, 'projects', projectId, colName, d.id));
            }
        }
        await deleteDoc(doc(db, 'projects', projectId));
        if (currentProjectId === projectId) exitProject();
    } catch (err) {
        alert(firestoreErrorMessage('刪除專案', err));
    }
}

// ============ Level 0 <-> Level 1 導覽 ============
function teardownProjectListeners() {
    projectListeners.forEach(unsub => unsub());
    projectListeners = [];
}

function enterProject(projectId, projectName) {
    teardownProjectListeners();
    currentProjectId = projectId;
    currentProjectName = projectName;
    rawSources = []; rawAllocations = []; rawReturns = []; rawGroups = []; rawQuickpicks = [];

    document.getElementById('currentProjectName').textContent = projectName;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-project').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');

    window.switchTab('inventory');
    window.switchSubtab('in');

    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'sources'), (snap) => {
        rawSources = []; snap.forEach(d => rawSources.push({ docId: d.id, ...d.data() }));
        calculateAndRenderInventory();
        renderSourceLog();
    }, (err) => firestoreErrorMessage('讀取物資來源', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'allocations'), (snap) => {
        rawAllocations = []; snap.forEach(d => rawAllocations.push(d.data()));
        calculateAndRenderInventory();
    }, (err) => firestoreErrorMessage('讀取領用紀錄', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'returns'), (snap) => {
        rawReturns = []; snap.forEach(d => rawReturns.push(d.data()));
        calculateAndRenderInventory();
    }, (err) => firestoreErrorMessage('讀取歸還紀錄', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'groups'), (snap) => {
        rawGroups = [];
        snap.forEach(d => rawGroups.push({ docId: d.id, ...d.data() }));
        rawGroups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        renderGroupSelects();
        renderGroupSettings();
        calculateAndRenderInventory();
    }, (err) => {
        firestoreErrorMessage('讀取小組名單', err);
        const el = document.getElementById('groupList');
        if (el) el.innerHTML = `<div class="text-xs text-rose-600 py-2">⚠️ 小組名單讀取失敗，請檢查網路連線或 Firestore 權限設定。</div>`;
    }));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'quickpicks'), (snap) => {
        rawQuickpicks = [];
        snap.forEach(d => rawQuickpicks.push({ docId: d.id, ...d.data() }));
        renderAllChips();
        renderQuickpickSettings();
    }, (err) => firestoreErrorMessage('讀取快捷選項', err)));
}

function exitProject() {
    teardownProjectListeners();
    currentProjectId = null;
    currentProjectName = '';
    document.getElementById('screen-project').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');
    document.getElementById('bottomNav').classList.add('hidden');
}

// ============ 分頁 / 子選單切換 ============
window.switchTab = function (tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('is-active'));
    document.querySelectorAll('.tab-page').forEach(page => page.classList.add('hidden'));

    document.getElementById(`btn-tab-${tabId}`).classList.add('is-active');
    document.getElementById(`page-${tabId}`).classList.remove('hidden');

    // 上方子選單列僅於「物資進出作業」頁顯示
    document.getElementById('opsSubnav').classList.toggle('hidden', tabId !== 'operations');
};

window.switchSubtab = function (subtabId) {
    document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('is-active'));
    document.querySelectorAll('.subtab-page').forEach(page => page.classList.add('hidden'));

    document.getElementById(`btn-subtab-${subtabId}`).classList.add('is-active');
    document.getElementById(`subtab-${subtabId}`).classList.remove('hidden');
};

// ============ 小組名單管理 ============
function findGroupByStoredId(id) {
    return rawGroups.find(g => g.docId === String(id));
}

function renderGroupSelects() {
    ['#allocGroup', '#retGroup'].forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.innerHTML = rawGroups.map(g => `<option value="${g.docId}">${escapeHtml(g.name)}</option>`).join('');
    });

    const filterEl = document.getElementById('invFilterGroup');
    if (filterEl) {
        const prevValue = filterEl.value;
        filterEl.innerHTML = `<option value="">👥 依小組查看目前持有物資...</option>` +
            rawGroups.map(g => `<option value="${g.docId}">${escapeHtml(g.name)}</option>`).join('');
        if (rawGroups.some(g => g.docId === prevValue)) filterEl.value = prevValue;
    }
}

function renderGroupSettings() {
    const el = document.getElementById('groupList');
    if (!el) return;
    if (rawGroups.length === 0) {
        el.innerHTML = `<div class="text-xs text-[var(--brown-300)] py-2">尚無小組，請於上方新增。</div>`;
        return;
    }
    el.innerHTML = rawGroups.map((g, idx) => `
        <div class="qp-row flex items-center gap-1 px-3">
            <span class="flex-1 text-sm font-bold text-[var(--brown-800)] truncate">${escapeHtml(g.name)}</span>
            <button class="qp-icon-btn grp-move-up text-[var(--brown-500)] disabled:opacity-30" data-id="${g.docId}" ${idx === 0 ? 'disabled' : ''}>⬆️</button>
            <button class="qp-icon-btn grp-move-down text-[var(--brown-500)] disabled:opacity-30" data-id="${g.docId}" ${idx === rawGroups.length - 1 ? 'disabled' : ''}>⬇️</button>
            <button class="qp-icon-btn grp-edit text-amber-700" data-id="${g.docId}" data-name="${escapeHtml(g.name)}">✏️</button>
            <button class="qp-icon-btn grp-delete text-rose-600" data-id="${g.docId}">❌</button>
        </div>
    `).join('');

    document.querySelectorAll('.grp-move-up').forEach(b => { b.onclick = () => moveGroup(b.dataset.id, -1); });
    document.querySelectorAll('.grp-move-down').forEach(b => { b.onclick = () => moveGroup(b.dataset.id, 1); });
    document.querySelectorAll('.grp-edit').forEach(b => {
        b.onclick = async () => {
            const newName = prompt('修改小組名稱：', b.dataset.name);
            if (newName && newName.trim()) {
                await updateDoc(doc(db, 'projects', currentProjectId, 'groups', b.dataset.id), { name: newName.trim() });
            }
        };
    });
    document.querySelectorAll('.grp-delete').forEach(b => {
        b.onclick = async () => {
            if (confirm('確定刪除這個小組？已登錄的領用/歸還紀錄不會被刪除，但將顯示為「未知小組」。')) {
                await deleteDoc(doc(db, 'projects', currentProjectId, 'groups', b.dataset.id));
            }
        };
    });
}

async function moveGroup(docId, direction) {
    const idx = rawGroups.findIndex(g => g.docId === docId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= rawGroups.length) return;
    const a = rawGroups[idx], b = rawGroups[swapIdx];
    await updateDoc(doc(db, 'projects', currentProjectId, 'groups', a.docId), { order: b.order ?? 0 });
    await updateDoc(doc(db, 'projects', currentProjectId, 'groups', b.docId), { order: a.order ?? 0 });
}

async function addGroup() {
    const input = document.getElementById('newGroupName');
    const name = input.value.trim();
    if (!name) return;
    try {
        const maxOrder = rawGroups.reduce((m, g) => Math.max(m, g.order ?? 0), -1);
        await addDoc(collection(db, 'projects', currentProjectId, 'groups'), { name, order: maxOrder + 1 });
        input.value = '';
    } catch (err) {
        alert(firestoreErrorMessage('新增小組', err));
    }
}

// ============ 快捷選取清單（逐專案獨立） ============
async function ensureQuickpick(category, value) {
    value = (value || '').trim();
    if (!value || !currentProjectId) return false;
    const exists = rawQuickpicks.some(q => q.category === category && q.value === value);
    if (exists) return false;
    const maxOrder = rawQuickpicks.filter(q => q.category === category).reduce((max, q) => Math.max(max, q.order ?? 0), -1);
    await addDoc(collection(db, 'projects', currentProjectId, 'quickpicks'), { category, value, order: maxOrder + 1, timestamp: new Date() });
    return true;
}

function quickpicksByCategory(category) {
    return rawQuickpicks.filter(q => q.category === category).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function renderAllChips() {
    QP_FIELD_BINDINGS.forEach(({ inputId, selectId, category, showStock }) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const items = quickpicksByCategory(category);
        const options = items.map(q => {
            const label = showStock ? `${q.value}（庫房剩餘：${getItemRemaining(q.value)} 件）` : q.value;
            return `<option value="${escapeHtml(q.value)}">${escapeHtml(label)}</option>`;
        }).join('');
        select.innerHTML = `<option value="">📋 或從清單快速選取...</option>${options}`;
        select.onchange = () => {
            if (!select.value) return;
            const input = document.getElementById(inputId);
            input.value = select.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            select.value = '';
        };
    });
}

function renderQuickpickSettings() {
    Object.entries(QP_CATEGORIES).forEach(([category, cfg]) => {
        const listEl = document.getElementById(cfg.listId);
        if (!listEl) return;
        const items = quickpicksByCategory(category);

        const countEl = document.getElementById(`qpCount-${category}`);
        if (countEl) countEl.textContent = `${items.length} 項 ▾`;

        if (items.length === 0) {
            listEl.innerHTML = `<div class="text-xs text-[var(--brown-300)] py-2">尚無快捷選項，新增後會出現在這裡。</div>`;
            return;
        }

        listEl.innerHTML = items.map((q, idx) => `
            <div class="qp-row flex items-center gap-1 px-3">
                <span class="flex-1 text-sm font-bold text-[var(--brown-800)] truncate">${escapeHtml(q.value)}</span>
                <button class="qp-icon-btn qp-move-up text-[var(--brown-500)] disabled:opacity-30" data-id="${q.docId}" data-category="${category}" ${idx === 0 ? 'disabled' : ''}>⬆️</button>
                <button class="qp-icon-btn qp-move-down text-[var(--brown-500)] disabled:opacity-30" data-id="${q.docId}" data-category="${category}" ${idx === items.length - 1 ? 'disabled' : ''}>⬇️</button>
                <button class="qp-icon-btn qp-edit text-amber-700" data-id="${q.docId}" data-value="${escapeHtml(q.value)}">✏️</button>
                <button class="qp-icon-btn qp-delete text-rose-600" data-id="${q.docId}">❌</button>
            </div>
        `).join('');
    });

    bindQuickpickSettingsEvents();
}

function bindQuickpickSettingsEvents() {
    document.querySelectorAll('.qp-move-up').forEach(b => { b.onclick = () => moveQuickpick(b.dataset.category, b.dataset.id, -1); });
    document.querySelectorAll('.qp-move-down').forEach(b => { b.onclick = () => moveQuickpick(b.dataset.category, b.dataset.id, 1); });
    document.querySelectorAll('.qp-edit').forEach(b => {
        b.onclick = async () => {
            const newValue = prompt('修改快捷選項內容：', b.dataset.value);
            if (newValue && newValue.trim()) {
                await updateDoc(doc(db, 'projects', currentProjectId, 'quickpicks', b.dataset.id), { value: newValue.trim() });
            }
        };
    });
    document.querySelectorAll('.qp-delete').forEach(b => {
        b.onclick = async () => {
            if (confirm('確定刪除這個快捷選項？')) {
                await deleteDoc(doc(db, 'projects', currentProjectId, 'quickpicks', b.dataset.id));
            }
        };
    });
}

async function moveQuickpick(category, docId, direction) {
    const items = quickpicksByCategory(category);
    const idx = items.findIndex(q => q.docId === docId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    const current = items[idx];
    const neighbor = items[swapIdx];
    await updateDoc(doc(db, 'projects', currentProjectId, 'quickpicks', current.docId), { order: neighbor.order ?? 0 });
    await updateDoc(doc(db, 'projects', currentProjectId, 'quickpicks', neighbor.docId), { order: current.order ?? 0 });
}

// ============ 全專案共用流水單號 ============
// 入庫／領用／歸還共用同一組流水號，透過 transaction 保證多裝置同時送出時不會撞號。
async function getNextSerialNumber() {
    const counterRef = doc(db, 'projects', currentProjectId, 'meta', 'counter');
    let nextSeq;
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const current = snap.exists() ? (snap.data().seq || 0) : 0;
        nextSeq = current + 1;
        tx.set(counterRef, { seq: nextSeq });
    });
    return nextSeq;
}

function formatSerial(seq) {
    return seq ? '#' + String(seq).padStart(4, '0') : null;
}

function sourceTypeIcon(sourceType) {
    if (sourceType === 'external') return '🌐';
    if (sourceType === 'own') return '🏠';
    return '📦';
}

// 該物品目前的庫房剩餘（總借入 - 組別已領 + 已還）
function getItemRemaining(itemName) {
    const totalA = rawSources.filter(s => s.item === itemName).reduce((sum, s) => sum + s.qty, 0);
    const totalB = rawAllocations.filter(a => a.item === itemName).reduce((sum, a) => sum + a.qty, 0);
    const totalC = rawReturns.filter(r => r.item === itemName).reduce((sum, r) => sum + r.qty, 0);
    return totalA - totalB + totalC;
}

// 該小組目前領用中、尚未歸還的某物品數量
function getGroupOutstanding(itemName, groupId) {
    const allocated = rawAllocations.filter(a => a.item === itemName && String(a.groupId) === String(groupId)).reduce((sum, a) => sum + a.qty, 0);
    const returned = rawReturns.filter(r => r.item === itemName && String(r.groupId) === String(groupId)).reduce((sum, r) => sum + r.qty, 0);
    return allocated - returned;
}

// 某小組目前持有中（已領未還）的所有物品清單
function getGroupHoldings(groupId) {
    const allItems = Array.from(new Set([...rawAllocations.map(a => a.item), ...rawReturns.map(r => r.item)]));
    return allItems
        .map(item => ({ item, qty: getGroupOutstanding(item, groupId) }))
        .filter(x => x.qty > 0);
}

function renderGroupHoldings() {
    const select = document.getElementById('invFilterGroup');
    const wrap = document.getElementById('invGroupHoldings');
    if (!select || !wrap) return;
    const groupId = select.value;
    if (!groupId) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }

    const g = findGroupByStoredId(groupId);
    const groupLabel = g ? g.name : '此小組';
    const holdings = getGroupHoldings(groupId);
    wrap.classList.remove('hidden');

    if (holdings.length === 0) {
        wrap.innerHTML = `<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">🧑‍🤝‍🧑 ${escapeHtml(groupLabel)} 目前沒有持有中的物資。</div>`;
        return;
    }

    wrap.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <p class="text-sm font-bold text-blue-800">🧑‍🤝‍🧑 ${escapeHtml(groupLabel)} 目前持有物資</p>
            <div class="flex flex-wrap gap-2">
                ${holdings.map(h => `<span class="text-xs font-bold bg-white border border-blue-200 text-blue-700 px-2.5 py-1.5 rounded-lg">${escapeHtml(h.item)} × ${h.qty}</span>`).join('')}
            </div>
        </div>
    `;
}

function updateAllocStockHint() {
    const el = document.getElementById('allocItemStock');
    if (!el) return;
    const itemName = document.getElementById('allocItem').value.trim();
    if (!itemName) { el.textContent = ''; return; }
    const knownItem = rawSources.some(s => s.item === itemName) || rawAllocations.some(a => a.item === itemName);
    if (!knownItem) {
        el.textContent = '⚠️ 系統內尚無此物品的庫存資料';
        el.className = 'text-xs font-bold mt-1.5 min-h-[1em] text-amber-600';
        return;
    }
    const remaining = getItemRemaining(itemName);
    el.textContent = `📦 目前庫房剩餘：${remaining} 件`;
    el.className = `text-xs font-bold mt-1.5 min-h-[1em] ${remaining > 0 ? 'text-emerald-700' : 'text-rose-600'}`;
}

function updateRetOutstandingHint() {
    const el = document.getElementById('retOutstandingHint');
    if (!el) return;
    const itemName = document.getElementById('retItem').value.trim();
    const groupId = document.getElementById('retGroup').value;
    if (!itemName || !groupId) { el.textContent = ''; return; }
    const g = findGroupByStoredId(groupId);
    const groupLabel = g ? g.name : '此小組';
    const outstanding = getGroupOutstanding(itemName, groupId);
    if (outstanding <= 0) {
        el.textContent = `⚠️ ${groupLabel} 目前沒有登記中的「${itemName}」可歸還`;
        el.className = 'md:col-span-5 text-xs font-bold min-h-[1em] text-amber-600';
        return;
    }
    el.textContent = `↩️ ${groupLabel} 目前領用中尚未歸還：${outstanding} 件`;
    el.className = 'md:col-span-5 text-xs font-bold min-h-[1em] text-blue-700';
}

// ============ 物資總表 ============
function calculateAndRenderInventory() {
    const allItems = Array.from(new Set([...rawSources.map(s => s.item), ...rawAllocations.map(a => a.item), ...rawReturns.map(r => r.item)]));
    const tbody = document.querySelector("#inventoryTable tbody");
    const cardsWrap = document.getElementById("inventoryCards");
    if (!tbody || !cardsWrap) return;

    if (allItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-[var(--brown-300)] font-medium">目前尚無庫存異動紀錄。請前往【進出作業】分頁登錄。</td></tr>`;
        cardsWrap.innerHTML = `<div class="p-8 text-center text-[var(--brown-300)] font-medium text-sm">目前尚無庫存異動紀錄。<br>請前往【進出作業】分頁登錄。</div>`;
        updateAllocStockHint();
        updateRetOutstandingHint();
        renderAllChips();
        renderGroupHoldings();
        return;
    }

    const filterText = (document.getElementById('invFilterItem')?.value || '').trim();
    const displayItems = filterText ? allItems.filter(name => name.includes(filterText)) : allItems;

    if (displayItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-[var(--brown-300)] font-medium">沒有符合「${escapeHtml(filterText)}」的物品。</td></tr>`;
        cardsWrap.innerHTML = `<div class="p-8 text-center text-[var(--brown-300)] font-medium text-sm">沒有符合「${escapeHtml(filterText)}」的物品。</div>`;
        updateAllocStockHint();
        updateRetOutstandingHint();
        renderAllChips();
        renderGroupHoldings();
        return;
    }

    let tableHtml = "";
    let cardsHtml = "";

    displayItems.forEach(itemName => {
        const itemSrcs = rawSources.filter(s => s.item === itemName);
        const totalA = itemSrcs.reduce((sum, s) => sum + s.qty, 0);
        const detailsA = itemSrcs.map(s => {
            const serial = formatSerial(s.serial);
            const sourceLabel = s.sourceType === 'own' ? '存放位置' : '來源';
            return `<span class="block text-xs text-[var(--brown-400)]">${serial ? `<b class="text-[var(--brown-500)]">${serial}</b> ` : ''}<b class="text-[var(--brown-600)]">${escapeHtml(itemName)}</b> ${sourceTypeIcon(s.sourceType)} ${sourceLabel}：${escapeHtml(s.source)} : <b>${s.qty}</b>${s.method ? ` (${escapeHtml(s.method)})` : ''}</span>`;
        }).join('');

        const itemAllocs = rawAllocations.filter(a => a.item === itemName);
        const totalB = itemAllocs.reduce((sum, a) => sum + a.qty, 0);
        const detailsB = itemAllocs.map(a => {
            const g = findGroupByStoredId(a.groupId);
            const serial = formatSerial(a.serial);
            return `<span class="block text-xs text-[var(--brown-400)]">${serial ? `<b class="text-[var(--brown-500)]">${serial}</b> ` : ''}${g ? escapeHtml(g.name) : '未知小組'} : <b>${a.qty}</b> (${escapeHtml(a.user)})</span>`;
        }).join('');

        const totalC = rawReturns.filter(r => r.item === itemName).reduce((sum, r) => sum + r.qty, 0);
        const 流浪中 = totalB - totalC;
        const 庫房剩餘 = totalA - totalB + totalC;

        tableHtml += `
            <tr class="hover:bg-[var(--tan-100)]/60 transition-colors">
                <td class="p-4 font-bold text-[var(--brown-900)]">${escapeHtml(itemName)}</td>
                <td class="p-4 font-bold text-[var(--brown-800)]">${totalA}</td>
                <td class="p-4">${detailsA || '-'}</td>
                <td class="p-4 font-bold text-blue-700">${totalB}</td>
                <td class="p-4">${detailsB || '-'}</td>
                <td class="p-4 font-bold text-emerald-700">${totalC}</td>
                <td class="p-4 font-bold ${流浪中 > 0 ? 'text-rose-600' : 'text-[var(--brown-300)]'}">${流浪中}</td>
                <td class="p-4 bg-[var(--brown-900)] text-[var(--cream)] font-black text-center text-base">${庫房剩餘}</td>
            </tr>
        `;

        cardsHtml += `
            <div class="p-4 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-black text-[var(--brown-900)] text-base">${escapeHtml(itemName)}</h4>
                    <span class="bg-[var(--brown-900)] text-[var(--cream)] font-black text-lg px-3 py-1 rounded-lg shrink-0">${庫房剩餘}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="bg-[var(--tan-100)] rounded-lg py-1.5 border border-[var(--tan-300)]">
                        <div class="font-bold text-[var(--brown-800)]">${totalA}</div><div class="text-[var(--brown-400)]">總借入</div>
                    </div>
                    <div class="bg-blue-50 rounded-lg py-1.5 border border-blue-100">
                        <div class="font-bold text-blue-700">${totalB}</div><div class="text-blue-400">已領</div>
                    </div>
                    <div class="bg-emerald-50 rounded-lg py-1.5 border border-emerald-100">
                        <div class="font-bold text-emerald-700">${totalC}</div><div class="text-emerald-400">已還</div>
                    </div>
                </div>
                ${流浪中 > 0 ? `<div class="text-xs font-bold text-rose-600">⚠️ 流浪中：尚有 ${流浪中} 件未歸還</div>` : ''}
                <div class="text-xs text-[var(--brown-500)] space-y-2 pt-1.5 border-t border-dashed border-[var(--tan-300)]">
                    <div><b class="text-[var(--brown-700)]">來源：</b>${detailsA || '-'}</div>
                    <div><b class="text-[var(--brown-700)]">分配：</b>${detailsB || '-'}</div>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = tableHtml;
    cardsWrap.innerHTML = cardsHtml;

    updateAllocStockHint();
    updateRetOutstandingHint();
    renderAllChips();
    renderGroupHoldings();
}

// 全新的入庫來源交易紀錄：以個別入庫事件（而非依物品彙總）列出，預設只顯示物品名稱與
// 數量，點擊展開才看到單號、來源類型、方式、備註與時間等完整資訊。
function formatTimestamp(ts) {
    const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts instanceof Date ? ts : null);
    if (!d) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderSourceLog() {
    const el = document.getElementById('sourceLog');
    if (!el) return;

    if (rawSources.length === 0) {
        el.innerHTML = `<div class="p-8 text-center text-[var(--brown-300)] font-medium text-sm">目前尚無入庫紀錄。</div>`;
        return;
    }

    const sorted = [...rawSources].sort((a, b) => (b.serial ?? 0) - (a.serial ?? 0));
    el.innerHTML = sorted.map(s => {
        const serial = formatSerial(s.serial);
        const sourceLabel = s.sourceType === 'own' ? '存放位置' : '來源';
        return `
            <details>
                <summary class="px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 cursor-pointer select-none">
                    <span class="font-bold text-[var(--brown-900)] text-sm truncate">${serial ? `<span class="text-[var(--brown-400)] font-normal">${serial}</span> ` : ''}${escapeHtml(s.item)}</span>
                    <span class="flex items-center gap-1.5 shrink-0">
                        <span class="text-xs text-[var(--brown-500)] font-bold">x${s.qty} ▾</span>
                        <button type="button" class="src-menu-btn qp-icon-btn text-[var(--brown-500)]" data-id="${s.docId}">⋮</button>
                    </span>
                </summary>
                <div class="px-4 pb-3 text-xs text-[var(--brown-500)] space-y-1">
                    <div>${sourceTypeIcon(s.sourceType)} ${sourceLabel}：${escapeHtml(s.source)}</div>
                    ${s.method ? `<div>📜 借入方式：${escapeHtml(s.method)}</div>` : ''}
                    <div>📝 備註：${s.note ? escapeHtml(s.note) : '-'}</div>
                    <div>🕒 登錄時間：${formatTimestamp(s.timestamp)}</div>
                </div>
            </details>
        `;
    }).join('');

    document.querySelectorAll('.src-menu-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSourceActionSheet(btn.dataset.id);
        };
    });
}

// 選單目前對應的入庫紀錄 docId（底部操作列共用，不會因清單捲動範圍而被裁切）
let sourceActionSheetTargetId = null;

function openSourceActionSheet(docId) {
    sourceActionSheetTargetId = docId;
    document.getElementById('sourceActionSheet').classList.remove('hidden');
}

function closeSourceActionSheet() {
    sourceActionSheetTargetId = null;
    document.getElementById('sourceActionSheet').classList.add('hidden');
}

let editingSourceId = null;

function updateMethodWrapVisibility(wrapId, sourceType) {
    const wrap = document.getElementById(wrapId);
    if (wrap) wrap.classList.toggle('hidden', sourceType === 'own');
}

function openEditSourceModal(docId) {
    const rec = rawSources.find(s => s.docId === docId);
    if (!rec) return;
    editingSourceId = docId;
    document.getElementById('editSrcItem').value = rec.item || '';
    const sourceType = rec.sourceType === 'own' ? 'own' : 'external';
    document.getElementById('editSrcType').value = sourceType;
    document.getElementById('editSrcUnit').value = rec.source || '';
    document.getElementById('editSrcQty').value = rec.qty ?? '';
    updateMethodWrapVisibility('editSrcMethodWrap', sourceType);

    const knownMethods = ['借據', '刷臉'];
    const methodOtherInput = document.getElementById('editSrcMethodOther');
    if (knownMethods.includes(rec.method)) {
        document.getElementById('editSrcMethod').value = rec.method;
        methodOtherInput.value = '';
        methodOtherInput.classList.add('hidden');
    } else {
        document.getElementById('editSrcMethod').value = '其他';
        methodOtherInput.value = rec.method || '';
        methodOtherInput.classList.toggle('hidden', sourceType === 'own' || !rec.method);
    }
    document.getElementById('editSrcNote').value = rec.note || '';
    document.getElementById('editSourceModal').classList.remove('hidden');
}

function closeEditSourceModal() {
    editingSourceId = null;
    document.getElementById('editSourceModal').classList.add('hidden');
}

async function saveEditedSource() {
    if (!editingSourceId || !currentProjectId) return;
    const item = document.getElementById('editSrcItem').value.trim();
    const sourceType = document.getElementById('editSrcType').value;
    const source = document.getElementById('editSrcUnit').value.trim();
    const qty = parseInt(document.getElementById('editSrcQty').value);
    const methodSelect = document.getElementById('editSrcMethod').value;
    const methodOther = document.getElementById('editSrcMethodOther').value.trim();
    const method = sourceType === 'own' ? '' : (methodSelect === '其他' ? methodOther : methodSelect);
    const note = document.getElementById('editSrcNote').value.trim();
    if (!item || !source || isNaN(qty)) return alert('請完整填寫項目、來源與數量');
    if (sourceType !== 'own' && methodSelect === '其他' && !methodOther) return alert('請填寫「其他」借入方式的說明');

    try {
        await updateDoc(doc(db, 'projects', currentProjectId, 'sources', editingSourceId), { item, sourceType, source, qty, method, note });
        closeEditSourceModal();
    } catch (err) {
        alert(firestoreErrorMessage('儲存修改', err));
    }
}

// ============ 版本紀錄（卡片式，收合預設，點擊才展開） ============
function renderChangeLog() {
    const el = document.getElementById('changeLogList');
    if (!el) return;
    el.innerHTML = CHANGELOG.map(entry => `
        <details class="changelog-card card">
            <summary class="px-4 flex items-center justify-between gap-3">
                <span class="font-black font-serif-tc text-[var(--brown-700)]">${entry.version}</span>
                <span class="text-[var(--brown-300)] text-xs">點擊展開 ▾</span>
            </summary>
            <p class="px-4 pb-4 text-sm text-[var(--brown-700)] leading-relaxed">${escapeHtml(entry.notes)}</p>
        </details>
    `).join('');
}

// ============ 下拉重新整理 ============
function initPullToRefresh() {
    const indicator = document.getElementById('ptrIndicator');
    let startY = null;
    let pulling = false;
    const THRESHOLD = 70;

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        } else {
            startY = null;
            pulling = false;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!pulling || startY === null) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0) {
            const pull = Math.min(dy, 120);
            indicator.style.transform = `translate(-50%, ${pull}px)`;
            indicator.style.opacity = String(Math.min(pull / THRESHOLD, 1));
            indicator.dataset.armed = pull > THRESHOLD ? '1' : '0';
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (pulling && indicator.dataset.armed === '1') {
            triggerManualRefresh();
        }
        indicator.style.transform = '';
        indicator.style.opacity = '0';
        pulling = false;
        startY = null;
    });
}

function triggerManualRefresh() {
    const indicator = document.getElementById('ptrIndicator');
    indicator.classList.add('ptr-spinning');
    indicator.style.opacity = '1';
    window.location.reload();
}

// ============ 表單事件綁定（僅需綁定一次，DOM 節點皆為靜態） ============
function bindGlobalEvents() {
    document.getElementById('btnAddProject').onclick = addProject;
    document.getElementById('newProjectName').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addProject(); }
    });

    document.getElementById('btnBackToDashboard').onclick = exitProject;

    document.getElementById('btnShowChangelog').onclick = () => {
        document.getElementById('changelogModal').classList.remove('hidden');
    };
    document.getElementById('btnCloseChangelog').onclick = () => {
        document.getElementById('changelogModal').classList.add('hidden');
    };
    document.getElementById('changelogModal').addEventListener('click', (e) => {
        if (e.target.id === 'changelogModal') e.currentTarget.classList.add('hidden');
    });

    document.getElementById('btnCloseEditSource').onclick = closeEditSourceModal;
    document.getElementById('editSourceModal').addEventListener('click', (e) => {
        if (e.target.id === 'editSourceModal') closeEditSourceModal();
    });
    document.getElementById('editSrcMethod').addEventListener('change', (e) => {
        document.getElementById('editSrcMethodOther').classList.toggle('hidden', e.target.value !== '其他');
    });
    document.getElementById('editSrcType').addEventListener('change', (e) => {
        updateMethodWrapVisibility('editSrcMethodWrap', e.target.value);
    });
    document.getElementById('btnSaveEditSource').onclick = saveEditedSource;

    document.getElementById('btnSourceMenuCancel').onclick = closeSourceActionSheet;
    document.getElementById('sourceActionSheet').addEventListener('click', (e) => {
        if (e.target.id === 'sourceActionSheet') closeSourceActionSheet();
    });
    document.getElementById('btnSourceMenuEdit').onclick = () => {
        const docId = sourceActionSheetTargetId;
        closeSourceActionSheet();
        if (docId) openEditSourceModal(docId);
    };
    document.getElementById('btnSourceMenuDelete').onclick = async () => {
        const docId = sourceActionSheetTargetId;
        closeSourceActionSheet();
        if (!docId) return;
        const rec = rawSources.find(s => s.docId === docId);
        if (!confirm(`確定刪除這筆入庫紀錄？${rec ? `（${rec.item} x${rec.qty}）` : ''}此動作無法復原。`)) return;
        try {
            await deleteDoc(doc(db, 'projects', currentProjectId, 'sources', docId));
        } catch (err) {
            alert(firestoreErrorMessage('刪除入庫紀錄', err));
        }
    };

    document.getElementById('btnAddGroup').onclick = addGroup;
    document.getElementById('newGroupName').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addGroup(); }
    });

    document.getElementById('srcMethod').addEventListener('change', (e) => {
        document.getElementById('srcMethodOther').classList.toggle('hidden', e.target.value !== '其他');
    });

    document.getElementById('srcType').addEventListener('change', (e) => {
        const input = document.getElementById('srcUnit');
        input.placeholder = e.target.value === 'own' ? '存放位置(如:衛生器材室、A棟2樓)' : '外部單位名稱(如:302旅)';
        updateMethodWrapVisibility('srcMethodWrap', e.target.value);
    });

    document.getElementById('allocItem').addEventListener('input', updateAllocStockHint);
    document.getElementById('retItem').addEventListener('input', updateRetOutstandingHint);
    document.getElementById('retGroup').addEventListener('change', updateRetOutstandingHint);

    document.getElementById('invFilterItem').addEventListener('input', calculateAndRenderInventory);
    document.getElementById('invFilterGroup').addEventListener('change', renderGroupHoldings);

    document.getElementById('btnSrcSubmit').onclick = async () => {
        if (!currentProjectId) return;
        const item = document.getElementById('srcItem').value.trim();
        const sourceType = document.getElementById('srcType').value;
        const source = document.getElementById('srcUnit').value.trim();
        const qty = parseInt(document.getElementById('srcQty').value);
        const methodSelect = document.getElementById('srcMethod').value;
        const methodOther = document.getElementById('srcMethodOther').value.trim();
        const method = sourceType === 'own' ? '' : (methodSelect === '其他' ? methodOther : methodSelect);
        const note = document.getElementById('srcNote').value.trim();
        if (!item || !source || isNaN(qty)) return alert("請完整填寫項目、來源與數量");
        if (sourceType !== 'own' && methodSelect === '其他' && !methodOther) return alert("請填寫「其他」借入方式的說明");

        const serial = await getNextSerialNumber();
        await addDoc(collection(db, 'projects', currentProjectId, 'sources'), { item, sourceType, source, qty, method, note, serial, timestamp: new Date() });
        await ensureQuickpick('item', item);
        await ensureQuickpick('source', source);
        document.getElementById('srcItem').value = ''; document.getElementById('srcQty').value = '';
        document.getElementById('srcMethodOther').value = ''; document.getElementById('srcMethodOther').classList.add('hidden');
        document.getElementById('srcMethod').value = '借據';
        showToast('✅ 登錄完成');
    };

    document.getElementById('btnAllocSubmit').onclick = async () => {
        if (!currentProjectId) return;
        const item = document.getElementById('allocItem').value.trim();
        const groupId = document.getElementById('allocGroup').value;
        const qty = parseInt(document.getElementById('allocQty').value);
        const user = document.getElementById('allocUser').value.trim();
        if (!item || isNaN(qty) || !user) return alert("填寫不完整");

        const remaining = getItemRemaining(item);
        if (qty > remaining) {
            if (!confirm(`目前庫房剩餘只有 ${remaining} 件「${item}」，仍要領用 ${qty} 件嗎？`)) return;
        }

        const serial = await getNextSerialNumber();
        await addDoc(collection(db, 'projects', currentProjectId, 'allocations'), { item, groupId, qty, user, serial, timestamp: new Date() });
        await ensureQuickpick('item', item);
        await ensureQuickpick('person', user);
        document.getElementById('allocItem').value = ''; document.getElementById('allocQty').value = '';
        updateAllocStockHint();
    };

    document.getElementById('btnRetSubmit').onclick = async () => {
        if (!currentProjectId) return;
        const item = document.getElementById('retItem').value.trim();
        const groupId = document.getElementById('retGroup').value;
        const qty = parseInt(document.getElementById('retQty').value);
        const receiver = document.getElementById('retReceiver').value.trim();
        const note = document.getElementById('retNote').value.trim();
        if (!item || isNaN(qty) || !receiver) return alert("填寫不完整");

        const outstanding = getGroupOutstanding(item, groupId);
        if (qty > outstanding) {
            const g = findGroupByStoredId(groupId);
            if (!confirm(`${g ? g.name : '此小組'} 目前登記中的「${item}」只有 ${outstanding} 件，仍要歸還 ${qty} 件嗎？`)) return;
        }

        const serial = await getNextSerialNumber();
        await addDoc(collection(db, 'projects', currentProjectId, 'returns'), { item, groupId, qty, receiver, note, serial, timestamp: new Date() });
        await ensureQuickpick('item', item);
        await ensureQuickpick('person', receiver);
        document.getElementById('retItem').value = ''; document.getElementById('retQty').value = '';
        updateRetOutstandingHint();
    };

    document.querySelectorAll('.btn-add-qp').forEach(b => {
        b.onclick = async () => {
            const input = document.getElementById(b.dataset.input);
            const ok = await ensureQuickpick(b.dataset.category, input.value);
            if (ok) input.value = '';
            else if (input.value.trim()) alert("這個快捷選項已經存在囉");
        };
    });
    document.querySelectorAll('[id^="qpNewInput-"]').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.querySelector(`.btn-add-qp[data-input="${input.id}"]`).click();
            }
        });
    });
}
