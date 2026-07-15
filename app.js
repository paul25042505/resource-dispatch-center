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
// 版號規則：自 v1.0.0 起採用標準 Semantic Versioning（主版本.次版本.修正版）：
//   主版本 MAJOR：重大架構變更／破壞性資料結構調整／整體介面或操作邏輯大改版
//   次版本 MINOR：新增功能、新增分頁、新增可操作能力
//   修正版 PATCH：錯誤修正、UI/文字/樣式微調
// v0.0.1～v0.0.20 為採用此規則前的歷史紀錄，版號僅代表累計改版次數，不做語意區分。
const CHANGELOG = [
    {
        version: "v2.2.1",
        notes: "修正編輯領用/歸還紀錄彈窗沒有「使用場地」欄位的問題：舊紀錄（或當初送出時沒選使用場地的紀錄）現在可以透過編輯彈窗補選/修改使用場地，選好小組後會自動列出該小組的使用場地清單。"
    },
    {
        version: "v2.2.0",
        notes: "總覽頁「庫房待發」列現在會直接標示這批物資是🌐外部借入還是🏠自有／存放位置，同一物品若兩種來源都有會同時顯示兩個圖示，不用點開就能一眼看出來；點開展開後的每筆入庫明細也會分別標示來源類型。沒有記錄來源類型的舊資料則維持原樣，不會顯示錯誤的標示。"
    },
    {
        version: "v2.1.0",
        notes: "總覽頁點開一列展開後，每一筆逐筆明細（入庫／領出／歸還）都新增「⋮」，可直接編輯或刪除那筆原始紀錄，跟入庫來源紀錄／領用紀錄／歸還紀錄共用同一套編輯彈窗與底部操作選單，不用再跑去「原始紀錄」區塊才能改。"
    },
    {
        version: "v2.0.0",
        notes: "整套介面大改版。底部導覽列從 4 個精簡成 3 個（總覽／進出作業／設定），原本的「物資總表」「借用報表」「目前位置」三個分散畫面合併成一個「總覽」：可搜尋物品、用「保管中／全部歷史」分段控制切換「東西現在在哪」跟「這次任務總共借了什麼」兩種視角，依小組篩選、依物品分組列表，點一列展開看逐筆經手人與日期；原本的入庫/領用/歸還逐筆紀錄收進「原始紀錄」收合區塊。設定頁的小組、使用場地、快捷選項、連結清單，全面改成點「⋮」才彈出編輯/刪除/排序選單，不再常駐一排按鈕。視覺風格改為 iOS 26 液態玻璃：卡片與按鈕改用半透明毛玻璃材質、圓潤轉角，按鈕按下會有彈簧回彈效果，取代 v0.0.20 的方角硬邊風格。"
    },
    {
        version: "v1.1.0",
        notes: "設定頁新增「🔗 網網相連」：可存放常用外部連結（如場地平面圖、報備系統），點一下直接開啟，可新增/編輯/刪除/排序。原本的「子位置」全面更名為更直觀的「使用場地」（功能不變，仍隸屬單一小組，領用/歸還時可指定）。物資總表每個物品新增「目前位置」欄位/區塊，一次列出這個物品目前分散在庫房待發、哪些小組、哪些使用場地，不用再切換到「依小組篩選」才看得到。"
    },
    {
        version: "v1.0.0",
        notes: "版號規則重新規劃，正式採用語意化版本（Semantic Versioning）。此版本本身沒有新增功能或修正錯誤，只重新定義版號規則並以此版本作為新規則的起點；系統已實際部署並用於真實任務，因此以 1.0.0 作為第一個正式穩定版本。"
    },
    {
        version: "v0.0.20",
        notes: "全站字體調整為更有空間感的排版：本文行高與字距加大、標題（含卡片標題）字距拉開展現氣勢。庫房剩餘大數字、總借入/已領/已還三格統計、各小組持有量膨囊裡的數量，改用細字重＋拉開字距的「數據感」樣式，跟一般文字做出區隔。所有按鈕（登錄借入、確認發放、新增小組等）改為方角＋雙框線的「硬派印章感」風格，取代原本的圓角實心按鈕。"
    },
    {
        version: "v0.0.19",
        notes: "小組底下新增「子位置」階層（辦公室、車輛等），可在「設定」頁點開每個小組新增/編輯/刪除/排序子位置。領用簽收與歸還登記選好小組後，若該小組有設定子位置，會多出一個可選填的子位置欄位。物資總表依小組篩選時，若該小組有子位置，會自動依子位置分別列出目前持有的物資（含「未指定子位置」），不再只看到庫房剩餘歸零就以為東西不見了；分配明細、領用/歸還紀錄與借用報表的逐筆明細也都會標示子位置。"
    },
    {
        version: "v0.0.18",
        notes: "借用報表的每個物品現在可以點開，展開後看到該小組實際的領用/歸還逐筆明細（含經手人與時間）。入庫登錄/領用簽收/歸還登記表單的「快速選取」改成點一下就帶入的膠囊按鈕（取代原本容易被忽略的下拉選單），品項按鈕會同時顯示目前庫房剩餘。歸還登記選好小組後，該小組尚未歸還的數量提示會立刻顯示在小組欄位下方，不用捲到表單最後才看到。"
    },
    {
        version: "v0.0.17",
        notes: "底部導覽列新增「🧾 借用報表」分頁：列出本專案每個小組累計借用過的物品與數量（不因歸還而減少），並顯示已歸還/尚未歸還的細項，可作為下次類似任務整備物資時的參考依據。"
    },
    {
        version: "v0.0.16",
        notes: "設定頁的「來源單位」快捷選取清單拆成「🌐 外部單位」與「🏠 存放位置」兩個獨立分類，入庫登錄表單的下拉選單也會依「來源類型」自動切換對應清單，不再混在一起顯示。既有的舊清單會依照每個項目過去實際登錄時的來源類型，自動歸類到正確的新分類，不需手動搬移。"
    },
    {
        version: "v0.0.15",
        notes: "物資總表新增「領用紀錄」與「歸還紀錄」兩份清單，跟入庫來源紀錄一樣逐筆列出、可點擊「⋮」編輯或刪除。三種紀錄的操作選單與底部彈出列已整合成共用機制，行為完全一致。"
    },
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
    source_external: { listId: "qpList-source_external" },
    source_own: { listId: "qpList-source_own" },
    person: { listId: "qpList-person" }
};
// 表單欄位對應的快捷選取分類與下拉選單；showStock 的欄位會在選項後附註目前庫房剩餘。
// category 也可以是函式，用來依照當下其他欄位的值動態決定分類（例如來源單位依「來源
// 類型」切換成外部單位或存放位置兩種不同的快捷清單）。
const QP_FIELD_BINDINGS = [
    { inputId: "srcItem", selectId: "qpSelect-srcItem", category: "item", showStock: true },
    { inputId: "srcUnit", selectId: "qpSelect-srcUnit", category: () => document.getElementById('srcType').value === 'own' ? 'source_own' : 'source_external', showStock: false },
    { inputId: "allocItem", selectId: "qpSelect-allocItem", category: "item", showStock: true },
    { inputId: "allocUser", selectId: "qpSelect-allocUser", category: "person", showStock: false },
    { inputId: "retItem", selectId: "qpSelect-retItem", category: "item", showStock: true },
    { inputId: "retReceiver", selectId: "qpSelect-retReceiver", category: "person", showStock: false }
];

