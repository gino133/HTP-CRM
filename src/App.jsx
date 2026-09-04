import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Users, Package, FileText, BarChart3, Plus, X, ChevronRight,
  ChevronLeft, Search, Trash2, Pencil, ArrowLeft, TrendingUp, TrendingDown,
  Check, Phone, Mail, MapPin, Building2, Lock, Minus, ListChecks, CheckCircle2,
  Circle, Clock, Repeat, CalendarDays, Send, Copy, Settings, Sun, Moon, Smartphone, Bell
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/* ---------------------------------- THEME ---------------------------------- */
let C = {
  navy: "#152A61",
  navySoft: "#22397A",
  bg: "#F4F5F9",
  card: "#FFFFFF",
  border: "#E6E8F0",
  text: "#191D2B",
  sub: "#6B7280",
  green: "#1E8E5A",
  greenBg: "#E9F8F0",
  amber: "#B8790A",
  amberBg: "#FDF3E2",
  red: "#D64545",
  redBg: "#FDECEC",
  blue: "#2563EB",
  blueBg: "#EAF1FE",
  navyBg: "#EEF0F8",
  neutralBg: "#F1F2F6",
  inputBg: "#FAFBFD",
  trackBg: "#EDEEF3",
};

/* ---------------------------------- THEME (tông màu + sáng/tối) ---------------------------------- */
const TONES = {
  navy: { label: "Xanh navy", primary: "#152A61", soft: "#22397A", lightBg: "#EEF0F8" },
  blue: { label: "Xanh dương", primary: "#1D4ED8", soft: "#2F63E0", lightBg: "#E9F0FE" },
  green: { label: "Xanh lá", primary: "#0F7A48", soft: "#159A5B", lightBg: "#E7F6EE" },
  purple: { label: "Tím", primary: "#6D28D9", soft: "#7C3AED", lightBg: "#F1EAFE" },
  rose: { label: "Đỏ hồng", primary: "#BE123C", soft: "#E11D48", lightBg: "#FCEAEF" },
  amber: { label: "Cam", primary: "#B45309", soft: "#D97706", lightBg: "#FDF1E3" },
};

function computeColors(mode, toneKey) {
  const tone = TONES[toneKey] || TONES.navy;
  const dark = mode === "dark";
  return {
    navy: tone.primary,
    navySoft: tone.soft,
    bg: dark ? "#0F1117" : "#F4F5F9",
    card: dark ? "#1A1D27" : "#FFFFFF",
    border: dark ? "#2B2F3B" : "#E6E8F0",
    text: dark ? "#F0F1F5" : "#191D2B",
    sub: dark ? "#9096A8" : "#6B7280",
    green: dark ? "#3DBE82" : "#1E8E5A",
    greenBg: dark ? "#1E8E5A2E" : "#E9F8F0",
    amber: dark ? "#E0A63E" : "#B8790A",
    amberBg: dark ? "#B8790A2E" : "#FDF3E2",
    red: dark ? "#F17272" : "#D64545",
    redBg: dark ? "#D645452E" : "#FDECEC",
    blue: dark ? "#5B8DEF" : "#2563EB",
    blueBg: dark ? "#2563EB2E" : "#EAF1FE",
    navyBg: dark ? `${tone.primary}2E` : tone.lightBg,
    neutralBg: dark ? "#242836" : "#F1F2F6",
    inputBg: dark ? "#1F222E" : "#FAFBFD",
    trackBg: dark ? "#2B2F3B" : "#EDEEF3",
  };
}

const getStatusMeta = (key) => ({
  draft: { label: "Nháp", color: C.sub, bg: C.neutralBg },
  sent: { label: "Đã gửi", color: C.blue, bg: C.blueBg },
  won: { label: "Đã chốt", color: C.green, bg: C.greenBg },
  lost: { label: "Từ chối", color: C.red, bg: C.redBg },
  done: { label: "Hoàn thành", color: C.navy, bg: C.navyBg },
})[key];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------------------------------- THÔNG BÁO NHẮC VIỆC (chỉ hoạt động trong app thật, không phải bản xem trước) ----------------------------------
   Truy cập qua window.Capacitor để KHÔNG cần import trực tiếp @capacitor/local-notifications ở đây
   (import trực tiếp sẽ làm hỏng bản xem trước trong Claude, vì thư viện đó không tồn tại ở đó).
   Trong app thật, main.jsx đã import gói này 1 lần để đăng ký plugin, nên window.Capacitor.Plugins.LocalNotifications sẽ có sẵn. */
const getLocalNotif = () => (typeof window !== "undefined" ? window.Capacitor?.Plugins?.LocalNotifications : null);

async function requestNotifPermission() {
  try {
    const LN = getLocalNotif();
    if (!LN) return;
    await LN.requestPermissions();
  } catch (e) {}
}

async function cancelTaskNotification(task) {
  try {
    const LN = getLocalNotif();
    if (!LN || !task?.notifId) return;
    await LN.cancel({ notifications: [{ id: task.notifId }] });
  } catch (e) {}
}

// Đặt (hoặc đặt lại) lịch thông báo cho 1 công việc. Trả về notifId để lưu lại vào task.
async function scheduleTaskNotification(task) {
  const LN = getLocalNotif();
  if (!LN) return task?.notifId || null; // Không phải app thật (vd: đang xem trong Claude) -> bỏ qua
  try {
    const notifId = task.notifId || Math.floor(Math.random() * 2000000000);
    if (task.notifId) {
      await LN.cancel({ notifications: [{ id: task.notifId }] }).catch(() => {});
    }
    if (!task.time) return null; // không đặt giờ -> không nhắc, huỷ hẳn lịch cũ (trả về null)

    const [hh, mm] = task.time.split(":").map(Number);

    if (task.type === "daily") {
      await LN.schedule({
        notifications: [{
          id: notifId,
          title: "⏰ Nhắc việc hằng ngày",
          body: task.title,
          schedule: { on: { hour: hh, minute: mm }, repeats: true, allowWhileIdle: true },
        }],
      });
    } else {
      const [y, m, d] = (task.date || isoDay(new Date())).split("-").map(Number);
      const when = new Date(y, m - 1, d, hh, mm, 0);
      if (when.getTime() <= Date.now()) return null; // giờ đã qua -> không đặt lịch
      await LN.schedule({
        notifications: [{
          id: notifId,
          title: "⏰ Nhắc công việc",
          body: task.title,
          schedule: { at: when, allowWhileIdle: true },
        }],
      });
    }
    return notifId;
  } catch (e) {
    return task?.notifId || null;
  }
}

const money = (n) => (Math.round(n || 0)).toLocaleString("vi-VN") + "đ";
const todayISO = () => new Date().toISOString();
const monthLabel = (d) => {
  const dt = new Date(d);
  return `T${dt.getMonth() + 1}/${dt.getFullYear()}`;
};
const monthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
const quoteCode = (q) => q.code + (q.revision > 0 ? `-R${q.revision}` : "");
// Ngày dùng để tính doanh thu/lợi nhuận: ưu tiên ngày hoàn thành thực tế (đơn đã Hoàn thành),
// nếu chưa hoàn thành (đang Chốt) thì tạm dùng ngày tạo báo giá làm mốc.
const revenueDate = (q) => q.completedAt || q.createdAt;
// Sinh mã báo giá mới theo quy tắc BG/YYYY-XXX, tăng dần theo năm hiện tại
const nextQuoteCode = (allQuotes) => {
  const year = new Date().getFullYear();
  const prefix = `BG/${year}-`;
  const nums = allQuotes
    .map((q) => q.code)
    .filter((c) => c && c.startsWith(prefix))
    .map((c) => parseInt(c.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return prefix + String(next).padStart(3, "0");
};
const isoDay = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; };
const startOfWeek = (d) => { const dt = new Date(d); const day = (dt.getDay() + 6) % 7; return addDays(dt, -day); }; // Monday
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/* ---------------------------------- STORAGE ---------------------------------- */
const STORAGE_KEY = "htp-crm-data";
async function loadAll() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        customers: parsed.customers || [],
        products: parsed.products || [],
        quotes: parsed.quotes || [],
        tasks: parsed.tasks || [],
        themeMode: parsed.themeMode || "system",
        accentTone: parsed.accentTone || "navy",
      };
    }
  } catch (e) {}
  return { customers: [], products: [], quotes: [], tasks: [], themeMode: "system", accentTone: "navy" };
}
async function saveAll(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ---------------------------------- SMALL UI PARTS ---------------------------------- */
function Pill({ label, color, bg }) {
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, icon, tint, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="rounded-2xl p-4 flex-1 text-left" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: C.sub }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: tint + "1A" }}>
          {icon}
        </div>
      </div>
      <div className="text-lg font-bold flex items-center gap-1" style={{ color: C.text }}>
        {value}
        {onClick && <ChevronRight size={14} color={C.sub} />}
      </div>
    </Tag>
  );
}

function EmptyState({ title, sub, actionLabel, onAction, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: C.navy }}>
        {icon}
      </div>
      <div className="font-semibold text-base mb-1" style={{ color: C.text }}>{title}</div>
      <div className="text-sm mb-5" style={{ color: C.sub }}>{sub}</div>
      {actionLabel && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: C.navy }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>{label}</label>
      {children}
    </div>
  );
}

const getInputStyle = () => ({
  width: "100%",
  border: `1px solid ${C.border}`,
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
  color: C.text,
  outline: "none",
  backgroundColor: C.inputBg,
});

function TextInput(props) {
  return <input {...props} style={{ ...getInputStyle(), ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...getInputStyle(), resize: "none", ...(props.style || {}) }} />;
}

