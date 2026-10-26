export const HEALTH_URL = import.meta.env.VITE_SYSTEM_HEALTH_URL || "";
export const HEALTH_HISTORY_KEY = "presensee_admin_health_history_v2";
export const HEALTH_INTERVAL = 60000;
export const SERVICE_NAMES = {
    api: "API principal",
    database: "Banco de dados",
    biometric: "Biometria facial",
    ai: "Assistente e IA",
    server: "Servidor",
    login: "Login",
    attendance: "Frequência",
    reports: "Relatórios",
    interventions: "Intervenções"
};

const VALID_STATUSES = ["operational", "degraded", "down", "unknown"];

export function safeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function loadHistory() {
    try {
        const value = JSON.parse(localStorage.getItem(HEALTH_HISTORY_KEY));
        return Array.isArray(value) ? value.slice(0, 250) : [];
    } catch {
        return [];
    }
}

export function saveHistory(entries) {
    try {
        localStorage.setItem(HEALTH_HISTORY_KEY, JSON.stringify(entries.slice(0, 250)));
        return true;
    } catch {
        return false;
    }
}

function normalizeService(key, raw) {
    if (!raw || typeof raw !== "object") {
        return { key, name: SERVICE_NAMES[key], status: "unknown", detail: "Sem dados desse serviço" };
    }

    return {
        key,
        name: SERVICE_NAMES[key],
        status: VALID_STATUSES.includes(raw.status) ? raw.status : "unknown",
        latencyMs: safeNumber(raw.latencyMs),
        errorRatePercent: safeNumber(raw.errorRatePercent),
        detail: typeof raw.detail === "string" ? raw.detail : "",
        checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null,
        code: typeof raw.code === "number" ? raw.code : null
    };
}

export function normalizeHealth(payload, elapsedMs, httpStatus) {
    const data = payload && typeof payload === "object" ? payload : {};
    const services = Object.keys(SERVICE_NAMES).map((key) => normalizeService(key, data.services?.[key]));
    const server = data.metrics?.server || {};
    const metrics = {
        cpuPercent: safeNumber(server.cpuPercent),
        memoryPercent: safeNumber(server.memoryPercent),
        diskPercent: safeNumber(server.diskPercent),
        memoryUsedMb: safeNumber(server.memoryUsedMb),
        diskFreeGb: safeNumber(server.diskFreeGb)
    };
    const rawIssues = Array.isArray(data.issues) ? data.issues : [];
    const issues = rawIssues.filter((item) => item && typeof item === "object").slice(0, 40).map((item) => ({
        id: String(item.id || item.service || "issue"),
        service: String(item.service || "unknown"),
        title: String(item.title || "Anomalia identificada"),
        detail: String(item.detail || ""),
        severity: ["warning", "critical"].includes(item.severity) ? item.severity : "warning"
    }));
    return {
        timestamp: new Date().toISOString(),
        httpStatus,
        requestLatencyMs: Math.round(elapsedMs),
        services,
        metrics,
        issues,
        received: true
    };
}

export async function fetchSystemHealth(signal) {
    if (!HEALTH_URL) {
        return { timestamp: new Date().toISOString(), received: false, configurationMissing: true, services: [], metrics: {}, issues: [] };
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const start = performance.now();

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(HEALTH_URL, {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
            signal: controller.signal
        });
        const elapsed = performance.now() - start;
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        if (!response.ok) {
            return {
                timestamp: new Date().toISOString(), received: false,
                requestLatencyMs: Math.round(elapsed), httpStatus: response.status,
                error: `Endpoint de diagnóstico respondeu HTTP ${response.status}`,
                services: [], metrics: {}, issues: []
            };
        }
        if (!data || typeof data !== "object" || !data.services || typeof data.services !== "object") {
            return { timestamp: new Date().toISOString(), received: false, requestLatencyMs: Math.round(elapsed), error: "Resposta inválida: campo services ausente", services: [], metrics: {}, issues: [] };
        }
        return normalizeHealth(data, elapsed, response.status);
    } catch (error) {
        if (signal?.aborted) return null;
        return {
            timestamp: new Date().toISOString(), received: false,
            error: error?.name === "AbortError" ? "Tempo limite excedido (10 segundos)" : "Falha de conexão, CORS ou serviço indisponível",
            services: [], metrics: {}, issues: []
        };
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", abort);
    }
}

export function getOverallState(snapshot) {
    if (!snapshot || snapshot.configurationMissing) return { status: "unknown", label: "Não configurado" };
    if (!snapshot.received) return { status: "unknown", label: "Não confirmado" };
    const statuses = snapshot.services.map((service) => service.status);
    if (statuses.includes("down")) return { status: "down", label: "Falhas detectadas" };
    if (statuses.includes("degraded")) return { status: "degraded", label: "Desempenho degradado" };
    if (statuses.includes("unknown")) return { status: "unknown", label: "Verificação incompleta" };
    return { status: "operational", label: "Serviços operacionais" };
}

export function summaryStats(history) {
    const valid = history.filter((item) => item.received);
    const timings = history.map((item) => item.requestLatencyMs).filter((n) => Number.isFinite(n));
    return {
        checks: history.length,
        availability: history.length ? (valid.length / history.length) * 100 : null,
        averageLatency: timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : null,
        failed: history.filter((entry) => !entry.received || entry.services?.some((service) => service.status === "down")).length
    };
}