// ---- 全域狀態 ----
let rawProjects = [];
let currentProjectId = null;
let currentProjectName = '';
let rawSources = [], rawAllocations = [], rawReturns = [], rawGroups = [], rawQuickpicks = [], rawSubLocations = [], rawLinks = [];
// 用來標記「有子位置設定，但這筆領用/歸還沒有指定是哪個子位置」的篩選桶
const UNASSIGNED_SUBLOCATION = '__unassigned__';
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
    const subcollections = ['sources', 'allocations', 'returns', 'groups', 'sublocations', 'quickpicks', 'links', 'tasks', 'meta'];
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
    rawSources = []; rawAllocations = []; rawReturns = []; rawGroups = []; rawQuickpicks = []; rawSubLocations = []; rawLinks = [];

    document.getElementById('currentProjectName').textContent = projectName;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-project').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');

    window.switchTab('inventory');
    window.switchSubtab('in');

    migrateSourceQuickpicksIfNeeded(projectId).catch(err => console.warn('快捷選項分類搬遷失敗', err));

    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'sources'), (snap) => {
        rawSources = []; snap.forEach(d => rawSources.push({ docId: d.id, ...d.data() }));
        calculateAndRenderInventory();
        renderSourceLog();
    }, (err) => firestoreErrorMessage('讀取物資來源', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'allocations'), (snap) => {
        rawAllocations = []; snap.forEach(d => rawAllocations.push({ docId: d.id, ...d.data() }));
        calculateAndRenderInventory();
        renderAllocationLog();
    }, (err) => firestoreErrorMessage('讀取領用紀錄', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'returns'), (snap) => {
        rawReturns = []; snap.forEach(d => rawReturns.push({ docId: d.id, ...d.data() }));
        calculateAndRenderInventory();
        renderReturnLog();
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
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'sublocations'), (snap) => {
        rawSubLocations = [];
        snap.forEach(d => rawSubLocations.push({ docId: d.id, ...d.data() }));
        rawSubLocations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        renderGroupSettings();
        refreshSubLocationSelect('allocGroup', 'allocSubLocation');
        refreshSubLocationSelect('retGroup', 'retSubLocation');
        calculateAndRenderInventory();
    }, (err) => firestoreErrorMessage('讀取使用場地名單', err)));
    projectListeners.push(onSnapshot(collection(db, 'projects', projectId, 'links'), (snap) => {
        rawLinks = [];
        snap.forEach(d => rawLinks.push({ docId: d.id, ...d.data() }));
        rawLinks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        renderLinksSettings();
    }, (err) => firestoreErrorMessage('讀取連結清單', err)));
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

function findSubLocationById(id) {
    if (!id) return null;
    return rawSubLocations.find(s => s.docId === String(id));
}

function renderGroupSelects() {
    ['#allocGroup', '#retGroup', '#editAllocGroup', '#editRetGroup'].forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) return;
        const prevValue = el.value;
        el.innerHTML = rawGroups.map(g => `<option value="${g.docId}">${escapeHtml(g.name)}</option>`).join('');
        if (rawGroups.some(g => g.docId === prevValue)) el.value = prevValue;
    });

    const filterEl = document.getElementById('invFilterGroup');
    if (filterEl) {
        const prevValue = filterEl.value;
        filterEl.innerHTML = `<option value="">👥 依小組篩選...</option>` +
            rawGroups.map(g => `<option value="${g.docId}">${escapeHtml(g.name)}</option>`).join('');
        if (rawGroups.some(g => g.docId === prevValue)) filterEl.value = prevValue;
    }

    refreshSubLocationSelect('allocGroup', 'allocSubLocation');
    refreshSubLocationSelect('retGroup', 'retSubLocation');
}