/* Bottom sheet wrapper */
function Sheet({ open, onClose, title, children }) {
  return (
    <div
      className="absolute inset-0 z-40"
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-200"
        style={{ backgroundColor: "rgba(10,14,30,0.45)", opacity: open ? 1 : 0 }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-3xl flex flex-col transition-transform duration-300"
        style={{
          backgroundColor: C.card,
          maxHeight: "85dvh",
          minHeight: open ? "220px" : 0,
          transform: open ? "translateY(0)" : "translateY(100vh)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <span className="font-bold text-base" style={{ color: C.text }}>{title}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }}>
            <X size={16} color={C.sub} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* Bắt lỗi và hiển thị ra màn hình thay vì để trống - giúp xác định lỗi thật khi phát sinh */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Lỗi hiển thị:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-5">
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.redBg, border: `1px solid ${C.red}` }}>
            <div className="font-bold text-sm mb-2" style={{ color: C.red }}>Đã xảy ra lỗi khi hiển thị nội dung này</div>
            <div className="text-xs mb-1" style={{ color: C.text }}>Chụp lại đúng đoạn chữ dưới đây gửi cho mình để sửa:</div>
            <div className="text-[11px] p-2 rounded-lg" style={{ backgroundColor: "#fff", color: C.red, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {String((this.state.error && this.state.error.message) || this.state.error)}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Full push screen wrapper */
function Screen({ open, onBack, title, right, children }) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col transition-transform duration-300"
      style={{
        backgroundColor: C.bg,
        transform: open ? "translateX(0)" : "translateX(100%)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ backgroundColor: C.navy }}>
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center -ml-1">
          <ArrowLeft size={20} color="#fff" />
        </button>
        <span className="font-bold text-base text-white">{title}</span>
        <div className="w-8">{right}</div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

/* ---------------------------------- MAIN APP ---------------------------------- */
export default function PersonalCRM() {
  const [loaded, setLoaded] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");
  const [themeMode, setThemeMode] = useState("system"); // 'light' | 'dark' | 'system'
  const [accentTone, setAccentTone] = useState("navy");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemPrefersDark(mq.matches);
      const handler = (e) => setSystemPrefersDark(e.matches);
      mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
      return () => { mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler); };
    } catch (e) {}
  }, []);

  const effectiveMode = themeMode === "system" ? (systemPrefersDark ? "dark" : "light") : themeMode;
  // Ghi đè trực tiếp lên object màu dùng chung C - áp dụng ngay trong lượt render này cho toàn bộ app
  Object.assign(C, computeColors(effectiveMode, accentTone));

  const [sheet, setSheetRaw] = useState(null); // {type:'customerForm'|'productForm'|'taskForm', data}
  const [sheetOpen, setSheetOpen] = useState(false);
  const [screen, setScreenRaw] = useState(null); // {type:'quoteForm'|'quoteDetail'|'customerDetail'|'reports', ...}
  const [screenOpen, setScreenOpen] = useState(false);
  const sheetTimer = useRef(null);
  const screenTimer = useRef(null);

  // Mở/đóng có độ trễ để nội dung không biến mất giữa chừng hiệu ứng trượt (tránh khung rỗng khi đóng).
  // Huỷ timer treo cũ mỗi lần mở/đóng mới để tránh tình trạng mở nhanh sau khi vừa đóng bị xoá nhầm nội dung.
  const openSheet = (payload) => {
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
    setSheetRaw(payload);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
    sheetTimer.current = setTimeout(() => setSheetRaw(null), 320);
  };
  const openScreen = (payload) => {
    if (screenTimer.current) clearTimeout(screenTimer.current);
    setScreenRaw(payload);
    setScreenOpen(true);
  };
  const closeScreen = () => {
    setScreenOpen(false);
    if (screenTimer.current) clearTimeout(screenTimer.current);
    screenTimer.current = setTimeout(() => setScreenRaw(null), 320);
  };
  // Chuyển tab: luôn đóng hết khung/sheet đang mở trước, tránh lớp nền mờ (backdrop) của khung cũ
  // che mất thao tác ở tab mới.
  const goTab = (t) => { closeSheet(); closeScreen(); setTab(t); };
  const [quotesEntry, setQuotesEntry] = useState({ mode: "quotes", filter: "all" });
  const goToQuotes = (mode, filter) => { setQuotesEntry({ mode, filter }); goTab("quotes"); };

  useEffect(() => {
    loadAll().then((d) => {
      setCustomers(d.customers);
      setProducts(d.products);
      setQuotes(d.quotes);
      setTasks(d.tasks);
      setThemeMode(d.themeMode);
      setAccentTone(d.accentTone);
      setLoaded(true);
      requestNotifPermission(); // Xin quyền gửi thông báo (chỉ có tác dụng khi chạy app thật)
      // Tự đặt lịch cho các công việc đã có giờ nhắc nhưng chưa từng được đặt lịch (vd: tạo trước khi có tính năng này)
      (d.tasks || []).forEach((t) => {
        if (t.time && !t.notifId && !t.done) {
          scheduleTaskNotification(t).then((notifId) => {
            if (notifId) setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, notifId } : x)));
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => saveAll({ customers, products, quotes, tasks, themeMode, accentTone }), 350);
    return () => clearTimeout(t);
  }, [customers, products, quotes, tasks, themeMode, accentTone, loaded]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (m) => setToast(m);

  /* ---------- derived data ---------- */
  const quoteTotal = (q) => q.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const quoteCost = (q) => q.items.reduce((s, it) => s + it.qty * it.unitCost, 0);
  const quoteProfit = (q) => quoteTotal(q) - quoteCost(q);

  const countedQuotes = useMemo(() => quotes.filter((q) => q.status === "won" || q.status === "done"), [quotes]);

  const thisMonthKey = monthKey(new Date());
  const monthRevenue = useMemo(
    () => countedQuotes.filter((q) => monthKey(revenueDate(q)) === thisMonthKey).reduce((s, q) => s + quoteTotal(q), 0),
    [countedQuotes]
  );
  const monthProfit = useMemo(
    () => countedQuotes.filter((q) => monthKey(revenueDate(q)) === thisMonthKey).reduce((s, q) => s + quoteProfit(q), 0),
    [countedQuotes]
  );
  const pendingQuotes = quotes.filter((q) => q.status === "sent" || q.status === "draft");
  const inProgress = quotes.filter((q) => q.status === "won" && (q.progress || 0) < 100);


  const custQuotes = (custId) => quotes.filter((q) => q.customerId === custId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const custRevenue = (custId) => countedQuotes.filter((q) => q.customerId === custId).reduce((s, q) => s + quoteTotal(q), 0);

  const todayIso = isoDay(new Date());
  const todayTasks = useMemo(() => {
    const once = tasks.filter((t) => t.type === "once" && t.date === todayIso);
    const daily = tasks.filter((t) => t.type === "daily");
    const merged = [...once, ...daily].map((t) => ({
      ...t,
      _done: t.type === "daily" ? (t.completedDates || []).includes(todayIso) : !!t.done,
    }));
    merged.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    return merged;
  }, [tasks, todayIso]);
  const pendingTodayCount = todayTasks.filter((t) => !t._done).length;

  /* ---------- CRUD ---------- */
  const upsertCustomer = (c) => {
    setCustomers((prev) => {
      const exists = prev.some((x) => x.id === c.id);
      return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c];
    });
  };
  const deleteCustomer = (id) => {
    setCustomers((prev) => prev.filter((x) => x.id !== id));
    setQuotes((prev) => prev.filter((q) => q.customerId !== id));
  };
  const upsertProduct = (p) => {
    setProducts((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
  };
  const deleteProduct = (id) => setProducts((prev) => prev.filter((x) => x.id !== id));

  const upsertQuote = (q) => {
    setQuotes((prev) => {
      const exists = prev.some((x) => x.id === q.id);
      return exists ? prev.map((x) => (x.id === q.id ? q : x)) : [...prev, q];
    });
  };
  const deleteQuote = (id) => setQuotes((prev) => prev.filter((x) => x.id !== id));
  // Sao chép thành báo giá mới (khách hỏi lại giá / đặt lại đơn) - giữ khách hàng + sản phẩm, số mới, trạng thái về Nháp
  const copyQuote = (q) => {
    const newQ = {
      id: uid(),
      code: nextQuoteCode(quotes),
      revision: 0,
      customerId: q.customerId,
      createdAt: todayISO(),
      status: "draft",
      progress: 0,
      items: q.items.map((it) => ({ ...it })),
      note: q.note || "",
    };
    upsertQuote(newQ);
    openScreen({ type: "quoteDetail", id: newQ.id });
    showToast("Đã sao chép thành báo giá mới");
  };

  const upsertTask = (t) => {
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
  };
  // Dùng khi lưu từ màn hình Thêm/Sửa công việc - có đặt/đặt lại lịch thông báo thật
  const saveTaskWithNotification = async (t) => {
    const notifId = await scheduleTaskNotification(t);
    upsertTask({ ...t, notifId });
  };
  const deleteTask = (id) => {
    const task = tasks.find((x) => x.id === id);
    if (task) cancelTaskNotification(task);
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };
  const toggleTaskDone = (task, dayIso) => {
    if (task.type === "daily") {
      const set = new Set(task.completedDates || []);
      set.has(dayIso) ? set.delete(dayIso) : set.add(dayIso);
      upsertTask({ ...task, completedDates: Array.from(set) });
    } else {
      const nowDone = !task.done;
      if (nowDone) {
        // Đã xong -> huỷ nhắc, không cần nhắc việc đã hoàn thành nữa
        cancelTaskNotification(task);
        upsertTask({ ...task, done: true, notifId: null });
      } else {
        // Bỏ đánh dấu xong -> đặt lại nhắc nếu còn hợp lệ
        scheduleTaskNotification(task).then((notifId) => {
          upsertTask({ ...task, done: false, notifId });
        });
      }
    }
  };

  // Tạo bộ dữ liệu mẫu (khách hàng, sản phẩm, báo giá/đơn hàng trải vài tháng, công việc) để xem trực quan
  const seedDemoData = () => {
    const now = new Date();
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[rand(0, arr.length - 1)];

    // ---------- 50 khách hàng ----------
    const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
    const givenNames = ["Minh", "Hương", "Tuấn", "Lan", "Hùng", "Thảo", "Đức", "Trang", "Long", "Nga", "Sơn", "Hà", "Tâm", "Phong", "Linh", "Nam", "An", "Quân", "Yến", "Bình", "Kiên", "Vy", "Đạt", "Ngọc", "Khang"];
    const bizSuffix = ["Decal Auto", "Gara", "Cửa hàng Xe Máy", "PPF Studio", "Detailing Center", "Auto Care", "Garage Ô tô"];
    const areas = ["Q1", "Q3", "Q7", "Q9", "Q10", "Bình Thạnh", "Gò Vấp", "Tân Bình", "Thủ Đức", "Q12"];
    const groupsPool = ["VIP", "Đại lý", "Đại lý", "Khách lẻ", "Khách lẻ", "Khách lẻ", "Khách mới"];

    const newCustomers = Array.from({ length: 50 }, () => {
      const given = pick(givenNames);
      const isBiz = Math.random() < 0.5;
      const name = isBiz
        ? `${Math.random() < 0.5 ? "Anh" : "Chị"} ${given} - ${pick(bizSuffix)} ${pick(areas)}`
        : `${Math.random() < 0.5 ? "Anh" : "Chị"} ${given} ${pick(surnames)}`;
      return {
        id: uid(),
        name,
        phone: `09${rand(10000000, 99999999)}`,
        email: Math.random() < 0.4 ? `${given.toLowerCase()}${rand(1, 999)}@gmail.com` : "",
        address: Math.random() < 0.6 ? `${rand(1, 200)} ${pick(["Nguyễn Văn Linh", "Lê Văn Việt", "Cách Mạng Tháng 8", "Điện Biên Phủ", "Quang Trung"])}, ${pick(areas)}, TP.HCM` : "",
        group: pick(groupsPool),
        note: "",
      };
    });

    // ---------- 50 sản phẩm ----------
    const baseProducts = [
      { name: "Decal PPF bóng", unit: "m2", cost: 180000, sell: 280000 },
      { name: "Decal PPF nhám", unit: "m2", cost: 210000, sell: 320000 },
      { name: "Decal PPF màu", unit: "m2", cost: 230000, sell: 350000 },
      { name: "Decal carbon 5D", unit: "m2", cost: 150000, sell: 240000 },
      { name: "Decal carbon 3D", unit: "m2", cost: 140000, sell: 220000 },
      { name: "Phim cách nhiệt 2 lớp", unit: "m2", cost: 250000, sell: 380000 },
      { name: "Phim cách nhiệt 3 lớp", unit: "m2", cost: 320000, sell: 480000 },
      { name: "Phim cách nhiệt Ceramic", unit: "m2", cost: 420000, sell: 650000 },
      { name: "Tem xe máy full bộ", unit: "bộ", cost: 450000, sell: 750000 },
      { name: "Tem xe máy nửa bộ", unit: "bộ", cost: 250000, sell: 420000 },
      { name: "Decal trang trí ô tô", unit: "cái", cost: 80000, sell: 150000 },
      { name: "Decal logo hãng", unit: "cái", cost: 60000, sell: 120000 },
      { name: "Wrap đổi màu toàn xe", unit: "xe", cost: 8000000, sell: 14000000 },
      { name: "Dán PPF đèn xe", unit: "cái", cost: 120000, sell: 220000 },
      { name: "Phủ ceramic sơn xe", unit: "xe", cost: 1500000, sell: 2800000 },
    ];
    const variants = ["khổ 1.0m", "khổ 1.22m", "khổ 1.52m", "khổ 1.83m", "loại thường", "loại cao cấp"];
    const newProducts = [];
    outer: for (const bp of baseProducts) {
      for (const v of variants) {
        if (newProducts.length >= 50) break outer;
        const jitter = () => 1 + (rand(-8, 12) / 100);
        newProducts.push({
          id: uid(),
          name: `${bp.name} - ${v}`,
          unit: bp.unit,
          costPrice: Math.round((bp.cost * jitter()) / 1000) * 1000,
          sellPrice: Math.round((bp.sell * jitter()) / 1000) * 1000,
          priceHistory: Math.random() < 0.15 ? [{ costPrice: Math.round(bp.cost * 0.9 / 1000) * 1000, sellPrice: Math.round(bp.sell * 0.9 / 1000) * 1000, changedAt: daysAgo(rand(60, 200)).toISOString() }] : [],
        });
      }
    }

    const mkItem = (p, qty) => ({ productId: p.id, name: p.name, unit: p.unit, qty, unitPrice: p.sellPrice, unitCost: p.costPrice });

    // ---------- 150 báo giá (100 trong số đó trở thành đơn hàng Hoàn thành) ----------
    // Phân bổ trạng thái: 100 hoàn thành, 20 đã chốt đang thực hiện, 15 đã gửi, 10 nháp, 5 từ chối
    const statusPlan = [
      ...Array(100).fill("done"),
      ...Array(20).fill("won"),
      ...Array(15).fill("sent"),
      ...Array(10).fill("draft"),
      ...Array(5).fill("lost"),
    ];
    // Trộn ngẫu nhiên để ngày tháng không bị dồn theo nhóm trạng thái
    for (let i = statusPlan.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [statusPlan[i], statusPlan[j]] = [statusPlan[j], statusPlan[i]];
    }

    let yearCounters = {};
    const nextCode = (createdAt) => {
      const y = new Date(createdAt).getFullYear();
      yearCounters[y] = (yearCounters[y] || 0) + 1;
      return `BG/${y}-${String(yearCounters[y]).padStart(3, "0")}`;
    };

    const newQuotes = statusPlan.map((status) => {
      // Trải báo giá trong ~14 tháng gần đây (đủ dữ liệu để lọc theo Quý/Năm), sắp theo thời gian tăng dần khi sinh mã
      const createdDaysAgo = rand(1, 420);
      const createdAt = daysAgo(createdDaysAgo);
      const cust = pick(newCustomers);
      const itemCount = rand(1, 3);
      const usedProducts = new Set();
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        let p = pick(newProducts);
        let guard = 0;
        while (usedProducts.has(p.id) && guard < 10) { p = pick(newProducts); guard++; }
        usedProducts.add(p.id);
        items.push(mkItem(p, rand(1, 30)));
      }

      let progress = 0, completedAt = null;
      if (status === "done") {
        progress = 100;
        // Ngày hoàn thành thực tế PHẢI sau ngày tạo báo giá vài ngày đến vài tuần, không được trùng
        const completeDaysAfter = rand(2, 21);
        const cDate = new Date(createdAt);
        cDate.setDate(cDate.getDate() + Math.min(completeDaysAfter, createdDaysAgo - 1 >= 0 ? createdDaysAgo : completeDaysAfter));
        // Đảm bảo completedAt không vượt quá hiện tại
        completedAt = (cDate > now ? now : cDate).toISOString();
      } else if (status === "won") {
        progress = pick([10, 20, 30, 40, 50, 60, 70, 80, 90]);
      }

      return {
        id: uid(),
        code: nextCode(createdAt),
        revision: 0,
        history: [],
        customerId: cust.id,
        createdAt: createdAt.toISOString(),
        status,
        progress,
        completedAt,
        items,
        note: "",
      };
    });

    const newTasks = [
      { id: uid(), title: "Gọi điện xác nhận đơn hàng", type: "once", date: isoDay(now), time: "09:00", note: "Xác nhận số lượng trước khi giao", done: false, completedDates: [], createdAt: todayISO() },
      { id: uid(), title: "Giao hàng cho khách", type: "once", date: isoDay(now), time: "14:00", note: "", done: false, completedDates: [], createdAt: todayISO() },
      { id: uid(), title: "Kiểm tra kho vật tư", type: "daily", time: "08:00", note: "", done: false, completedDates: [isoDay(addDays(now, -1))], createdAt: todayISO() },
      { id: uid(), title: "Chốt sổ thu chi cuối ngày", type: "daily", time: "20:00", note: "", done: false, completedDates: [], createdAt: todayISO() },
      { id: uid(), title: "Liên hệ lại khách hàng chờ báo giá", type: "once", date: isoDay(addDays(now, 1)), time: "10:30", note: "", done: false, completedDates: [], createdAt: todayISO() },
    ];

    setCustomers((prev) => [...prev, ...newCustomers]);
    setProducts((prev) => [...prev, ...newProducts]);
    setQuotes((prev) => [...prev, ...newQuotes]);
    setTasks((prev) => [...prev, ...newTasks]);
    showToast(`Đã tạo ${newCustomers.length} khách hàng, ${newProducts.length} sản phẩm, ${newQuotes.length} báo giá`);
  };

  /* ================================================================== RENDER ================================================================== */
  return (
    <div
      className="w-full flex justify-center"
      style={{
        backgroundColor: C.bg,
        fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Segoe UI,Roboto,sans-serif",
        height: "100dvh",
        maxWidth: 560,
        margin: "0 auto",
        overflowX: "hidden",
        touchAction: "pan-y",
      }}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: C.bg, overflowX: "hidden", touchAction: "pan-y" }}>
        {/* Khoảng đệm an toàn phía trên (tai thỏ/status bar thật của điện thoại) */}
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

        {/* ---------- TAB CONTENT ---------- */}
        <div className="absolute left-0 right-0 bottom-0 flex flex-col" style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex-1 overflow-hidden relative">
          <ErrorBoundary>
            {tab === "home" && (
              <HomeTab
                monthRevenue={monthRevenue}
                monthProfit={monthProfit}
                pendingCount={pendingQuotes.length}
                inProgress={inProgress}
                quoteTotal={quoteTotal}
                customers={customers}
                quotes={quotes}
                onOpenQuote={(id) => openScreen({ type: "quoteDetail", id })}
                onNewQuote={() => openScreen({ type: "quoteForm", quote: null })}
                onOpenReports={() => openScreen({ type: "reports" })}
                todayTasks={todayTasks}
                pendingTodayCount={pendingTodayCount}
                onToggleTask={(t) => toggleTaskDone(t, todayIso)}
                onGoTasks={() => goTab("tasks")}
                onGoQuotes={goToQuotes}
                onSeedDemo={seedDemoData}
                onOpenSettings={() => openScreen({ type: "settings" })}
              />
            )}
            {tab === "customers" && (
              <CustomersTab
                customers={customers}
                custRevenue={custRevenue}
                custQuotes={custQuotes}
                onAdd={() => openSheet({ type: "customerForm", data: null })}
                onOpen={(id) => openScreen({ type: "customerDetail", id })}
              />
            )}
            {tab === "products" && (
              <ProductsTab
                products={products}
                onAdd={() => openScreen({ type: "productForm", data: null })}
                onEdit={(p) => openScreen({ type: "productForm", data: p })}
              />
            )}
            {tab === "quotes" && (
              <QuotesTab
                key={`${quotesEntry.mode}-${quotesEntry.filter}`}
                quotes={quotes}
                customers={customers}
                quoteTotal={quoteTotal}
                initialMode={quotesEntry.mode}
                initialFilter={quotesEntry.filter}
                onAdd={() => openScreen({ type: "quoteForm", quote: null })}
                onOpen={(id) => openScreen({ type: "quoteDetail", id })}
              />
            )}
            {tab === "tasks" && (
              <TasksTab
                tasks={tasks}
                onAdd={(dateIso) => openScreen({ type: "taskForm", data: null, presetDate: dateIso })}
                onEdit={(t) => openScreen({ type: "taskForm", data: t })}
                onToggle={toggleTaskDone}
              />
            )}

            {/* ---------- PUSH SCREENS ---------- */}
            <Screen
              open={screenOpen && screen?.type === "reports"}
              title="Báo cáo doanh thu"
              onBack={() => closeScreen()}
            >
              {screen?.type === "reports" && (
                <ReportsTab
                  quotes={quotes}
                  customers={customers}
                  quoteTotal={quoteTotal}
                  quoteCost={quoteCost}
                  onOpenQuote={(id) => openScreen({ type: "quoteDetail", id })}
                />
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "settings"}
              title="Cài đặt giao diện"
              onBack={() => closeScreen()}
            >
              {screen?.type === "settings" && (
                <SettingsScreen
                  themeMode={themeMode}
                  accentTone={accentTone}
                  onSetThemeMode={setThemeMode}
                  onSetAccentTone={setAccentTone}
                  systemPrefersDark={systemPrefersDark}
                />
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "quoteDetail"}
              title="Chi tiết báo giá"
              onBack={() => closeScreen()}
            >
              {screen?.type === "quoteDetail" && (
                <QuoteDetailScreen
                  quote={quotes.find((q) => q.id === screen.id)}
                  customer={customers.find((c) => c.id === quotes.find((q) => q.id === screen.id)?.customerId)}
                  quoteTotal={quoteTotal}
                  quoteCost={quoteCost}
                  quoteProfit={quoteProfit}
                  onUpdate={upsertQuote}
                  onDelete={(id) => { deleteQuote(id); closeScreen(); showToast("Đã xoá báo giá"); }}
                  onEdit={(q, revising) => openScreen({ type: "quoteForm", quote: q, revising })}
                  onCopy={copyQuote}
                />
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "customerDetail"}
              title="Khách hàng"
              onBack={() => closeScreen()}
            >
              {screen?.type === "customerDetail" && (
                <CustomerDetailScreen
                  customer={customers.find((c) => c.id === screen.id)}
                  quotesList={custQuotes(screen.id)}
                  revenue={custRevenue(screen.id)}
                  quoteTotal={quoteTotal}
                  onEdit={(c) => openSheet({ type: "customerForm", data: c })}
                  onDelete={(id) => { deleteCustomer(id); closeScreen(); showToast("Đã xoá khách hàng"); }}
                  onOpenQuote={(id) => openScreen({ type: "quoteDetail", id })}
                  onNewQuote={(custId) => openScreen({ type: "quoteForm", quote: null, presetCustomer: custId })}
                />
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "quoteForm"}
              title={screen?.type === "quoteForm" && screen?.quote ? "Sửa báo giá" : "Báo giá mới"}
              onBack={() => closeScreen()}
            >
              {screen?.type === "quoteForm" && (
                <QuoteFormScreen
                  key={screen.quote?.id || "new"}
                  existing={screen.quote}
                  presetCustomer={screen.presetCustomer}
                  revising={screen.revising}
                  customers={customers}
                  products={products}
                  quotes={quotes}
                  onSaveCustomer={upsertCustomer}
                  onSave={(q) => { upsertQuote(q); closeScreen(); showToast("Đã lưu báo giá"); }}
                  onCancel={() => closeScreen()}
                />
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "productForm"}
              title={screen?.type === "productForm" && screen?.data ? "Sửa sản phẩm" : "Thêm sản phẩm"}
              onBack={() => closeScreen()}
            >
              {screen?.type === "productForm" && (
                <div className="px-5 py-5">
                  <ErrorBoundary>
                    <ProductForm
                      key={screen.data?.id || "new"}
                      existing={screen.data}
                      onCancel={() => closeScreen()}
                      onDelete={screen.data ? (id) => { deleteProduct(id); closeScreen(); showToast("Đã xoá sản phẩm"); } : null}
                      onSave={(p) => { upsertProduct(p); closeScreen(); showToast("Đã lưu sản phẩm"); }}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </Screen>

            <Screen
              open={screenOpen && screen?.type === "taskForm"}
              title={screen?.type === "taskForm" && screen?.data ? "Sửa công việc" : "Công việc mới"}
              onBack={() => closeScreen()}
            >
              {screen?.type === "taskForm" && (
                <div className="px-5 py-5">
                  <ErrorBoundary>
                    <TaskForm
                      key={screen.data?.id || "new"}
                      existing={screen.data}
                      presetDate={screen.presetDate}
                      onCancel={() => closeScreen()}
                      onDelete={screen.data ? (id) => { deleteTask(id); closeScreen(); showToast("Đã xoá công việc"); } : null}
                      onSave={(t) => { saveTaskWithNotification(t); closeScreen(); showToast("Đã lưu công việc"); }}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </Screen>
          </ErrorBoundary>
          </div>

          {/* ---------- TAB BAR ---------- */}
          <div className="flex items-stretch" style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.card, paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}>
            <TabBtn icon={Home} label="Tổng quan" active={tab === "home"} onClick={() => goTab("home")} />
            <TabBtn icon={Users} label="Khách hàng" active={tab === "customers"} onClick={() => goTab("customers")} />
            <TabBtn icon={ListChecks} label="Công việc" active={tab === "tasks"} onClick={() => goTab("tasks")} />
            <TabBtn icon={FileText} label="Báo giá" active={tab === "quotes"} onClick={() => goTab("quotes")} />
            <TabBtn icon={Package} label="Sản phẩm" active={tab === "products"} onClick={() => goTab("products")} />
          </div>
        </div>

        {/* ---------- SHEETS ---------- */}
        <Sheet open={sheetOpen && sheet?.type === "customerForm"} onClose={() => closeSheet()} title={sheet?.data ? "Sửa khách hàng" : "Thêm khách hàng"}>
          {sheet?.type === "customerForm" && (
            <CustomerForm
              existing={sheet.data}
              existingGroups={[...new Set(customers.map((c) => c.group).filter(Boolean))]}
              onCancel={() => closeSheet()}
              onSave={(c) => { upsertCustomer(c); closeSheet(); showToast("Đã lưu khách hàng"); }}
            />
          )}
        </Sheet>


        {/* Toast */}
        <div
          className="absolute left-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-300"
          style={{
            backgroundColor: "#111528",
            top: toast ? 60 : 20,
            opacity: toast ? 1 : 0,
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- TAB BUTTON ---------------------------------- */
function TabBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 pt-2.5">
      <Icon size={21} color={active ? C.navy : "#A6ABBA"} strokeWidth={active ? 2.4 : 2} />
      <span className="text-[10px] font-semibold" style={{ color: active ? C.navy : "#A6ABBA" }}>{label}</span>
    </button>
  );
}

/* ---------------------------------- HOME TAB ---------------------------------- */
function HomeTab({ monthRevenue, monthProfit, pendingCount, inProgress, quoteTotal, customers, quotes, onOpenQuote, onNewQuote, onOpenReports, todayTasks, pendingTodayCount, onToggleTask, onGoTasks, onGoQuotes, onSeedDemo, onOpenSettings }) {
  const recent = [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const isEmpty = customers.length === 0 && quotes.length === 0;
  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between pt-3 pb-4">
        <div>
          <div className="text-xs" style={{ color: C.sub }}>Xin chào 👋</div>
          <div className="text-xl font-bold" style={{ color: C.text }}>Tổng quan công việc</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenSettings} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }}>
            <Settings size={18} color={C.navy} />
          </button>
          <button onClick={onOpenReports} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }}>
            <BarChart3 size={18} color={C.navy} />
          </button>
          <button onClick={onNewQuote} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.navy }}>
            <Plus size={20} color="#fff" />
          </button>
        </div>
      </div>

      {isEmpty && (
        <button
          onClick={onSeedDemo}
          className="w-full rounded-2xl p-3.5 mb-5 flex items-center justify-between"
          style={{ backgroundColor: C.blueBg, border: `1px dashed ${C.blue}` }}
        >
          <div className="text-left">
            <div className="text-xs font-bold" style={{ color: C.navy }}>Xem trực quan hơn?</div>
            <div className="text-[11px] mt-0.5" style={{ color: C.sub }}>Tạo dữ liệu mẫu: khách hàng, sản phẩm, báo giá, công việc</div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: C.blue }}>Tạo ngay</span>
        </button>
      )}

      <div className="flex gap-3 mb-3">
        <StatCard label="Doanh thu tháng" value={money(monthRevenue)} icon={<TrendingUp size={15} color={C.green} />} tint={C.green} onClick={onOpenReports} />
        <StatCard label="Lợi nhuận tháng" value={money(monthProfit)} icon={<TrendingUp size={15} color={C.navy} />} tint={C.navy} onClick={onOpenReports} />
      </div>
      <div className="flex gap-3 mb-6">
        <StatCard label="Báo giá chờ" value={pendingCount} icon={<FileText size={15} color={C.amber} />} tint={C.amber} onClick={() => onGoQuotes("quotes", "draft")} />
        <StatCard label="Đơn hàng" value={inProgress.length} icon={<Package size={15} color={C.blue} />} tint={C.blue} onClick={() => onGoQuotes("orders", "won")} />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-bold" style={{ color: C.text }}>Công việc hôm nay {pendingTodayCount > 0 && `(${pendingTodayCount})`}</span>
          <button onClick={onGoTasks} className="text-xs font-bold" style={{ color: C.navy }}>Xem tất cả</button>
        </div>
        {todayTasks.filter((t) => !t._done).length === 0 ? (
          <div className="text-sm text-center py-6 rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.sub }}>Chưa có việc gì cho hôm nay 🎉</div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayTasks.filter((t) => !t._done).slice(0, 5).map((t) => (
              <div key={t.id} className="rounded-2xl p-3 flex items-center gap-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <button onClick={() => onToggleTask(t)}>
                  <Circle size={20} color={C.sub} />
                </button>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{t.title}</div>
                </div>
                {t.time && <span className="text-[11px] font-semibold" style={{ color: C.sub }}>{t.time}</span>}
                {t.type === "daily" && <Repeat size={12} color={C.sub} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {inProgress.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>Đơn đang thực hiện</div>
          <div className="flex flex-col gap-2.5">
            {inProgress.map((q) => {
              const cust = customers.find((c) => c.id === q.customerId);
              return (
                <div key={q.id} onClick={() => onOpenQuote(q.id)} className="rounded-2xl p-3.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm" style={{ color: C.text }}>{cust?.name || "—"}</span>
                    <span className="text-xs font-bold" style={{ color: C.navy }}>{q.progress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: C.trackBg }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${q.progress || 0}%`, backgroundColor: C.navy }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>Báo giá gần đây</div>
      {recent.length === 0 ? (
        <div className="text-sm text-center py-8" style={{ color: C.sub }}>Chưa có báo giá nào</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((q) => {
            const cust = customers.find((c) => c.id === q.customerId);
            const st = getStatusMeta(q.status);
            return (
              <div key={q.id} onClick={() => onOpenQuote(q.id)} className="rounded-2xl p-3.5 flex items-center justify-between" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: C.text }}>{cust?.name || "Khách lẻ"}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.sub }}>{quoteCode(q)} · {money(quoteTotal(q))}</div>
                </div>
                <Pill label={st.label} color={st.color} bg={st.bg} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- CUSTOMERS TAB ---------------------------------- */
function CustomersTab({ customers, custRevenue, onAdd, onOpen }) {
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const groups = [...new Set(customers.map((c) => c.group).filter(Boolean))];
  const list = customers
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => groupFilter === "all" || c.group === groupFilter);
  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between pt-3 pb-3">
        <div className="text-xl font-bold" style={{ color: C.text }}>Khách hàng</div>
        <button onClick={onAdd} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.navy }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>
      <div className="relative mb-3">
        <Search size={15} color={C.sub} style={{ position: "absolute", left: 12, top: 12 }} />
        <TextInput placeholder="Tìm khách hàng..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
      </div>
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setGroupFilter("all")} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: groupFilter === "all" ? C.navy : C.neutralBg, color: groupFilter === "all" ? "#fff" : C.sub }}>Tất cả</button>
          {groups.map((g) => (
            <button key={g} onClick={() => setGroupFilter(g)} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: groupFilter === g ? C.navy : C.neutralBg, color: groupFilter === g ? "#fff" : C.sub }}>{g}</button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState icon={<Users size={26} color="#fff" />} title="Chưa có khách hàng" sub="Thêm khách hàng đầu tiên để bắt đầu quản lý" actionLabel="Thêm khách hàng" onAction={onAdd} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((c) => (
            <div key={c.id} onClick={() => onOpen(c.id)} className="rounded-2xl p-3.5 flex items-center justify-between" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: C.navy }}>
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate" style={{ color: C.text }}>{c.name}</span>
                    {c.group && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ color: C.navy, backgroundColor: C.navyBg }}>{c.group}</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: C.sub }}>{c.phone || "Chưa có SĐT"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: C.greenBg }}
                  >
                    <Phone size={13} color={C.green} />
                  </a>
                )}
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: C.green }}>{money(custRevenue(c.id))}</div>
                  <ChevronRight size={16} color={C.sub} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerForm({ existing, existingGroups, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [address, setAddress] = useState(existing?.address || "");
  const [group, setGroup] = useState(existing?.group || "");
  const [note, setNote] = useState(existing?.note || "");
  const [error, setError] = useState("");
  const submit = () => {
    if (!name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    setError("");
    onSave({ id: existing?.id || uid(), name: name.trim(), phone: phone.trim(), email, address, group: group.trim(), note });
  };
  return (
    <div>
      <Field label="Tên khách hàng *"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Anh Minh - Decal ABC" /></Field>
      <Field label="Số điện thoại *"><TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" /></Field>
      {error && <div className="text-xs font-semibold mb-3 -mt-2" style={{ color: C.red }}>{error}</div>}
      <Field label="Email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vidu.com" /></Field>
      <Field label="Địa chỉ"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ" /></Field>
      <Field label="Nhóm khách hàng">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[...new Set(["VIP", "Đại lý", "Khách lẻ", "Khách mới", ...(existingGroups || [])])].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(group === g ? "" : g)}
              className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: group === g ? C.navy : C.neutralBg, color: group === g ? "#fff" : C.sub }}
            >
              {g}
            </button>
          ))}
        </div>
        <TextInput value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Hoặc nhập nhóm khác..." />
      </Field>
      <Field label="Ghi chú"><TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm..." /></Field>
      <button onClick={submit} className="w-full py-3 rounded-2xl font-bold text-white text-sm mt-1" style={{ backgroundColor: C.navy }}>Lưu khách hàng</button>
    </div>
  );
}

function CustomerDetailScreen({ customer, quotesList, revenue, quoteTotal, onEdit, onDelete, onOpenQuote, onNewQuote }) {
  if (!customer) return null;
  return (
    <div className="px-5 py-5">
      <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white" style={{ backgroundColor: C.navy }}>
            {customer.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base" style={{ color: C.text }}>{customer.name}</span>
              {customer.group && <Pill label={customer.group} color={C.navy} bg={C.navyBg} />}
            </div>
            <div className="text-xs" style={{ color: C.sub }}>Tổng doanh thu: <span style={{ color: C.green, fontWeight: 700 }}>{money(revenue)}</span></div>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: C.greenBg }}>
              <span className="flex items-center gap-2" style={{ color: C.text }}><Phone size={14} color={C.green} />{customer.phone}</span>
              <span className="text-xs font-bold" style={{ color: C.green }}>Gọi ngay</span>
            </a>
          )}
          {customer.email && <div className="flex items-center gap-2" style={{ color: C.text }}><Mail size={14} color={C.sub} />{customer.email}</div>}
          {customer.address && <div className="flex items-center gap-2" style={{ color: C.text }}><MapPin size={14} color={C.sub} />{customer.address}</div>}
        </div>
        {customer.note && <div className="mt-3 text-xs p-2.5 rounded-xl" style={{ backgroundColor: C.inputBg, color: C.sub }}>{customer.note}</div>}
        <div className="flex gap-2 mt-3.5">
          <button onClick={() => onEdit(customer)} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ backgroundColor: C.neutralBg, color: C.text }}>
            <Pencil size={13} /> Sửa
          </button>
          <button onClick={() => onDelete(customer.id)} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ backgroundColor: C.redBg, color: C.red }}>
            <Trash2 size={13} /> Xoá
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <div className="text-sm font-bold" style={{ color: C.text }}>Báo giá ({quotesList.length})</div>
        <button onClick={() => onNewQuote(customer.id)} className="text-xs font-bold" style={{ color: C.navy }}>+ Tạo báo giá</button>
      </div>
      {quotesList.length === 0 ? (
        <div className="text-sm text-center py-8" style={{ color: C.sub }}>Chưa có báo giá nào</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {quotesList.map((q) => {
            const st = getStatusMeta(q.status);
            return (
              <div key={q.id} onClick={() => onOpenQuote(q.id)} className="rounded-2xl p-3.5 flex items-center justify-between" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: C.text }}>{quoteCode(q)}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.sub }}>{money(quoteTotal(q))}</div>
                </div>
                <Pill label={st.label} color={st.color} bg={st.bg} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- PRODUCTS TAB ---------------------------------- */
function ProductsTab({ products, onAdd, onEdit }) {
  const [q, setQ] = useState("");
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between pt-3 pb-3">
        <div className="text-xl font-bold" style={{ color: C.text }}>Danh mục sản phẩm</div>
        <button onClick={onAdd} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.navy }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={15} color={C.sub} style={{ position: "absolute", left: 12, top: 12 }} />
        <TextInput placeholder="Tìm sản phẩm..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Package size={26} color="#fff" />} title="Chưa có sản phẩm" sub="Thêm sản phẩm với giá vốn và giá bán" actionLabel="Thêm sản phẩm" onAction={onAdd} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((p) => {
            const margin = p.sellPrice > 0 ? ((p.sellPrice - p.costPrice) / p.sellPrice) * 100 : 0;
            return (
              <div key={p.id} onClick={() => onEdit(p)} className="rounded-2xl p-3.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm" style={{ color: C.text }}>{p.name}</span>
                  <Pill label={`${margin.toFixed(0)}% lãi`} color={margin >= 0 ? C.green : C.red} bg={margin >= 0 ? C.greenBg : C.redBg} />
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: C.sub }}>
                  <span>Giá vốn: <b style={{ color: C.text }}>{money(p.costPrice)}</b></span>
                  <span>Giá bán: <b style={{ color: C.text }}>{money(p.sellPrice)}</b></span>
                  {p.unit && <span>/ {p.unit}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductForm({ existing, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(existing?.name || "");
  const [unit, setUnit] = useState(existing?.unit || "cái");
  const [costPrice, setCostPrice] = useState(existing?.costPrice ?? "");
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice ?? "");
  const submit = () => {
    if (!name.trim()) return;
    const newCost = Number(costPrice) || 0;
    const newSell = Number(sellPrice) || 0;
    // Nếu giá thay đổi so với trước, lưu lại giá cũ vào lịch sử trước khi ghi đè
    let priceHistory = existing?.priceHistory || [];
    if (existing && (existing.costPrice !== newCost || existing.sellPrice !== newSell)) {
      priceHistory = [
        ...priceHistory,
        { costPrice: existing.costPrice || 0, sellPrice: existing.sellPrice || 0, changedAt: todayISO() },
      ];
    }
    onSave({
      id: existing?.id || uid(),
      name: name.trim(),
      unit,
      costPrice: newCost,
      sellPrice: newSell,
      priceHistory,
    });
  };
  return (
    <div>
      <Field label="Tên sản phẩm *"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Decal PPF bóng - khổ 1.5m" /></Field>
      <Field label="Đơn vị tính"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cái, m2, cuộn..." /></Field>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="Giá vốn (đ)"><TextInput type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0" /></Field></div>
        <div className="flex-1"><Field label="Giá bán (đ)"><TextInput type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0" /></Field></div>
      </div>
      {existing && (
        <div className="text-xs mb-4 p-2.5 rounded-xl flex items-start gap-2" style={{ backgroundColor: C.amberBg, color: C.amber }}>
          <Lock size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>Thay đổi giá vốn/giá bán chỉ áp dụng cho báo giá mới. Các báo giá đã tạo trước đó giữ nguyên giá vốn tại thời điểm gửi.</span>
        </div>
      )}

      {existing?.priceHistory?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: C.text }}>
            <Clock size={12} /> Lịch sử thay đổi giá
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {[...existing.priceHistory].reverse().map((h, i) => (
              <div key={i} className="px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: C.card, borderBottom: i < existing.priceHistory.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span className="text-[11px]" style={{ color: C.sub }}>{new Date(h.changedAt).toLocaleDateString("vi-VN")}</span>
                <span className="text-[11px]" style={{ color: C.text }}>
                  Vốn <b>{money(h.costPrice)}</b> · Bán <b>{money(h.sellPrice)}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={submit} className="w-full py-3 rounded-2xl font-bold text-white text-sm mb-2" style={{ backgroundColor: C.navy }}>Lưu sản phẩm</button>
      {onDelete && (
        <button onClick={() => onDelete(existing.id)} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ backgroundColor: C.redBg, color: C.red }}>Xoá sản phẩm</button>
      )}
    </div>
  );
}

/* ---------------------------------- QUOTES TAB ---------------------------------- */
function QuotesTab({ quotes, customers, quoteTotal, onAdd, onOpen, initialMode, initialFilter }) {
  const [mode, setMode] = useState(initialMode || "quotes"); // 'quotes' = Báo giá (nháp/gửi/từ chối) | 'orders' = Đơn hàng (chốt/hoàn thành)
  const [filter, setFilter] = useState(initialFilter || "all");

  const modeStatuses = mode === "quotes" ? ["draft", "sent", "lost"] : ["won", "done"];
  const filters = mode === "quotes"
    ? [
        { k: "all", l: "Tất cả" },
        { k: "draft", l: "Nháp" },
        { k: "sent", l: "Đã gửi" },
        { k: "lost", l: "Từ chối" },
      ]
    : [
        { k: "all", l: "Tất cả" },
        { k: "won", l: "Đã chốt" },
        { k: "done", l: "Hoàn thành" },
      ];

  const switchMode = (m) => { setMode(m); setFilter("all"); };

  const list = quotes
    .filter((q) => modeStatuses.includes(q.status))
    .filter((q) => filter === "all" || q.status === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between pt-3 pb-3">
        <div className="text-xl font-bold" style={{ color: C.text }}>{mode === "quotes" ? "Báo giá" : "Đơn hàng"}</div>
        <button onClick={onAdd} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.navy }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>

      <div className="flex gap-2 mb-3 p-1 rounded-xl" style={{ backgroundColor: C.neutralBg }}>
        <button onClick={() => switchMode("quotes")} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: mode === "quotes" ? C.card : "transparent", color: mode === "quotes" ? C.navy : C.sub }}>
          Báo giá
        </button>
        <button onClick={() => switchMode("orders")} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: mode === "orders" ? C.card : "transparent", color: mode === "orders" ? C.navy : C.sub }}>
          Đơn hàng
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap"
            style={{ backgroundColor: filter === f.k ? C.navy : C.neutralBg, color: filter === f.k ? "#fff" : C.sub }}
          >
            {f.l}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        mode === "quotes" ? (
          <EmptyState icon={<FileText size={26} color="#fff" />} title="Chưa có báo giá" sub="Tạo báo giá đầu tiên cho khách hàng" actionLabel="Tạo báo giá" onAction={onAdd} />
        ) : (
          <EmptyState icon={<Package size={26} color="#fff" />} title="Chưa có đơn hàng" sub="Đơn hàng xuất hiện khi báo giá được Chốt" />
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((q) => {
            const cust = customers.find((c) => c.id === q.customerId);
            const st = getStatusMeta(q.status);
            return (
              <div key={q.id} onClick={() => onOpen(q.id)} className="rounded-2xl p-3.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm" style={{ color: C.text }}>{cust?.name || "Khách lẻ"}</span>
                  <Pill label={st.label} color={st.color} bg={st.bg} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.sub }}>{quoteCode(q)} · {new Date(q.createdAt).toLocaleDateString("vi-VN")}</span>
                  <span className="text-sm font-bold" style={{ color: C.text }}>{money(quoteTotal(q))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Quote Detail ---------- */
function QuoteDetailScreen({ quote, customer, quoteTotal, quoteCost, quoteProfit, onUpdate, onDelete, onEdit, onCopy }) {
  const [expandedRev, setExpandedRev] = useState(null);
  if (!quote) return null;
  const st = getStatusMeta(quote.status);
  const setStatus = (status) => {
    let progress = quote.progress || 0;
    if (status === "won" && !quote.progress) progress = 0;
    if (status === "done") progress = 100;
    // Bấm "Chốt" nghĩa là bắt đầu 1 chu kỳ thực hiện mới -> xoá mốc hoàn thành cũ (nếu có)
    const completedAt = status === "won" ? null : quote.completedAt;
    onUpdate({ ...quote, status, progress, completedAt });
  };
  const setProgress = (progress) => {
    const status = progress >= 100 ? "done" : quote.status === "done" ? "won" : quote.status;
    // Tự động ghi lại thời điểm hoàn thành thực tế ngay lúc đạt 100% (không dùng ngày tạo báo giá)
    const completedAt = progress >= 100 ? (quote.completedAt || todayISO()) : quote.completedAt;
    onUpdate({ ...quote, progress, status, completedAt });
  };
  const showProgress = quote.status === "won" || quote.status === "done";

  const btnBase = "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5";

  return (
    <div className="px-5 py-5">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-lg" style={{ color: C.text }}>{quoteCode(quote)}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onCopy(quote)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }} title="Sao chép thành báo giá mới">
            <Copy size={13} color={C.navy} />
          </button>
          <Pill label={st.label} color={st.color} bg={st.bg} />
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs" style={{ color: C.sub }}>{customer?.name || "Khách lẻ"} · {new Date(quote.createdAt).toLocaleDateString("vi-VN")}</span>
        {customer?.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ color: C.green, backgroundColor: C.greenBg }}
          >
            <Phone size={12} /> Gọi
          </a>
        )}
      </div>

      {/* Bộ nút hành động - tự động đổi theo trạng thái, trạng thái không còn bấm tự do */}
      {quote.status === "draft" && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => onEdit(quote, false)} className={btnBase} style={{ backgroundColor: C.neutralBg, color: C.text }}>
            <Pencil size={13} /> Sửa
          </button>
          <button onClick={() => setStatus("sent")} className={btnBase} style={{ backgroundColor: C.navy, color: "#fff" }}>
            <Send size={13} /> Gửi
          </button>
          <button onClick={() => onDelete(quote.id)} className={btnBase} style={{ backgroundColor: C.redBg, color: C.red }}>
            <Trash2 size={13} /> Xoá
          </button>
        </div>
      )}
      {quote.status === "sent" && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => onEdit(quote, true)} className={btnBase} style={{ backgroundColor: C.neutralBg, color: C.text }}>
            <Pencil size={13} /> Cập nhật
          </button>
          <button onClick={() => setStatus("won")} className={btnBase} style={{ backgroundColor: C.green, color: "#fff" }}>
            <Check size={13} /> Chốt
          </button>
          <button onClick={() => setStatus("lost")} className={btnBase} style={{ backgroundColor: C.redBg, color: C.red }}>
            <X size={13} /> Từ chối
          </button>
        </div>
      )}
      {(quote.status === "won" || quote.status === "done" || quote.status === "lost") && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => onEdit(quote, true)} className={btnBase} style={{ backgroundColor: C.neutralBg, color: C.text }}>
            <Pencil size={13} /> Cập nhật
          </button>
          <button onClick={() => onDelete(quote.id)} className={btnBase} style={{ backgroundColor: C.redBg, color: C.red }}>
            <Trash2 size={13} /> Xoá
          </button>
        </div>
      )}

      {showProgress && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold" style={{ color: C.text }}>Tiến độ thực hiện</span>
            <span className="text-sm font-bold" style={{ color: C.navy }}>{quote.progress || 0}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={quote.progress || 0}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full mb-2.5" style={{ accentColor: C.navy }}
          />
          <div className="flex gap-1.5">
            {[0, 25, 50, 75, 100].map((v) => (
              <button key={v} onClick={() => setProgress(v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: (quote.progress || 0) === v ? C.navy : C.neutralBg, color: (quote.progress || 0) === v ? "#fff" : C.sub }}>
                {v}%
              </button>
            ))}
          </div>
          {quote.status === "done" && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <label className="text-[10px] font-semibold flex items-center gap-1 mb-1.5" style={{ color: C.sub }}>
                <Clock size={10} /> Ngày hoàn thành thực tế (chỉnh lại nếu cần)
              </label>
              <input
                type="date"
                value={(quote.completedAt || todayISO()).slice(0, 10)}
                max={isoDay(new Date())}
                onChange={(e) => onUpdate({ ...quote, completedAt: new Date(e.target.value + "T" + (quote.completedAt ? quote.completedAt.slice(11) : new Date().toISOString().slice(11))).toISOString() })}
                style={getInputStyle()}
              />
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        {quote.items.map((it, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: i < quote.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.text }}>{it.name}</div>
              <div className="text-xs mt-0.5" style={{ color: C.sub }}>{it.qty} {it.unit} × {money(it.unitPrice)}</div>
            </div>
            <div className="text-sm font-bold" style={{ color: C.text }}>{money(it.qty * it.unitPrice)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.navy }}>
        <Row label="Doanh thu" value={money(quoteTotal(quote))} color="#fff" />
        <Row label="Giá vốn" value={money(quoteCost(quote))} color="rgba(255,255,255,0.65)" />
        <div className="h-px my-2" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
        <Row label="Lợi nhuận" value={money(quoteProfit(quote))} color="#7CF0A8" bold />
      </div>

      {quote.note && <div className="mb-4 text-xs p-3 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.sub }}>{quote.note}</div>}

      {quote.history?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: C.text }}>
            <Clock size={12} /> Lịch sử các bản trước ({quote.history.length})
          </div>
          <div className="flex flex-col gap-2">
            {[...quote.history].reverse().map((h, idx) => {
              const realIdx = quote.history.length - 1 - idx;
              const hCode = quote.code + (h.revision > 0 ? `-R${h.revision}` : "");
              const hTotal = h.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
              const isOpen = expandedRev === realIdx;
              return (
                <div key={realIdx} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, backgroundColor: C.card }}>
                  <button onClick={() => setExpandedRev(isOpen ? null : realIdx)} className="w-full px-3.5 py-3 flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-xs font-bold" style={{ color: C.text }}>{hCode}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: C.sub }}>{new Date(h.savedAt).toLocaleDateString("vi-VN")} · {getStatusMeta(h.status)?.label}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: C.text }}>{money(hTotal)}</span>
                      <ChevronRight size={14} color={C.sub} style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}` }}>
                      {h.items.map((it, i) => (
                        <div key={i} className="px-3.5 py-2 flex items-center justify-between" style={{ borderBottom: i < h.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <span className="text-[11px]" style={{ color: C.text }}>{it.name} <span style={{ color: C.sub }}>× {it.qty}</span></span>
                          <span className="text-[11px] font-semibold" style={{ color: C.text }}>{money(it.qty * it.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function Row({ label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs" style={{ color: bold ? color : "rgba(255,255,255,0.75)" }}>{label}</span>
      <span className="text-sm" style={{ color, fontWeight: bold ? 800 : 600 }}>{value}</span>
    </div>
  );
}

/* ---------- Quote Form (create / edit) ---------- */
function QuoteFormScreen({ existing, presetCustomer, revising, customers, products, quotes, onSaveCustomer, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState(existing?.customerId || presetCustomer || "");
  const [items, setItems] = useState(existing?.items || []);
  const [note, setNote] = useState(existing?.note || "");
  const [picking, setPicking] = useState(false);
  const [pq, setPq] = useState("");
  const [quickCust, setQuickCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const addProduct = (p) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, qty: 1, unitPrice: p.sellPrice, unitCost: p.costPrice }];
    });
    setPicking(false);
    setPq("");
  };
  const updateItem = (i, patch) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const [quickCustError, setQuickCustError] = useState("");
  const saveNewCustomer = () => {
    if (!newCustName.trim()) { setQuickCustError("Vui lòng nhập tên khách hàng"); return; }
    if (!newCustPhone.trim()) { setQuickCustError("Vui lòng nhập số điện thoại"); return; }
    setQuickCustError("");
    const c = { id: uid(), name: newCustName.trim(), phone: newCustPhone.trim(), email: "", address: "", note: "" };
    onSaveCustomer(c);
    setCustomerId(c.id);
    setQuickCust(false);
    setNewCustName("");
    setNewCustPhone("");
  };

  const submit = (status) => {
    if (!customerId) { alert("Vui lòng chọn khách hàng"); return; }
    if (items.length === 0) { alert("Vui lòng thêm ít nhất 1 sản phẩm"); return; }
    // Nếu đây là lần "Cập nhật" (sau khi báo giá đã gửi/chốt/từ chối), tăng số lần sửa (-R1, -R2...)
    // và lưu lại toàn bộ bản trước đó vào lịch sử để trích xuất khi cần, không bị mất dữ liệu cũ.
    const revision = revising ? (existing?.revision || 0) + 1 : (existing?.revision || 0);
    const history = revising && existing
      ? [
          ...(existing.history || []),
          {
            revision: existing.revision || 0,
            customerId: existing.customerId,
            items: existing.items,
            note: existing.note,
            status: existing.status,
            savedAt: todayISO(),
          },
        ]
      : (existing?.history || []);
    onSave({
      id: existing?.id || uid(),
      code: existing?.code || nextQuoteCode(quotes),
      revision,
      history,
      customerId,
      createdAt: existing?.createdAt || todayISO(),
      status,
      progress: 0,
      items,
      note,
    });
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(pq.toLowerCase()));

  return (
    <div className="px-5 py-5 relative h-full">
      {revising && (
        <div className="rounded-xl px-3 py-2 mb-4 text-xs font-semibold flex items-center gap-1.5" style={{ backgroundColor: C.amberBg, color: C.amber }}>
          <Pencil size={12} /> Đang cập nhật báo giá — mã sẽ thành {existing?.code}-R{(existing?.revision || 0) + 1}
        </div>
      )}
      <Field label="Khách hàng *">
        {!quickCust ? (
          <div className="flex gap-2">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ ...getInputStyle(), flex: 1 }}>
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => setQuickCust(true)} className="px-3 rounded-xl text-xs font-bold" style={{ backgroundColor: C.neutralBg, color: C.navy }}>+ Mới</button>
          </div>
        ) : (
          <div className="rounded-xl p-3" style={{ backgroundColor: C.inputBg, border: `1px solid ${C.border}` }}>
            <TextInput placeholder="Tên khách hàng *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} style={{ marginBottom: 8 }} />
            <TextInput type="tel" placeholder="Số điện thoại *" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} style={{ marginBottom: 8 }} />
            {quickCustError && <div className="text-xs font-semibold mb-2" style={{ color: C.red }}>{quickCustError}</div>}
            <div className="flex gap-2">
              <button onClick={saveNewCustomer} className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: C.navy }}>Lưu</button>
              <button onClick={() => setQuickCust(false)} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: C.neutralBg, color: C.sub }}>Huỷ</button>
            </div>
          </div>
        )}
      </Field>

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>Sản phẩm ({items.length})</span>
        <button onClick={() => setPicking(true)} className="text-xs font-bold" style={{ color: C.navy }}>+ Thêm sản phẩm</button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-center py-6 rounded-xl mb-4" style={{ backgroundColor: C.inputBg, color: C.sub, border: `1px dashed ${C.border}` }}>Chưa có sản phẩm nào</div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-4">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl p-3.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold" style={{ color: C.text }}>{it.name}</span>
                <button onClick={() => removeItem(i)}><X size={15} color={C.red} /></button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center rounded-lg" style={{ backgroundColor: C.neutralBg }}>
                  <button onClick={() => updateItem(i, { qty: Math.max(1, it.qty - 1) })} className="w-7 h-7 flex items-center justify-center flex-shrink-0"><Minus size={12} color={C.text} /></button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={it.qty}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(i, { qty: v === "" ? "" : Number(v) });
                    }}
                    onBlur={(e) => {
                      const v = Math.max(1, Math.round(Number(e.target.value)) || 1);
                      updateItem(i, { qty: v });
                    }}
                    onFocus={(e) => e.target.select()}
                    className="text-xs font-bold text-center"
                    style={{ width: 40, background: "transparent", border: "none", outline: "none", color: C.text, MozAppearance: "textfield" }}
                  />
                  <button onClick={() => updateItem(i, { qty: (Number(it.qty) || 0) + 1 })} className="w-7 h-7 flex items-center justify-center flex-shrink-0"><Plus size={12} color={C.text} /></button>
                </div>
                <span className="text-[11px]" style={{ color: C.sub }}>{it.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold" style={{ color: C.sub }}>Giá bán (điều chỉnh được)</label>
                  <TextInput type="number" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: C.sub }}><Lock size={9} /> Giá vốn (cố định)</label>
                  <div style={{ ...getInputStyle(), backgroundColor: C.neutralBg, color: C.sub }}>{money(it.unitCost)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Field label="Ghi chú"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú cho báo giá..." /></Field>

      <div className="rounded-2xl p-4 mb-5 flex items-center justify-between" style={{ backgroundColor: C.navy }}>
        <span className="text-sm font-semibold text-white">Tổng cộng</span>
        <span className="text-lg font-bold text-white">{money(total)}</span>
      </div>

      <div className="flex gap-2 pb-4">
        <button onClick={() => submit("draft")} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ backgroundColor: C.neutralBg, color: C.text }}>Lưu nháp</button>
        <button onClick={() => submit("sent")} className="flex-1 py-3 rounded-2xl font-bold text-sm text-white" style={{ backgroundColor: C.navy }}>Gửi báo giá</button>
      </div>

      {/* Product picker sheet (inline within screen) */}
      {picking && (
        <div className="absolute inset-0 z-10 flex flex-col" style={{ backgroundColor: C.bg }}>
          <div className="flex items-center justify-between px-1 pb-3">
            <span className="font-bold text-sm" style={{ color: C.text }}>Chọn sản phẩm</span>
            <button onClick={() => setPicking(false)}><X size={18} color={C.sub} /></button>
          </div>
          <div className="relative mb-3">
            <Search size={15} color={C.sub} style={{ position: "absolute", left: 12, top: 12 }} />
            <TextInput placeholder="Tìm sản phẩm..." value={pq} onChange={(e) => setPq(e.target.value)} style={{ paddingLeft: 34 }} autoFocus />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {filteredProducts.length === 0 && <div className="text-sm text-center py-8" style={{ color: C.sub }}>Không có sản phẩm phù hợp</div>}
            {filteredProducts.map((p) => (
              <div key={p.id} onClick={() => addProduct(p)} className="rounded-2xl p-3.5 flex items-center justify-between" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{p.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.sub }}>{money(p.sellPrice)} / {p.unit}</div>
                </div>
                <Plus size={16} color={C.navy} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- TASKS TAB (Công việc hằng ngày) ---------------------------------- */
function TasksTab({ tasks, onAdd, onEdit, onToggle }) {
  const [anchor, setAnchor] = useState(startOfWeek(new Date()));
  const [selected, setSelected] = useState(new Date());
  const selIso = isoDay(selected);
  const todayIsoV = isoDay(new Date());

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);

  const dayTasks = useMemo(() => {
    const once = tasks.filter((t) => t.type === "once" && t.date === selIso);
    const daily = tasks.filter((t) => t.type === "daily");
    const merged = [...once, ...daily].map((t) => ({
      ...t,
      _done: t.type === "daily" ? (t.completedDates || []).includes(selIso) : !!t.done,
      _overdue: t.type === "once" && !t.done && t.date < todayIsoV,
    }));
    merged.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    return merged;
  }, [tasks, selIso, todayIsoV]);

  const hasTask = (d) => {
    const iso = isoDay(d);
    return tasks.some((t) => (t.type === "once" && t.date === iso) || t.type === "daily");
  };

  const jumpTo = (date) => { setSelected(date); setAnchor(startOfWeek(date)); };
  const curYear = selected.getFullYear();
  const curMonth = selected.getMonth() + 1;
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between pt-3 pb-3">
        <div className="text-xl font-bold" style={{ color: C.text }}>Công việc hằng ngày</div>
        <button onClick={() => onAdd(selIso)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.navy }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>

      {/* Bộ lọc theo tháng / năm - nhảy nhanh đến bất kỳ thời điểm nào */}
      <div className="flex gap-2 mb-3">
        <select
          value={curMonth}
          onChange={(e) => jumpTo(new Date(curYear, Number(e.target.value) - 1, 1))}
          style={{ ...getInputStyle(), flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 700 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select
          value={curYear}
          onChange={(e) => jumpTo(new Date(Number(e.target.value), curMonth - 1, 1))}
          style={{ ...getInputStyle(), flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 700 }}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>Năm {y}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <button onClick={() => setAnchor(addDays(anchor, -7))} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: C.neutralBg }}>
          <ChevronLeft size={14} color={C.sub} />
        </button>
        <button
          onClick={() => { setAnchor(startOfWeek(new Date())); setSelected(new Date()); }}
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ color: C.navy, backgroundColor: C.blueBg }}
        >
          Hôm nay
        </button>
        <button onClick={() => setAnchor(addDays(anchor, 7))} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ backgroundColor: C.neutralBg }}>
          <ChevronRight size={14} color={C.sub} />
        </button>
      </div>

      <div className="flex gap-1.5 mb-5">
        {weekDays.map((d) => {
          const iso = isoDay(d);
          const isSel = iso === selIso;
          const isToday = iso === todayIsoV;
          return (
            <button
              key={iso}
              onClick={() => setSelected(d)}
              className="flex-1 rounded-2xl py-2 flex flex-col items-center gap-1"
              style={{
                backgroundColor: isSel ? C.navy : C.card,
                border: `1px solid ${isSel ? C.navy : C.border}`,
              }}
            >
              <span className="text-[10px] font-semibold" style={{ color: isSel ? "rgba(255,255,255,0.7)" : C.sub }}>{WEEKDAY[d.getDay()]}</span>
              <span className="text-sm font-bold" style={{ color: isSel ? "#fff" : isToday ? C.navy : C.text }}>{d.getDate()}</span>
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: hasTask(d) ? (isSel ? "#fff" : C.navy) : "transparent" }} />
            </button>
          );
        })}
      </div>

      <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>
        {selIso === todayIsoV ? "Hôm nay" : new Date(selected).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
      </div>

      {dayTasks.length === 0 ? (
        <EmptyState icon={<ListChecks size={26} color="#fff" />} title="Chưa có công việc" sub="Thêm việc cần làm hoặc lời nhắc cho ngày này" actionLabel="Thêm công việc" onAction={() => onAdd(selIso)} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {dayTasks.map((t) => (
            <div key={t.id} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ backgroundColor: C.card, border: `1px solid ${t._overdue ? C.red : C.border}` }}>
              <button onClick={() => onToggle(t, selIso)}>
                {t._done ? <CheckCircle2 size={22} color={C.green} /> : <Circle size={22} color={C.sub} />}
              </button>
              <div className="flex-1" onClick={() => onEdit(t)}>
                <div className="text-sm font-semibold" style={{ color: t._done ? C.sub : C.text, textDecoration: t._done ? "line-through" : "none" }}>{t.title}</div>
                {t.note && <div className="text-xs mt-0.5" style={{ color: C.sub }}>{t.note}</div>}
                <div className="flex items-center gap-2 mt-1">
                  {t.type === "daily" && (
                    <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: C.blue }}><Repeat size={10} /> Hằng ngày</span>
                  )}
                  {t.time && (
                    <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: C.sub }}><Clock size={10} /> {t.time}</span>
                  )}
                  {t._overdue && <span className="text-[10px] font-bold" style={{ color: C.red }}>Quá hạn</span>}
                </div>
              </div>
              <button onClick={() => onEdit(t)}><ChevronRight size={16} color={C.sub} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskForm({ existing, presetDate, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [type, setType] = useState(existing?.type || "once");
  const [date, setDate] = useState(existing?.date || presetDate || isoDay(new Date()));
  const [time, setTime] = useState(existing?.time || "");
  const [note, setNote] = useState(existing?.note || "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      id: existing?.id || uid(),
      title: title.trim(),
      type,
      date: type === "once" ? date : null,
      time: time || null,
      note,
      done: existing?.done || false,
      completedDates: existing?.completedDates || [],
      createdAt: existing?.createdAt || todayISO(),
    });
  };

  return (
    <div>
      <Field label="Tên công việc *"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Gọi lại khách hàng ABC" autoFocus /></Field>

      <Field label="Loại">
        <div className="flex gap-2">
          <button onClick={() => setType("once")} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ backgroundColor: type === "once" ? C.navy : C.neutralBg, color: type === "once" ? "#fff" : C.sub }}>
            Một lần
          </button>
          <button onClick={() => setType("daily")} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ backgroundColor: type === "daily" ? C.navy : C.neutralBg, color: type === "daily" ? "#fff" : C.sub }}>
            <Repeat size={12} /> Lặp lại hằng ngày
          </button>
        </div>
      </Field>

      {type === "once" && (
        <Field label="Ngày thực hiện">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}
      <Field label={type === "daily" ? "Giờ nhắc mỗi ngày (không bắt buộc)" : "Giờ nhắc (không bắt buộc)"}>
        <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      {time && (
        <div className="text-[11px] mb-4 -mt-2 flex items-center gap-1.5" style={{ color: C.sub }}>
          <Bell size={11} />
          Đến giờ, app sẽ gửi thông báo đẩy kèm âm thanh (chỉ hoạt động trên app đã cài, không có trong bản xem trước)
        </div>
      )}
      <Field label="Ghi chú"><TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Chi tiết công việc..." /></Field>

      <button onClick={submit} className="w-full py-3 rounded-2xl font-bold text-white text-sm mb-2" style={{ backgroundColor: C.navy }}>Lưu công việc</button>
      {onDelete && (
        <button onClick={() => onDelete(existing.id)} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ backgroundColor: C.redBg, color: C.red }}>Xoá công việc</button>
      )}
    </div>
  );
}

