var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-PjGkoF/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.js
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await handleApiRequest(request, env, url);
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Access-Control-Allow-Origin", "*");
        if (!newHeaders.has("Content-Type")) {
          newHeaders.set("Content-Type", "application/json; charset=utf-8");
        }
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      }
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
async function handleApiRequest(request, env, url) {
  const db = env.DB;
  if (!db) {
    throw new Error("Database binding 'DB' is missing. Please check wrangler.toml.");
  }
  const path = url.pathname;
  const method = request.method;
  if (path === "/api/assets" && method === "GET") {
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const status = url.searchParams.get("status") || "";
    const expiration = url.searchParams.get("expiration") || "";
    let query = `SELECT * FROM assets WHERE 1=1`;
    const params = [];
    if (search) {
      query += ` AND (asset_id LIKE ? OR name LIKE ? OR assignee LIKE ? OR department LIKE ? OR location LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (expiration === "expired") {
      query += ` AND expiration_date IS NOT NULL AND expiration_date <> '' AND expiration_date < date('now', 'localtime')`;
    } else if (expiration === "expiring") {
      query += ` AND expiration_date IS NOT NULL AND expiration_date <> '' AND expiration_date >= date('now', 'localtime') AND expiration_date <= date('now', 'localtime', '+30 days')`;
    } else if (expiration === "safe") {
      query += ` AND (expiration_date IS NULL OR expiration_date = '' OR expiration_date > date('now', 'localtime', '+30 days'))`;
    }
    query += ` ORDER BY asset_id ASC`;
    const { results } = await db.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results));
  }
  const assetIdMatch = path.match(/^\/api\/assets\/([^\/]+)$/);
  if (assetIdMatch && method === "GET") {
    const assetId = decodeURIComponent(assetIdMatch[1]);
    const asset = await db.prepare(`SELECT * FROM assets WHERE asset_id = ?`).bind(assetId).first();
    if (!asset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    }
    const { results: logs } = await db.prepare(`SELECT * FROM activity_logs WHERE asset_id = ? ORDER BY logged_at DESC`).bind(assetId).all();
    return new Response(JSON.stringify({ asset, logs }));
  }
  if (path === "/api/assets" && method === "POST") {
    const data = await request.json();
    if (!data.asset_id || !data.name || !data.category || !data.status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const existing = await db.prepare(`SELECT id FROM assets WHERE asset_id = ?`).bind(data.asset_id).first();
    if (existing) {
      return new Response(JSON.stringify({ error: `Asset ID ${data.asset_id} is already in use` }), { status: 400 });
    }
    const query = `
      INSERT INTO assets (asset_id, name, category, type, status, purchase_date, purchase_price, expiration_date, assignee, department, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.prepare(query).bind(
      data.asset_id,
      data.name,
      data.category,
      data.type || "",
      data.status,
      data.purchase_date || null,
      data.purchase_price !== void 0 && data.purchase_price !== null && data.purchase_price !== "" ? Number(data.purchase_price) : null,
      data.expiration_date || null,
      data.assignee || null,
      data.department || null,
      data.location || null,
      data.notes || ""
    ).run();
    const logDetails = `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2A\u0E34\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E43\u0E2B\u0E21\u0E48: ${data.name} (\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17: ${data.type || "N/A"}, \u0E2A\u0E16\u0E32\u0E19\u0E30: ${data.status})`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'CREATE', ?)`).bind(data.asset_id, logDetails).run();
    return new Response(JSON.stringify({ success: true, asset_id: data.asset_id }), { status: 201 });
  }
  if (assetIdMatch && method === "PUT") {
    const currentAssetId = decodeURIComponent(assetIdMatch[1]);
    const data = await request.json();
    if (!data.name || !data.category || !data.status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const existing = await db.prepare(`SELECT * FROM assets WHERE asset_id = ?`).bind(currentAssetId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    }
    if (data.asset_id && data.asset_id !== currentAssetId) {
      const duplicate = await db.prepare(`SELECT id FROM assets WHERE asset_id = ?`).bind(data.asset_id).first();
      if (duplicate) {
        return new Response(JSON.stringify({ error: `Asset ID ${data.asset_id} is already in use` }), { status: 400 });
      }
    }
    const nextAssetId = data.asset_id || currentAssetId;
    const query = `
      UPDATE assets SET
        asset_id = ?,
        name = ?,
        category = ?,
        type = ?,
        status = ?,
        purchase_date = ?,
        purchase_price = ?,
        expiration_date = ?,
        assignee = ?,
        department = ?,
        location = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE asset_id = ?
    `;
    await db.prepare(query).bind(
      nextAssetId,
      data.name,
      data.category,
      data.type || "",
      data.status,
      data.purchase_date || null,
      data.purchase_price !== void 0 && data.purchase_price !== null && data.purchase_price !== "" ? Number(data.purchase_price) : null,
      data.expiration_date || null,
      data.assignee || null,
      data.department || null,
      data.location || null,
      data.notes || "",
      currentAssetId
    ).run();
    let changeDetails = `\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E34\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C: ${data.name}`;
    const changes = [];
    if (existing.status !== data.status) changes.push(`\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30: ${existing.status} \u2794 ${data.status}`);
    if (existing.assignee !== data.assignee) changes.push(`\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1C\u0E39\u0E49\u0E04\u0E23\u0E2D\u0E07: ${existing.assignee || "\u0E44\u0E21\u0E48\u0E21\u0E35"} \u2794 ${data.assignee || "\u0E44\u0E21\u0E48\u0E21\u0E35"}`);
    if (existing.location !== data.location) changes.push(`\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48: ${existing.location || "\u0E44\u0E21\u0E48\u0E21\u0E35"} \u2794 ${data.location || "\u0E44\u0E21\u0E48\u0E21\u0E35"}`);
    if (changes.length > 0) {
      changeDetails += ` (${changes.join(", ")})`;
    }
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'UPDATE', ?)`).bind(nextAssetId, changeDetails).run();
    if (nextAssetId !== currentAssetId) {
      await db.prepare(`UPDATE activity_logs SET asset_id = ? WHERE asset_id = ?`).bind(nextAssetId, currentAssetId).run();
    }
    return new Response(JSON.stringify({ success: true, asset_id: nextAssetId }));
  }
  if (assetIdMatch && method === "DELETE") {
    const assetId = decodeURIComponent(assetIdMatch[1]);
    const existing = await db.prepare(`SELECT name FROM assets WHERE asset_id = ?`).bind(assetId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    }
    await db.prepare(`DELETE FROM assets WHERE asset_id = ?`).bind(assetId).run();
    const logDetails = `\u0E25\u0E1A\u0E2A\u0E34\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A: ${existing.name}`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'DELETE', ?)`).bind(assetId, logDetails).run();
    return new Response(JSON.stringify({ success: true }));
  }
  if (path === "/api/logs" && method === "GET") {
    const limit = Number(url.searchParams.get("limit") || "100");
    const { results } = await db.prepare(`SELECT * FROM activity_logs ORDER BY logged_at DESC LIMIT ?`).bind(limit).all();
    return new Response(JSON.stringify(results));
  }
  if (path === "/api/assets/bulk" && method === "POST") {
    const assetsList = await request.json();
    if (!Array.isArray(assetsList)) {
      return new Response(JSON.stringify({ error: "Data must be an array" }), { status: 400 });
    }
    let insertedCount = 0;
    let updatedCount = 0;
    let errors = [];
    const insertStmt = db.prepare(`
      INSERT INTO assets (asset_id, name, category, type, status, purchase_date, purchase_price, expiration_date, assignee, department, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = db.prepare(`
      UPDATE assets SET
        name = ?,
        category = ?,
        type = ?,
        status = ?,
        purchase_date = ?,
        purchase_price = ?,
        expiration_date = ?,
        assignee = ?,
        department = ?,
        location = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE asset_id = ?
    `);
    const selectStmt = db.prepare(`SELECT id FROM assets WHERE asset_id = ?`);
    const logStmt = db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'IMPORT', ?)`);
    const statements = [];
    for (let i = 0; i < assetsList.length; i++) {
      const asset = assetsList[i];
      if (!asset.asset_id || !asset.name || !asset.category || !asset.status) {
        errors.push(`\u0E41\u0E16\u0E27\u0E17\u0E35\u0E48 ${i + 1}: \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 (asset_id, name, category, status)`);
        continue;
      }
      const existing = await selectStmt.bind(asset.asset_id).first();
      if (existing) {
        statements.push(updateStmt.bind(
          asset.name,
          asset.category,
          asset.type || "",
          asset.status,
          asset.purchase_date || null,
          asset.purchase_price !== void 0 && asset.purchase_price !== null && asset.purchase_price !== "" ? Number(asset.purchase_price) : null,
          asset.expiration_date || null,
          asset.assignee || null,
          asset.department || null,
          asset.location || null,
          asset.notes || "",
          asset.asset_id
        ));
        statements.push(logStmt.bind(asset.asset_id, `\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1F\u0E25\u0E4C Excel: ${asset.name}`));
        updatedCount++;
      } else {
        statements.push(insertStmt.bind(
          asset.asset_id,
          asset.name,
          asset.category,
          asset.type || "",
          asset.status,
          asset.purchase_date || null,
          asset.purchase_price !== void 0 && asset.purchase_price !== null && asset.purchase_price !== "" ? Number(asset.purchase_price) : null,
          asset.expiration_date || null,
          asset.assignee || null,
          asset.department || null,
          asset.location || null,
          asset.notes || ""
        ));
        statements.push(logStmt.bind(asset.asset_id, `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2A\u0E34\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1F\u0E25\u0E4C Excel: ${asset.name}`));
        insertedCount++;
      }
    }
    if (statements.length > 0) {
      await db.batch(statements);
    }
    const importSummaryLog = `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E34\u0E19\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E4C\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E23\u0E27\u0E21 ${insertedCount + updatedCount} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 (\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E43\u0E2B\u0E21\u0E48: ${insertedCount}, \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15: ${updatedCount})`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES ('SYSTEM', 'IMPORT', ?)`).bind(importSummaryLog).run();
    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      errors
    }));
  }
  return new Response("Not Found", { status: 404 });
}
__name(handleApiRequest, "handleApiRequest");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-PjGkoF/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-PjGkoF/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