// 依目前選定的小組，重新整理「子位置」下拉選單（該小組沒有子位置時就整個隱藏）
function getSubLocationsByGroup(groupId) {
    return rawSubLocations.filter(s => String(s.groupId) === String(groupId)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function refreshSubLocationSelect(groupSelectId, subLocSelectId) {
    const groupSel = document.getElementById(groupSelectId);
    const subSel = document.getElementById(subLocSelectId);
    if (!groupSel || !subSel) return;
    const subLocs = getSubLocationsByGroup(groupSel.value);
    if (subLocs.length === 0) {
        subSel.classList.add('hidden');
        subSel.innerHTML = '';
        return;
    }
    const prevValue = subSel.value;
    subSel.innerHTML = `<option value="">📍 不指定使用場地</option>` + subLocs.map(s => `<option value="${s.docId}">${escapeHtml(s.name)}</option>`).join('');
    if (subLocs.some(s => s.docId === prevValue)) subSel.value = prevValue;
    subSel.classList.remove('hidden');
}

function renderGroupSettings() {
    const el = document.getElementById('groupList');
    if (!el) return;
    if (rawGroups.length === 0) {
        el.innerHTML = `<div class="text-xs text-[var(--brown-300)] py-2">尚無小組，請於上方新增。</div>`;
        return;
    }
    // 每次資料異動都會整個重新產生 HTML，所以要先記住哪些小組的卡片目前是展開的，
    // 重繪後再還原，不然新增/刪除使用場地時卡片會突然自己收合。
    const openGroupIds = new Set(Array.from(el.querySelectorAll('details[open]')).map(d => d.dataset.group));
    el.innerHTML = rawGroups.map((g) => {
        const subLocs = getSubLocationsByGroup(g.docId);
        const subLocRows = subLocs.length === 0
            ? `<div class="text-xs text-[var(--brown-300)] py-1">尚無使用場地，新增後可在領用/歸還時指定。</div>`
            : subLocs.map((s) => `
                <div class="qp-row flex items-center gap-1 px-3">
                    <span class="flex-1 text-sm font-bold text-[var(--brown-700)] truncate">📍 ${escapeHtml(s.name)}</span>
                    <button class="qp-icon-btn subloc-menu-btn text-[var(--brown-500)]" data-group="${g.docId}" data-id="${s.docId}" data-name="${escapeHtml(s.name)}">⋮</button>
                </div>
            `).join('');
        return `
        <details class="card overflow-hidden" data-group="${g.docId}" ${openGroupIds.has(g.docId) ? 'open' : ''}>
            <summary class="card-header flex items-center justify-between min-h-[44px] cursor-pointer select-none gap-2">
                <span class="font-bold text-sm text-[var(--brown-800)] truncate flex-1">👥 ${escapeHtml(g.name)}</span>
                <span class="text-xs text-[var(--brown-400)] font-normal shrink-0">${subLocs.length > 0 ? `${subLocs.length} 個使用場地` : ''}</span>
                <button class="qp-icon-btn grp-menu-btn text-[var(--brown-500)]" data-id="${g.docId}" data-name="${escapeHtml(g.name)}">⋮</button>
            </summary>
            <div class="p-3 space-y-3">
                <div class="space-y-2">
                    <p class="text-xs font-bold text-[var(--brown-600)]">🚐 使用場地（辦公室、車輛等，可知道每個場地放了什麼）</p>
                    <div class="flex gap-2">
                        <input type="text" class="field flex-1 subloc-new-input" data-group="${g.docId}" placeholder="新增使用場地（如：營督辦公室、1號車）">
                        <button class="btn btn-clay btn-add-subloc" data-group="${g.docId}">➕ 新增</button>
                    </div>
                    <div class="space-y-1.5">${subLocRows}</div>
                </div>
            </div>
        </details>
    `;
    }).join('');

    document.querySelectorAll('.grp-menu-btn').forEach(b => {
        b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const idx = rawGroups.findIndex(g => g.docId === b.dataset.id);
            openListItemActionSheet({
                canMoveUp: idx > 0,
                canMoveDown: idx >= 0 && idx < rawGroups.length - 1,
                onMoveUp: () => moveGroup(b.dataset.id, -1),
                onMoveDown: () => moveGroup(b.dataset.id, 1),
                onEdit: async () => {
                    const newName = prompt('修改小組名稱：', b.dataset.name);
                    if (newName && newName.trim()) {
                        await updateDoc(doc(db, 'projects', currentProjectId, 'groups', b.dataset.id), { name: newName.trim() });
                    }
                },
                onDelete: async () => {
                    if (confirm('確定刪除這個小組？已登錄的領用/歸還紀錄不會被刪除，但將顯示為「未知小組」；小組底下的使用場地也會一併刪除。')) {
                        const subLocs = getSubLocationsByGroup(b.dataset.id);
                        for (const s of subLocs) {
                            await deleteDoc(doc(db, 'projects', currentProjectId, 'sublocations', s.docId));
                        }
                        await deleteDoc(doc(db, 'projects', currentProjectId, 'groups', b.dataset.id));
                    }
                }
            });
        };
    });

    document.querySelectorAll('.btn-add-subloc').forEach(b => {
        b.onclick = async () => {
            const input = document.querySelector(`.subloc-new-input[data-group="${b.dataset.group}"]`);
            const name = input.value.trim();
            if (!name) return;
            try {
                const maxOrder = getSubLocationsByGroup(b.dataset.group).reduce((m, s) => Math.max(m, s.order ?? 0), -1);
                await addDoc(collection(db, 'projects', currentProjectId, 'sublocations'), { groupId: b.dataset.group, name, order: maxOrder + 1 });
                input.value = '';
            } catch (err) {
                alert(firestoreErrorMessage('新增使用場地', err));
            }
        };
    });
    document.querySelectorAll('.subloc-menu-btn').forEach(b => {
        b.onclick = () => {
            const list = getSubLocationsByGroup(b.dataset.group);
            const idx = list.findIndex(s => s.docId === b.dataset.id);
            openListItemActionSheet({
                canMoveUp: idx > 0,
                canMoveDown: idx >= 0 && idx < list.length - 1,
                onMoveUp: () => moveSubLocation(b.dataset.group, b.dataset.id, -1),
                onMoveDown: () => moveSubLocation(b.dataset.group, b.dataset.id, 1),
                onEdit: async () => {
                    const newName = prompt('修改使用場地名稱：', b.dataset.name);
                    if (newName && newName.trim()) {
                        await updateDoc(doc(db, 'projects', currentProjectId, 'sublocations', b.dataset.id), { name: newName.trim() });
                    }
                },
                onDelete: async () => {
                    if (confirm('確定刪除這個使用場地？已登錄的領用/歸還紀錄不會被刪除，但將顯示為「未指定使用場地」。')) {
                        await deleteDoc(doc(db, 'projects', currentProjectId, 'sublocations', b.dataset.id));
                    }
                }
            });
        };
    });
}

async function moveSubLocation(groupId, docId, direction) {
    const list = getSubLocationsByGroup(groupId);
    const idx = list.findIndex(s => s.docId === docId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx], b = list[swapIdx];
    await updateDoc(doc(db, 'projects', currentProjectId, 'sublocations', a.docId), { order: b.order ?? 0 });
    await updateDoc(doc(db, 'projects', currentProjectId, 'sublocations', b.docId), { order: a.order ?? 0 });
}

// ============ 網網相連（常用外部連結） ============
function isValidHttpUrl(url) {
    return /^https?:\/\/\S+$/i.test(url);
}

function renderLinksSettings() {
    const countEl = document.getElementById('linkCount');
    if (countEl) countEl.textContent = `${rawLinks.length} 項 ▾`;

    const el = document.getElementById('linkList');
    if (!el) return;
    if (rawLinks.length === 0) {
        el.innerHTML = `<div class="text-xs text-[var(--brown-300)] py-2">尚無連結，新增後會出現在這裡。</div>`;
        return;
    }
    el.innerHTML = rawLinks.map((l) => `
        <div class="qp-row flex items-center gap-1 px-3">
            <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="flex-1 text-sm font-bold text-blue-700 truncate">🔗 ${escapeHtml(l.name)}</a>
            <button class="qp-icon-btn link-menu-btn text-[var(--brown-500)]" data-id="${l.docId}" data-name="${escapeHtml(l.name)}" data-url="${escapeHtml(l.url)}">⋮</button>
        </div>
    `).join('');

    document.querySelectorAll('.link-menu-btn').forEach(b => {
        b.onclick = () => {
            const idx = rawLinks.findIndex(l => l.docId === b.dataset.id);
            openListItemActionSheet({
                canMoveUp: idx > 0,
                canMoveDown: idx >= 0 && idx < rawLinks.length - 1,
                onMoveUp: () => moveLink(b.dataset.id, -1),
                onMoveDown: () => moveLink(b.dataset.id, 1),
                onEdit: async () => {
                    const newName = prompt('修改連結名稱：', b.dataset.name);
                    if (newName === null) return;
                    const newUrl = prompt('修改網址：', b.dataset.url);
                    if (newUrl === null) return;
                    if (!newName.trim() || !isValidHttpUrl(newUrl.trim())) return alert('請輸入名稱，以及 http:// 或 https:// 開頭的網址');
                    await updateDoc(doc(db, 'projects', currentProjectId, 'links', b.dataset.id), { name: newName.trim(), url: newUrl.trim() });
                },
                onDelete: async () => {
                    if (confirm('確定刪除這個連結？')) {
                        await deleteDoc(doc(db, 'projects', currentProjectId, 'links', b.dataset.id));
                    }
                }
            });
        };
    });
}

async function moveLink(docId, direction) {
    const idx = rawLinks.findIndex(l => l.docId === docId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= rawLinks.length) return;
    const a = rawLinks[idx], b = rawLinks[swapIdx];
    await updateDoc(doc(db, 'projects', currentProjectId, 'links', a.docId), { order: b.order ?? 0 });
    await updateDoc(doc(db, 'projects', currentProjectId, 'links', b.docId), { order: a.order ?? 0 });
}

async function addLink() {
    const nameInput = document.getElementById('linkNewName');
    const urlInput = document.getElementById('linkNewUrl');
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !isValidHttpUrl(url)) return alert('請輸入連結名稱，以及 http:// 或 https:// 開頭的網址');
    try {
        const maxOrder = rawLinks.reduce((m, l) => Math.max(m, l.order ?? 0), -1);
        await addDoc(collection(db, 'projects', currentProjectId, 'links'), { name, url, order: maxOrder + 1 });
        nameInput.value = ''; urlInput.value = '';
    } catch (err) {
        alert(firestoreErrorMessage('新增連結', err));
    }
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
// 一次性搬遷：v0.0.15 以前「來源單位」快捷選項不分外部/自有，共用同一個 category。
// 依照該來源單位過去實際登錄時的 sourceType 統計，自動歸類到 source_external 或
// source_own；搬遷後舊分類就不會再有任何文件，之後每次呼叫都會直接短路，不需要額外
// 的旗標或 transaction 保護。
async function migrateSourceQuickpicksIfNeeded(projectId) {
    const qpSnap = await getDocs(collection(db, 'projects', projectId, 'quickpicks'));
    const legacyDocs = qpSnap.docs.filter(d => d.data().category === 'source');
    if (legacyDocs.length === 0) return;

    const sourcesSnap = await getDocs(collection(db, 'projects', projectId, 'sources'));
    const usageByValue = {};
    sourcesSnap.forEach(d => {
        const data = d.data();
        if (!usageByValue[data.source]) usageByValue[data.source] = { external: 0, own: 0 };
        usageByValue[data.source][data.sourceType === 'own' ? 'own' : 'external']++;
    });

    for (const docSnap of legacyDocs) {
        const value = docSnap.data().value;
        const usage = usageByValue[value];
        const category = usage && usage.own > usage.external ? 'source_own' : 'source_external';
        await updateDoc(doc(db, 'projects', projectId, 'quickpicks', docSnap.id), { category });
    }
}

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
        const row = document.getElementById(selectId);
        if (!row) return;
        const block = document.getElementById(`qpBlock-${inputId}`);
        const resolvedCategory = typeof category === 'function' ? category() : category;
        const items = quickpicksByCategory(resolvedCategory);
        if (block) block.classList.toggle('hidden', items.length === 0);
        const input = document.getElementById(inputId);
        row.innerHTML = items.map(q => {
            const stock = showStock ? getItemRemaining(q.value) : null;
            const selected = input && input.value.trim() === q.value;
            return `<button type="button" class="qp-chip shrink-0${selected ? ' is-selected' : ''}" data-value="${escapeHtml(q.value)}">${escapeHtml(q.value)}${stock !== null ? ` <span class="qp-chip-stock">${stock}</span>` : ''}</button>`;
        }).join('');
        row.querySelectorAll('.qp-chip').forEach(btn => {
            btn.onclick = () => {
                input.value = btn.dataset.value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                row.querySelectorAll('.qp-chip').forEach(b => b.classList.toggle('is-selected', b === btn));
            };
        });
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

        listEl.innerHTML = items.map((q) => `
            <div class="qp-row flex items-center gap-1 px-3">
                <span class="flex-1 text-sm font-bold text-[var(--brown-800)] truncate">${escapeHtml(q.value)}</span>
                <button class="qp-icon-btn qp-menu-btn text-[var(--brown-500)]" data-category="${category}" data-id="${q.docId}" data-value="${escapeHtml(q.value)}">⋮</button>
            </div>
        `).join('');
    });

    bindQuickpickSettingsEvents();
}