/* ---------------------------------- SETTINGS SCREEN ---------------------------------- */
function SettingsScreen({ themeMode, accentTone, onSetThemeMode, onSetAccentTone, systemPrefersDark }) {
  const modes = [
    { k: "light", l: "Sáng", icon: Sun },
    { k: "dark", l: "Tối", icon: Moon },
    { k: "system", l: "Theo hệ thống", icon: Smartphone },
  ];
  return (
    <div className="px-5 py-5">
      <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>Chế độ hiển thị</div>
      <div className="flex gap-2 mb-6">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = themeMode === m.k;
          return (
            <button
              key={m.k}
              onClick={() => onSetThemeMode(m.k)}
              className="flex-1 rounded-2xl py-3.5 flex flex-col items-center gap-1.5"
              style={{ backgroundColor: active ? C.navy : C.card, border: `1px solid ${active ? C.navy : C.border}` }}
            >
              <Icon size={18} color={active ? "#fff" : C.sub} />
              <span className="text-[11px] font-bold" style={{ color: active ? "#fff" : C.sub }}>{m.l}</span>
            </button>
          );
        })}
      </div>
      {themeMode === "system" && (
        <div className="text-[11px] mb-6 -mt-4" style={{ color: C.sub }}>
          Thiết bị của bạn hiện đang ở chế độ {systemPrefersDark ? "Tối" : "Sáng"}, app sẽ tự đổi theo.
        </div>
      )}

      <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>Tông màu chủ đạo</div>
      <div className="grid grid-cols-3 gap-2.5">
        {Object.entries(TONES).map(([key, tone]) => {
          const active = accentTone === key;
          return (
            <button
              key={key}
              onClick={() => onSetAccentTone(key)}
              className="rounded-2xl p-3 flex flex-col items-center gap-2"
              style={{ backgroundColor: C.card, border: `2px solid ${active ? tone.primary : C.border}` }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tone.primary }}>
                {active && <Check size={16} color="#fff" />}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: C.text }}>{tone.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- REPORTS TAB ---------------------------------- */
function ReportsTab({ quotes, customers, quoteTotal, quoteCost, onOpenQuote }) {
  const [rangeType, setRangeType] = useState("month"); // week|month|quarter|year|custom
  const [anchor, setAnchor] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(isoDay(addDays(new Date(), -30)));
  const [customTo, setCustomTo] = useState(isoDay(new Date()));
  const [custFilter, setCustFilter] = useState("all"); // 'all' | 'c:<id>' | 'g:<group>'

  const groups = [...new Set(customers.map((c) => c.group).filter(Boolean))];

  const { start, end, label } = useMemo(() => {
    if (rangeType === "week") {
      const s = startOfWeek(anchor), e = addDays(s, 6);
      return { start: s, end: e, label: `${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}` };
    }
    if (rangeType === "month") {
      const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: s, end: e, label: `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}` };
    }
    if (rangeType === "quarter") {
      const q = Math.floor(anchor.getMonth() / 3);
      const s = new Date(anchor.getFullYear(), q * 3, 1);
      const e = new Date(anchor.getFullYear(), q * 3 + 3, 0);
      return { start: s, end: e, label: `Quý ${q + 1}/${anchor.getFullYear()}` };
    }
    if (rangeType === "year") {
      const s = new Date(anchor.getFullYear(), 0, 1);
      const e = new Date(anchor.getFullYear(), 11, 31);
      return { start: s, end: e, label: `Năm ${anchor.getFullYear()}` };
    }
    return { start: new Date(customFrom), end: new Date(customTo), label: `${customFrom} → ${customTo}` };
  }, [rangeType, anchor, customFrom, customTo]);

  const custMatches = (q) => {
    if (custFilter === "all") return true;
    if (custFilter.startsWith("c:")) return q.customerId === custFilter.slice(2);
    if (custFilter.startsWith("g:")) {
      const cust = customers.find((c) => c.id === q.customerId);
      return cust && cust.group === custFilter.slice(2);
    }
    return true;
  };

  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  const matched = quotes
    .filter((q) => (q.status === "won" || q.status === "done") && custMatches(q))
    .filter((q) => { const t = new Date(revenueDate(q)); return t >= start && t <= endOfDay; })
    .sort((a, b) => new Date(revenueDate(b)) - new Date(revenueDate(a)));

  const totalRevenue = matched.reduce((s, q) => s + quoteTotal(q), 0);
  const totalCost = matched.reduce((s, q) => s + quoteCost(q), 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const bucketRange = (bStart, bEnd, name) => {
    const qs = matched.filter((q) => { const t = new Date(revenueDate(q)); return t >= bStart && t <= bEnd; });
    const rev = qs.reduce((s, q) => s + quoteTotal(q), 0);
    const cost = qs.reduce((s, q) => s + quoteCost(q), 0);
    return { name, "Doanh thu": rev, "Lợi nhuận": rev - cost };
  };
  const chartData = useMemo(() => {
    if (rangeType === "year") {
      return Array.from({ length: 12 }, (_, i) => bucketRange(new Date(anchor.getFullYear(), i, 1), new Date(anchor.getFullYear(), i + 1, 0, 23, 59, 59, 999), `T${i + 1}`));
    }
    if (rangeType === "quarter") {
      const q0 = Math.floor(anchor.getMonth() / 3) * 3;
      return Array.from({ length: 3 }, (_, i) => bucketRange(new Date(anchor.getFullYear(), q0 + i, 1), new Date(anchor.getFullYear(), q0 + i + 1, 0, 23, 59, 59, 999), `T${q0 + i + 1}`));
    }
    if (rangeType === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        return bucketRange(new Date(d.getFullYear(), d.getMonth(), d.getDate()), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999), WEEKDAY[d.getDay()]);
      });
    }
    return null;
  }, [rangeType, anchor, matched, start]);

  const shiftAnchor = (dir) => {
    const d = anchor;
    if (rangeType === "week") setAnchor(addDays(anchor, dir * 7));
    else if (rangeType === "month") setAnchor(new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else if (rangeType === "quarter") setAnchor(new Date(d.getFullYear(), d.getMonth() + dir * 3, 1));
    else if (rangeType === "year") setAnchor(new Date(d.getFullYear() + dir, d.getMonth(), 1));
  };

  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-4">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[["week", "Tuần"], ["month", "Tháng"], ["quarter", "Quý"], ["year", "Năm"], ["custom", "Tuỳ chọn"]].map(([k, l]) => (
          <button key={k} onClick={() => setRangeType(k)} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: rangeType === k ? C.navy : C.neutralBg, color: rangeType === k ? "#fff" : C.sub }}>{l}</button>
        ))}
      </div>

      {rangeType !== "custom" ? (
        <div className="flex items-center justify-between mb-3 rounded-xl px-1 py-1.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <button onClick={() => shiftAnchor(-1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }}><ChevronLeft size={14} color={C.sub} /></button>
          <span className="text-xs font-bold" style={{ color: C.text }}>{label}</span>
          <button onClick={() => shiftAnchor(1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: C.neutralBg }}><ChevronRight size={14} color={C.sub} /></button>
        </div>
      ) : (
        <div className="flex gap-2 mb-3">
          <TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      <select value={custFilter} onChange={(e) => setCustFilter(e.target.value)} style={{ ...getInputStyle(), marginBottom: 16 }}>
        <option value="all">Tất cả khách hàng</option>
        <optgroup label="Theo khách hàng">
          {customers.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}
        </optgroup>
        {groups.length > 0 && (
          <optgroup label="Theo nhóm">
            {groups.map((g) => <option key={g} value={`g:${g}`}>{g}</option>)}
          </optgroup>
        )}
      </select>

      <div className="flex gap-3 mb-3">
        <StatCard label="Doanh thu" value={money(totalRevenue)} icon={<TrendingUp size={15} color={C.green} />} tint={C.green} />
        <StatCard label="Lợi nhuận" value={money(totalProfit)} icon={<TrendingUp size={15} color={C.navy} />} tint={C.navy} />
      </div>
      <div className="flex gap-3 mb-6">
        <StatCard label="Biên lợi nhuận" value={`${margin.toFixed(1)}%`} icon={<BarChart3 size={15} color={C.amber} />} tint={C.amber} />
        <StatCard label="Đơn đã chốt" value={matched.length} icon={<Check size={15} color={C.blue} />} tint={C.blue} />
      </div>

      {chartData && (
        <div className="rounded-2xl p-3 mb-4" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF0F5" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.sub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: C.sub }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}tr` : v)} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
              <Bar dataKey="Doanh thu" fill={C.navy} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lợi nhuận" fill="#7FB3F5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-sm font-bold mb-2.5" style={{ color: C.text }}>Đơn hàng trong khoảng này ({matched.length})</div>
      {matched.length === 0 ? (
        <div className="text-sm text-center py-8" style={{ color: C.sub }}>Không có đơn hàng nào khớp bộ lọc</div>
      ) : (
        <div className="flex flex-col gap-2">
          {matched.map((q) => {
            const cust = customers.find((c) => c.id === q.customerId);
            return (
              <div key={q.id} onClick={() => onOpenQuote(q.id)} className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.text }}>{cust?.name || "Khách lẻ"}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: C.sub }}>{quoteCode(q)} · {new Date(revenueDate(q)).toLocaleDateString("vi-VN")}</div>
                </div>
                <span className="text-xs font-bold" style={{ color: C.text }}>{money(quoteTotal(q))}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
