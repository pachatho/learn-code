export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        }
      });
    }

    // Route to API or Static Assets
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await handleApiRequest(request, env, url);
        // Add CORS and Content-Type headers to API responses
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

    // Default static assets fallback (served by wrangler assets config)
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

  // GET /api/assets
  if (path === "/api/assets" && method === "GET") {
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const status = url.searchParams.get("status") || "";
    const expiration = url.searchParams.get("expiration") || ""; // 'all', 'expired', 'expiring', 'safe'

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

  // GET /api/assets/:id
  const assetIdMatch = path.match(/^\/api\/assets\/([^\/]+)$/);
  if (assetIdMatch && method === "GET") {
    const assetId = decodeURIComponent(assetIdMatch[1]);
    const asset = await db.prepare(`SELECT * FROM assets WHERE asset_id = ?`).bind(assetId).first();
    if (!asset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    }
    
    // Fetch logs for this asset
    const { results: logs } = await db.prepare(`SELECT * FROM activity_logs WHERE asset_id = ? ORDER BY logged_at DESC`).bind(assetId).all();
    
    return new Response(JSON.stringify({ asset, logs }));
  }

  // POST /api/assets
  if (path === "/api/assets" && method === "POST") {
    const data = await request.json();
    
    if (!data.asset_id || !data.name || !data.category || !data.status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Check unique
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
      data.purchase_price !== undefined && data.purchase_price !== null && data.purchase_price !== "" ? Number(data.purchase_price) : null,
      data.expiration_date || null,
      data.assignee || null,
      data.department || null,
      data.location || null,
      data.notes || ""
    ).run();

    const logDetails = `เพิ่มสินทรัพย์ใหม่: ${data.name} (ประเภท: ${data.type || 'N/A'}, สถานะ: ${data.status})`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'CREATE', ?)`).bind(data.asset_id, logDetails).run();

    return new Response(JSON.stringify({ success: true, asset_id: data.asset_id }), { status: 201 });
  }

  // PUT /api/assets/:id
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
      data.purchase_price !== undefined && data.purchase_price !== null && data.purchase_price !== "" ? Number(data.purchase_price) : null,
      data.expiration_date || null,
      data.assignee || null,
      data.department || null,
      data.location || null,
      data.notes || "",
      currentAssetId
    ).run();

    let changeDetails = `แก้ไขข้อมูลสินทรัพย์: ${data.name}`;
    const changes = [];
    if (existing.status !== data.status) changes.push(`เปลี่ยนสถานะ: ${existing.status} ➔ ${data.status}`);
    if (existing.assignee !== data.assignee) changes.push(`เปลี่ยนผู้ครอง: ${existing.assignee || 'ไม่มี'} ➔ ${data.assignee || 'ไม่มี'}`);
    if (existing.location !== data.location) changes.push(`เปลี่ยนสถานที่: ${existing.location || 'ไม่มี'} ➔ ${data.location || 'ไม่มี'}`);
    
    if (changes.length > 0) {
      changeDetails += ` (${changes.join(", ")})`;
    }

    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'UPDATE', ?)`).bind(nextAssetId, changeDetails).run();

    if (nextAssetId !== currentAssetId) {
      await db.prepare(`UPDATE activity_logs SET asset_id = ? WHERE asset_id = ?`).bind(nextAssetId, currentAssetId).run();
    }

    return new Response(JSON.stringify({ success: true, asset_id: nextAssetId }));
  }

  // DELETE /api/assets/:id
  if (assetIdMatch && method === "DELETE") {
    const assetId = decodeURIComponent(assetIdMatch[1]);
    
    const existing = await db.prepare(`SELECT name FROM assets WHERE asset_id = ?`).bind(assetId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    }

    await db.prepare(`DELETE FROM assets WHERE asset_id = ?`).bind(assetId).run();

    const logDetails = `ลบสินทรัพย์ออกจากระบบ: ${existing.name}`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES (?, 'DELETE', ?)`).bind(assetId, logDetails).run();

    return new Response(JSON.stringify({ success: true }));
  }

  // GET /api/logs
  if (path === "/api/logs" && method === "GET") {
    const limit = Number(url.searchParams.get("limit") || "100");
    const { results } = await db.prepare(`SELECT * FROM activity_logs ORDER BY logged_at DESC LIMIT ?`).bind(limit).all();
    return new Response(JSON.stringify(results));
  }

  // POST /api/assets/bulk
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
        errors.push(`แถวที่ ${i+1}: ข้อมูลจำเป็นไม่ครบถ้วน (asset_id, name, category, status)`);
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
          asset.purchase_price !== undefined && asset.purchase_price !== null && asset.purchase_price !== "" ? Number(asset.purchase_price) : null,
          asset.expiration_date || null,
          asset.assignee || null,
          asset.department || null,
          asset.location || null,
          asset.notes || "",
          asset.asset_id
        ));
        statements.push(logStmt.bind(asset.asset_id, `อัปเดตข้อมูลผ่านการนำเข้าไฟล์ Excel: ${asset.name}`));
        updatedCount++;
      } else {
        statements.push(insertStmt.bind(
          asset.asset_id,
          asset.name,
          asset.category,
          asset.type || "",
          asset.status,
          asset.purchase_date || null,
          asset.purchase_price !== undefined && asset.purchase_price !== null && asset.purchase_price !== "" ? Number(asset.purchase_price) : null,
          asset.expiration_date || null,
          asset.assignee || null,
          asset.department || null,
          asset.location || null,
          asset.notes || ""
        ));
        statements.push(logStmt.bind(asset.asset_id, `เพิ่มสินทรัพย์ใหม่ผ่านการนำเข้าไฟล์ Excel: ${asset.name}`));
        insertedCount++;
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    const importSummaryLog = `นำเข้าข้อมูลสินทรัพย์สำเร็จ รวม ${insertedCount + updatedCount} รายการ (เพิ่มใหม่: ${insertedCount}, อัปเดต: ${updatedCount})`;
    await db.prepare(`INSERT INTO activity_logs (asset_id, action, details) VALUES ('SYSTEM', 'IMPORT', ?)`).bind(importSummaryLog).run();

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errors
    }));
  }

  return new Response("Not Found", { status: 404 });
}