function bindQuickpickSettingsEvents() {
    document.querySelectorAll('.qp-menu-btn').forEach(b => {
        b.onclick = () => {
            const category = b.dataset.category;
            const items = quickpicksByCategory(category);
            const idx = items.findIndex(q => q.docId === b.dataset.id);
            openListItemActionSheet({
                canMoveUp: idx > 0,
                canMoveDown: idx >= 0 && idx < items.length - 1,
                onMoveUp: () => moveQuickpick(category, b.dataset.id, -1),
                onMoveDown: () => moveQuickpick(category, b.dataset.id, 1),
                onEdit: async () => {
                    const newValue = prompt('修改快捷選項內容：', b.dataset.value);
                    if (newValue && newValue.trim()) {
                        await updateDoc(doc(db, 'projects', currentProjectId, 'quickpicks', b.dataset.id), { value: newValue.trim() });
                    }
                },
                onDelete: async () => {
                    if (confirm('確定刪除這個快捷選項？')) {
                        await deleteDoc(doc(db, 'projects', currentProjectId, 'quickpicks', b.dataset.id));
                    }
                }
            });
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

// 某物品在某小組（可選：某個使用場地）名下的所有領用/歸還原始紀錄
// subLocationFilter 不傳＝不篩選場地；傳 UNASSIGNED_SUBLOCATION＝只算未指定場地的部分
function getCustodyRecords(itemName, groupId, subLocationFilter) {
    let allocs = rawAllocations.filter(a => a.item === itemName && String(a.groupId) === String(groupId));
    let rets = rawReturns.filter(r => r.item === itemName && String(r.groupId) === String(groupId));
    if (subLocationFilter !== undefined) {
        const matchesSubLocation = (rec) => subLocationFilter === UNASSIGNED_SUBLOCATION
            ? !rec.subLocationId
            : String(rec.subLocationId || '') === String(subLocationFilter);
        allocs = allocs.filter(matchesSubLocation);
        rets = rets.filter(matchesSubLocation);
    }
    return { allocs, rets };
}

// 該小組（可選：某個使用場地）目前領用中、尚未歸還的某物品數量
function getGroupOutstanding(itemName, groupId, subLocationFilter) {
    const { allocs, rets } = getCustodyRecords(itemName, groupId, subLocationFilter);
    return allocs.reduce((sum, a) => sum + a.qty, 0) - rets.reduce((sum, r) => sum + r.qty, 0);
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
        el.className = 'text-xs font-bold mt-1.5 min-h-[1em] text-amber-600';
        return;
    }
    el.textContent = `↩️ ${groupLabel} 目前領用中尚未歸還：${outstanding} 件`;
    el.className = 'text-xs font-bold mt-1.5 min-h-[1em] text-blue-700';
}

// ============ 總覽（依物品彙總，取代舊版「物資總表／借用報表／目前位置」三個畫面） ============
function timestampToDate(ts) {
    return ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts instanceof Date ? ts : null);
}

function allocReturnEvents(allocs, rets) {
    return [
        ...allocs.map(a => ({ ts: a.timestamp, icon: '📤', verb: '領出', qty: a.qty, handler: a.user, serial: a.serial, collection: 'allocations', docId: a.docId })),
        ...rets.map(r => ({ ts: r.timestamp, icon: '📋', verb: '歸還', qty: r.qty, handler: r.receiver, serial: r.serial, note: r.note, collection: 'returns', docId: r.docId }))
    ];
}

function sourceEvents(sources) {
    return sources.map(s => {
        const originLabel = s.sourceType === 'own' ? '自有／存放位置' : s.sourceType === 'external' ? '外部借入' : '';
        return {
            ts: s.timestamp, icon: '📥', verb: '入庫', qty: s.qty, handler: s.source, serial: s.serial,
            collection: 'sources', docId: s.docId,
            originIcon: originLabel ? sourceTypeIcon(s.sourceType) : '', originLabel
        };
    });
}

// 把一組事件整理成「最新異動日期」＋「逐筆明細 HTML」，保管中／全部歷史／庫房待發列共用；
// 每筆明細都帶「⋮」可直接編輯/刪除該筆原始紀錄，跟入庫/領用/歸還紀錄共用同一套操作選單。
function buildCustodyDetail(events) {
    const sorted = [...events].sort((x, y) => (timestampToDate(y.ts)?.getTime() ?? 0) - (timestampToDate(x.ts)?.getTime() ?? 0));
    const latestDate = sorted.length ? formatTimestamp(sorted[0].ts) : '-';
    const detailHtml = sorted.map(e => {
        const serial = formatSerial(e.serial);
        const origin = e.originIcon ? ` ${e.originIcon}${e.originLabel}` : '';
        return `<div class="flex items-center gap-1.5">
            <span class="flex-1">${serial ? `<b class="text-[var(--brown-500)]">${serial}</b> ` : ''}${e.icon} ${e.verb}${origin} <b>${e.qty}</b>（${escapeHtml(e.handler)}）・${formatTimestamp(e.ts)}${e.note ? `・備註：${escapeHtml(e.note)}` : ''}</span>
            <button type="button" class="record-menu-btn qp-icon-btn text-[var(--brown-500)] shrink-0" data-collection="${e.collection}" data-id="${e.docId}">⋮</button>
        </div>`;
    }).join('') || `<div class="text-[var(--brown-300)]">尚無詳細紀錄</div>`;
    return { latestDate, detailHtml };
}

function overviewRowHtml({ icon, label, rightHtml, events }) {
    const { latestDate, detailHtml } = buildCustodyDetail(events);
    return `
        <details class="plain-details">
            <summary class="ios-list-row">
                <span>${icon}</span>
                <span class="flex-1 text-sm font-bold text-[var(--brown-800)] truncate">${escapeHtml(label)}</span>
                <span class="text-[10px] text-[var(--brown-400)] shrink-0">${latestDate}</span>
                ${rightHtml}
                <span class="detail-caret text-[var(--brown-300)] shrink-0">▾</span>
            </summary>
            <div class="px-4 pb-3 pt-1 space-y-1 text-xs text-[var(--brown-500)] border-t border-[rgba(216,188,133,0.35)]">${detailHtml}</div>
        </details>
    `;
}

// 依小組（有使用場地就再拆一層）列舉出「保管單位桶」，保管中／全部歷史模式共用
function custodyBuckets(groupId, groupName) {
    const subLocs = getSubLocationsByGroup(groupId);
    if (subLocs.length === 0) return [{ filter: undefined, label: groupName }];
    return [
        ...subLocs.map(s => ({ filter: s.docId, label: `${groupName} 📍${s.name}` })),
        { filter: UNASSIGNED_SUBLOCATION, label: `${groupName}（未指定場地）` }
    ];
}

// 保管中模式：一列＝一個目前有庫存的保管位置（庫房待發／小組／小組＋使用場地）
function renderOverviewActiveRows(itemName, groupFilter) {
    const rows = [];
    if (!groupFilter) {
        const remaining = getItemRemaining(itemName);
        if (remaining > 0) {
            const itemSrcs = rawSources.filter(s => s.item === itemName);
            const originIcons = Array.from(new Set(itemSrcs.filter(s => s.sourceType === 'own' || s.sourceType === 'external').map(s => sourceTypeIcon(s.sourceType)))).join('');
            rows.push(overviewRowHtml({
                icon: '📦', label: originIcons ? `庫房待發 ${originIcons}` : '庫房待發',
                rightHtml: `<b class="stat-value text-[var(--brown-700)] shrink-0">${remaining}</b>`,
                events: sourceEvents(itemSrcs)
            }));
        }
    }
    const groupsToShow = groupFilter ? rawGroups.filter(g => g.docId === groupFilter) : rawGroups;
    groupsToShow.forEach(g => {
        custodyBuckets(g.docId, g.name).forEach(bucket => {
            const { allocs, rets } = getCustodyRecords(itemName, g.docId, bucket.filter);
            const qty = allocs.reduce((s, a) => s + a.qty, 0) - rets.reduce((s, r) => s + r.qty, 0);
            if (qty <= 0) return;
            rows.push(overviewRowHtml({
                icon: '👥', label: bucket.label,
                rightHtml: `<b class="stat-value text-[var(--brown-700)] shrink-0">${qty}</b>`,
                events: allocReturnEvents(allocs, rets)
            }));
        });
    });
    return rows.join('');
}

// 全部歷史模式：一列＝一個小組（＋使用場地）針對這個物品的累計借用（不因歸還而減少）
function renderOverviewHistoryRows(itemName, groupFilter) {
    const rows = [];
    const groupsToShow = groupFilter ? rawGroups.filter(g => g.docId === groupFilter) : rawGroups;
    groupsToShow.forEach(g => {
        custodyBuckets(g.docId, g.name).forEach(bucket => {
            const { allocs, rets } = getCustodyRecords(itemName, g.docId, bucket.filter);
            const total = allocs.reduce((s, a) => s + a.qty, 0);
            if (total === 0) return;
            const outstanding = total - rets.reduce((s, r) => s + r.qty, 0);
            const statusHtml = outstanding > 0 ? `<span class="text-rose-600 font-bold">未還${outstanding}</span>` : `<span class="text-emerald-600 font-bold">已歸還</span>`;
            rows.push(overviewRowHtml({
                icon: '👥', label: bucket.label,
                rightHtml: `<span class="text-xs text-[var(--brown-500)] shrink-0">累計<b class="stat-value">${total}</b>・${statusHtml}</span>`,
                events: allocReturnEvents(allocs, rets)
            }));
        });
    });
    return rows.join('');
}

function renderOverviewList() {
    const listWrap = document.getElementById('overviewList');
    if (!listWrap) return;

    const allItems = Array.from(new Set([...rawSources.map(s => s.item), ...rawAllocations.map(a => a.item), ...rawReturns.map(r => r.item)])).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

    if (allItems.length === 0) {
        listWrap.innerHTML = `<div class="ios-list"><div class="ios-list-row"><span class="text-sm text-[var(--brown-300)]">目前尚無庫存異動紀錄，請前往【進出作業】分頁登錄。</span></div></div>`;
        return;
    }

    const searchInput = document.getElementById('ovSearch');
    const searchText = (searchInput?.value || '').trim();
    searchInput?.closest('.ios-search')?.classList.toggle('has-text', !!searchText);
    const mode = document.querySelector('.ov-seg-btn.is-active')?.dataset.mode || 'active';
    const groupFilter = document.getElementById('invFilterGroup')?.value || '';

    const displayItems = searchText ? allItems.filter(name => name.includes(searchText)) : allItems;

    if (displayItems.length === 0) {
        listWrap.innerHTML = `<div class="ios-list"><div class="ios-list-row"><span class="text-sm text-[var(--brown-300)]">沒有符合「${escapeHtml(searchText)}」的物品。</span></div></div>`;
        return;
    }

    const sections = displayItems.map(itemName => {
        const rowsHtml = mode === 'all' ? renderOverviewHistoryRows(itemName, groupFilter) : renderOverviewActiveRows(itemName, groupFilter);
        if (!rowsHtml) return '';
        return `
            <div>
                <p class="ios-section-header">${escapeHtml(itemName)}</p>
                <div class="ios-list">${rowsHtml}</div>
            </div>
        `;
    }).filter(Boolean).join('');

    listWrap.innerHTML = sections || `<div class="ios-list"><div class="ios-list-row"><span class="text-sm text-[var(--brown-300)]">${groupFilter ? '這個小組目前沒有符合條件的紀錄。' : '沒有符合條件的紀錄。'}</span></div></div>`;
    bindRecordMenuButtons();
}

// 沿用舊函式名稱，減少呼叫端（各 onSnapshot 監聽器）需要調整的範圍
function calculateAndRenderInventory() {
    updateAllocStockHint();
    updateRetOutstandingHint();
    renderAllChips();
    renderOverviewList();
}

// 全新的入庫來源交易紀錄：以個別入庫事件（而非依物品彙總）列出，預設只顯示物品名稱與
// 數量，點擊展開才看到單號、來源類型、方式、備註與時間等完整資訊。
function formatTimestamp(ts) {
    const d = timestampToDate(ts);
    if (!d) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 每一筆入庫/領用/歸還紀錄的「⋮」都指向同一個底部操作選單（不會被清單捲動範圍裁切）
function bindRecordMenuButtons() {
    document.querySelectorAll('.record-menu-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openRecordActionSheet(btn.dataset.collection, btn.dataset.id);
        };
    });
}

let actionSheetTarget = null; // { collection: 'sources'|'allocations'|'returns', docId }

function openRecordActionSheet(collectionName, docId) {
    actionSheetTarget = { collection: collectionName, docId };
    document.getElementById('recordActionSheet').classList.remove('hidden');
}

function closeRecordActionSheet() {
    actionSheetTarget = null;
    document.getElementById('recordActionSheet').classList.add('hidden');
}

// ============ 設定頁清單項目操作選單（快捷選項／小組／使用場地／連結共用「⋮」） ============
let listItemActionTarget = null;

function openListItemActionSheet({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, onEdit, onDelete }) {
    listItemActionTarget = { onMoveUp, onMoveDown, onEdit, onDelete };
    document.getElementById('btnListItemMoveUp').classList.toggle('hidden', !canMoveUp);
    document.getElementById('btnListItemMoveDown').classList.toggle('hidden', !canMoveDown);
    document.getElementById('listItemActionSheet').classList.remove('hidden');
}

function closeListItemActionSheet() {
    listItemActionTarget = null;
    document.getElementById('listItemActionSheet').classList.add('hidden');
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
                        <button type="button" class="record-menu-btn qp-icon-btn text-[var(--brown-500)]" data-collection="sources" data-id="${s.docId}">⋮</button>
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

    bindRecordMenuButtons();
}

function renderAllocationLog() {
    const el = document.getElementById('allocationLog');
    if (!el) return;

    if (rawAllocations.length === 0) {
        el.innerHTML = `<div class="p-8 text-center text-[var(--brown-300)] font-medium text-sm">目前尚無領用紀錄。</div>`;
        return;
    }

    const sorted = [...rawAllocations].sort((a, b) => (b.serial ?? 0) - (a.serial ?? 0));
    el.innerHTML = sorted.map(a => {
        const serial = formatSerial(a.serial);
        const g = findGroupByStoredId(a.groupId);
        const sl = findSubLocationById(a.subLocationId);
        return `
            <details>
                <summary class="px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 cursor-pointer select-none">
                    <span class="font-bold text-[var(--brown-900)] text-sm truncate">${serial ? `<span class="text-[var(--brown-400)] font-normal">${serial}</span> ` : ''}${escapeHtml(a.item)}</span>
                    <span class="flex items-center gap-1.5 shrink-0">
                        <span class="text-xs text-[var(--brown-500)] font-bold">x${a.qty} ▾</span>
                        <button type="button" class="record-menu-btn qp-icon-btn text-[var(--brown-500)]" data-collection="allocations" data-id="${a.docId}">⋮</button>
                    </span>
                </summary>
                <div class="px-4 pb-3 text-xs text-[var(--brown-500)] space-y-1">
                    <div>👥 小組：${g ? escapeHtml(g.name) : '未知小組'}${sl ? ` 📍${escapeHtml(sl.name)}` : ''}</div>
                    <div>🖊️ 領用人：${escapeHtml(a.user)}</div>
                    <div>🕒 登錄時間：${formatTimestamp(a.timestamp)}</div>
                </div>
            </details>
        `;
    }).join('');

    bindRecordMenuButtons();
}

function renderReturnLog() {
    const el = document.getElementById('returnLog');
    if (!el) return;

    if (rawReturns.length === 0) {
        el.innerHTML = `<div class="p-8 text-center text-[var(--brown-300)] font-medium text-sm">目前尚無歸還紀錄。</div>`;
        return;
    }

    const sorted = [...rawReturns].sort((a, b) => (b.serial ?? 0) - (a.serial ?? 0));
    el.innerHTML = sorted.map(r => {
        const serial = formatSerial(r.serial);
        const g = findGroupByStoredId(r.groupId);
        const sl = findSubLocationById(r.subLocationId);
        return `
            <details>
                <summary class="px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 cursor-pointer select-none">
                    <span class="font-bold text-[var(--brown-900)] text-sm truncate">${serial ? `<span class="text-[var(--brown-400)] font-normal">${serial}</span> ` : ''}${escapeHtml(r.item)}</span>
                    <span class="flex items-center gap-1.5 shrink-0">
                        <span class="text-xs text-[var(--brown-500)] font-bold">x${r.qty} ▾</span>
                        <button type="button" class="record-menu-btn qp-icon-btn text-[var(--brown-500)]" data-collection="returns" data-id="${r.docId}">⋮</button>
                    </span>
                </summary>
                <div class="px-4 pb-3 text-xs text-[var(--brown-500)] space-y-1">
                    <div>👥 小組：${g ? escapeHtml(g.name) : '未知小組'}${sl ? ` 📍${escapeHtml(sl.name)}` : ''}</div>
                    <div>🖊️ 點收人：${escapeHtml(r.receiver)}</div>
                    <div>📝 備註：${r.note ? escapeHtml(r.note) : '-'}</div>
                    <div>🕒 登錄時間：${formatTimestamp(r.timestamp)}</div>
                </div>
            </details>
        `;
    }).join('');

    bindRecordMenuButtons();
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

let editingAllocationId = null;

function openEditAllocationModal(docId) {
    const rec = rawAllocations.find(a => a.docId === docId);
    if (!rec) return;
    editingAllocationId = docId;
    document.getElementById('editAllocItem').value = rec.item || '';
    document.getElementById('editAllocGroup').value = String(rec.groupId ?? '');
    document.getElementById('editAllocQty').value = rec.qty ?? '';
    document.getElementById('editAllocUser').value = rec.user || '';
    refreshSubLocationSelect('editAllocGroup', 'editAllocSubLocation');
    document.getElementById('editAllocSubLocation').value = rec.subLocationId || '';
    document.getElementById('editAllocationModal').classList.remove('hidden');
}

function closeEditAllocationModal() {
    editingAllocationId = null;
    document.getElementById('editAllocationModal').classList.add('hidden');
}

async function saveEditedAllocation() {
    if (!editingAllocationId || !currentProjectId) return;
    const item = document.getElementById('editAllocItem').value.trim();
    const groupId = document.getElementById('editAllocGroup').value;
    const subLocationId = document.getElementById('editAllocSubLocation').value;
    const qty = parseInt(document.getElementById('editAllocQty').value);
    const user = document.getElementById('editAllocUser').value.trim();
    if (!item || isNaN(qty) || !user) return alert('填寫不完整');

    try {
        await updateDoc(doc(db, 'projects', currentProjectId, 'allocations', editingAllocationId), { item, groupId, subLocationId, qty, user });
        closeEditAllocationModal();
    } catch (err) {
        alert(firestoreErrorMessage('儲存修改', err));
    }
}

let editingReturnId = null;

function openEditReturnModal(docId) {
    const rec = rawReturns.find(r => r.docId === docId);
    if (!rec) return;
    editingReturnId = docId;
    document.getElementById('editRetItem').value = rec.item || '';
    document.getElementById('editRetGroup').value = String(rec.groupId ?? '');
    document.getElementById('editRetQty').value = rec.qty ?? '';
    document.getElementById('editRetReceiver').value = rec.receiver || '';
    document.getElementById('editRetNote').value = rec.note || '';
    refreshSubLocationSelect('editRetGroup', 'editRetSubLocation');
    document.getElementById('editRetSubLocation').value = rec.subLocationId || '';
    document.getElementById('editReturnModal').classList.remove('hidden');
}

function closeEditReturnModal() {
    editingReturnId = null;
    document.getElementById('editReturnModal').classList.add('hidden');
}

async function saveEditedReturn() {
    if (!editingReturnId || !currentProjectId) return;
    const item = document.getElementById('editRetItem').value.trim();
    const groupId = document.getElementById('editRetGroup').value;
    const subLocationId = document.getElementById('editRetSubLocation').value;
    const qty = parseInt(document.getElementById('editRetQty').value);
    const receiver = document.getElementById('editRetReceiver').value.trim();
    const note = document.getElementById('editRetNote').value.trim();
    if (!item || isNaN(qty) || !receiver) return alert('填寫不完整');

    try {
        await updateDoc(doc(db, 'projects', currentProjectId, 'returns', editingReturnId), { item, groupId, subLocationId, qty, receiver, note });
        closeEditReturnModal();
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

    document.getElementById('btnCloseEditAllocation').onclick = closeEditAllocationModal;
    document.getElementById('editAllocationModal').addEventListener('click', (e) => {
        if (e.target.id === 'editAllocationModal') closeEditAllocationModal();
    });
    document.getElementById('btnSaveEditAllocation').onclick = saveEditedAllocation;

    document.getElementById('btnCloseEditReturn').onclick = closeEditReturnModal;
    document.getElementById('editReturnModal').addEventListener('click', (e) => {
        if (e.target.id === 'editReturnModal') closeEditReturnModal();
    });
    document.getElementById('btnSaveEditReturn').onclick = saveEditedReturn;

    document.getElementById('btnRecordMenuCancel').onclick = closeRecordActionSheet;
    document.getElementById('recordActionSheet').addEventListener('click', (e) => {
        if (e.target.id === 'recordActionSheet') closeRecordActionSheet();
    });
    document.getElementById('btnRecordMenuEdit').onclick = () => {
        const target = actionSheetTarget;
        closeRecordActionSheet();
        if (!target) return;
        if (target.collection === 'sources') openEditSourceModal(target.docId);
        else if (target.collection === 'allocations') openEditAllocationModal(target.docId);
        else if (target.collection === 'returns') openEditReturnModal(target.docId);
    };
    document.getElementById('btnRecordMenuDelete').onclick = async () => {
        const target = actionSheetTarget;
        closeRecordActionSheet();
        if (!target || !currentProjectId) return;
        const labels = { sources: '入庫', allocations: '領用', returns: '歸還' };
        const rawByCollection = { sources: rawSources, allocations: rawAllocations, returns: rawReturns };
        const rec = rawByCollection[target.collection]?.find(r => r.docId === target.docId);
        const label = labels[target.collection] || '';
        if (!confirm(`確定刪除這筆${label}紀錄？${rec ? `（${rec.item} x${rec.qty}）` : ''}此動作無法復原。`)) return;
        try {
            await deleteDoc(doc(db, 'projects', currentProjectId, target.collection, target.docId));
        } catch (err) {
            alert(firestoreErrorMessage(`刪除${label}紀錄`, err));
        }
    };

    document.getElementById('btnListItemCancel').onclick = closeListItemActionSheet;
    document.getElementById('listItemActionSheet').addEventListener('click', (e) => {
        if (e.target.id === 'listItemActionSheet') closeListItemActionSheet();
    });
    document.getElementById('btnListItemMoveUp').onclick = () => { const t = listItemActionTarget; closeListItemActionSheet(); t?.onMoveUp?.(); };
    document.getElementById('btnListItemMoveDown').onclick = () => { const t = listItemActionTarget; closeListItemActionSheet(); t?.onMoveDown?.(); };
    document.getElementById('btnListItemEdit').onclick = () => { const t = listItemActionTarget; closeListItemActionSheet(); t?.onEdit?.(); };
    document.getElementById('btnListItemDelete').onclick = () => { const t = listItemActionTarget; closeListItemActionSheet(); t?.onDelete?.(); };

    document.getElementById('btnAddGroup').onclick = addGroup;
    document.getElementById('newGroupName').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addGroup(); }
    });

    document.getElementById('btnAddLink').onclick = addLink;
    document.getElementById('linkNewUrl').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addLink(); }
    });

    document.getElementById('srcMethod').addEventListener('change', (e) => {
        document.getElementById('srcMethodOther').classList.toggle('hidden', e.target.value !== '其他');
    });

    document.getElementById('srcType').addEventListener('change', (e) => {
        const input = document.getElementById('srcUnit');
        input.placeholder = e.target.value === 'own' ? '存放位置(如:衛生器材室、A棟2樓)' : '外部單位名稱(如:302旅)';
        updateMethodWrapVisibility('srcMethodWrap', e.target.value);
        renderAllChips();
    });

    document.getElementById('allocItem').addEventListener('input', updateAllocStockHint);
    document.getElementById('retItem').addEventListener('input', updateRetOutstandingHint);
    document.getElementById('retGroup').addEventListener('change', updateRetOutstandingHint);
    document.getElementById('allocGroup').addEventListener('change', () => refreshSubLocationSelect('allocGroup', 'allocSubLocation'));
    document.getElementById('retGroup').addEventListener('change', () => refreshSubLocationSelect('retGroup', 'retSubLocation'));
    document.getElementById('editAllocGroup').addEventListener('change', () => refreshSubLocationSelect('editAllocGroup', 'editAllocSubLocation'));
    document.getElementById('editRetGroup').addEventListener('change', () => refreshSubLocationSelect('editRetGroup', 'editRetSubLocation'));

    document.getElementById('ovSearch').addEventListener('input', renderOverviewList);
    document.getElementById('ovSearchClear').addEventListener('click', () => {
        const input = document.getElementById('ovSearch');
        input.value = '';
        input.focus();
        renderOverviewList();
    });
    document.querySelectorAll('.ov-seg-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.ov-seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
            renderOverviewList();
        };
    });
    document.getElementById('invFilterGroup').addEventListener('change', renderOverviewList);

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
        await ensureQuickpick(sourceType === 'own' ? 'source_own' : 'source_external', source);
        document.getElementById('srcItem').value = ''; document.getElementById('srcQty').value = '';
        document.getElementById('srcMethodOther').value = ''; document.getElementById('srcMethodOther').classList.add('hidden');
        document.getElementById('srcMethod').value = '借據';
        showToast('✅ 登錄完成');
    };

    document.getElementById('btnAllocSubmit').onclick = async () => {
        if (!currentProjectId) return;
        const item = document.getElementById('allocItem').value.trim();
        const groupId = document.getElementById('allocGroup').value;
        const subLocationId = document.getElementById('allocSubLocation').value;
        const qty = parseInt(document.getElementById('allocQty').value);
        const user = document.getElementById('allocUser').value.trim();
        if (!item || isNaN(qty) || !user) return alert("填寫不完整");

        const remaining = getItemRemaining(item);
        if (qty > remaining) {
            if (!confirm(`目前庫房剩餘只有 ${remaining} 件「${item}」，仍要領用 ${qty} 件嗎？`)) return;
        }

        const serial = await getNextSerialNumber();
        await addDoc(collection(db, 'projects', currentProjectId, 'allocations'), { item, groupId, subLocationId, qty, user, serial, timestamp: new Date() });
        await ensureQuickpick('item', item);
        await ensureQuickpick('person', user);
        document.getElementById('allocItem').value = ''; document.getElementById('allocQty').value = '';
        updateAllocStockHint();
    };

    document.getElementById('btnRetSubmit').onclick = async () => {
        if (!currentProjectId) return;
        const item = document.getElementById('retItem').value.trim();
        const groupId = document.getElementById('retGroup').value;
        const subLocationId = document.getElementById('retSubLocation').value;
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
        await addDoc(collection(db, 'projects', currentProjectId, 'returns'), { item, groupId, subLocationId, qty, receiver, note, serial, timestamp: new Date() });
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
