-- Migration: Create assets and activity_logs tables
-- Target: Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Hardware, Software, Network, Other
  type TEXT NOT NULL, -- Laptop, Server, License, etc.
  status TEXT NOT NULL, -- Active, Storage, Repair, Retired
  purchase_date TEXT, -- YYYY-MM-DD
  purchase_price REAL,
  expiration_date TEXT, -- YYYY-MM-DD
  assignee TEXT,
  department TEXT,
  location TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, ASSIGN, IMPORT
  details TEXT NOT NULL,
  logged_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_expiration ON assets(expiration_date);
CREATE INDEX IF NOT EXISTS idx_logs_asset_id ON activity_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_logs_logged_at ON activity_logs(logged_at);

-- Insert some initial mock data for preview
INSERT OR IGNORE INTO assets (asset_id, name, category, type, status, purchase_date, purchase_price, expiration_date, assignee, department, location, notes)
VALUES 
('IT-HW-0001', 'MacBook Pro 16" M3 Max', 'Hardware', 'Laptop', 'Active', '2025-01-15', 112900.00, '2028-01-15', 'Somchai Jaidee', 'Engineering', 'HQ Office - Fl 4', 'เครื่องหลักสำหรับการพัฒนาซอฟต์แวร์'),
('IT-HW-0002', 'Dell UltraSharp 27" U2723QE', 'Hardware', 'Monitor', 'Active', '2025-01-20', 18900.00, '2028-01-20', 'Somsri Rakdee', 'Design', 'HQ Office - Fl 4', 'จอภาพรองรับสี 100% sRGB'),
('IT-SW-0001', 'Microsoft 365 Business Standard', 'Software', 'License', 'Active', '2025-06-01', 5400.00, '2026-06-01', 'System Account', 'IT Support', 'Cloud', 'ไลเซนส์รายปีต่ออายุอัตโนมัติ'),
('IT-SW-0002', 'Adobe Creative Cloud All Apps', 'Software', 'License', 'Active', '2025-07-10', 28500.00, '2026-07-10', 'Piti Chuchai', 'Marketing', 'Cloud', 'ลิขสิทธิ์สำหรับกราฟิกดีไซเนอร์'),
('IT-NW-0001', 'Cisco Catalyst 9300 Switch', 'Network', 'Switch', 'Active', '2024-03-12', 125000.00, '2027-03-12', 'Network Admin', 'IT Infrastructure', 'Server Room A', 'Core Switch ประจำตึก A'),
('IT-HW-0003', 'Lenovo ThinkPad X1 Carbon Gen 11', 'Hardware', 'Laptop', 'Repair', '2024-08-05', 68000.00, '2027-08-05', 'Wichai Rungruang', 'Sales', 'HQ Office - Fl 2', 'ส่งซ่อมหน้าจอแตก รออะไหล่จากศูนย์'),
('IT-HW-0004', 'iPad Pro 11" M2', 'Hardware', 'Tablet', 'Storage', '2024-11-30', 32900.00, '2025-11-30', NULL, 'IT Stock', 'IT Storage Room', 'เครื่องสำรองสำหรับทดสอบแอปมือถือ'),
('IT-HW-0005', 'HP LaserJet Pro M404dn', 'Hardware', 'Printer', 'Retired', '2021-02-10', 12900.00, '2024-02-10', NULL, 'Admin', 'HQ Office - Fl 1', 'ปลดระวางเนื่องจากซ่อมไม่คุ้มค่า');

INSERT OR IGNORE INTO activity_logs (asset_id, action, details)
VALUES
('IT-HW-0001', 'CREATE', 'เพิ่มสินทรัพย์ใหม่และเปิดใช้งาน มอบหมายให้ Somchai Jaidee'),
('IT-SW-0001', 'CREATE', 'ซื้อสิทธิ์การใช้งาน Microsoft 365 จำนวน 1 บัญชี'),
('IT-HW-0003', 'UPDATE', 'เปลี่ยนสถานะเป็น ส่งซ่อม (Repair) และบันทึกหมายเหตุ: ส่งซ่อมหน้าจอแตก รออะไหล่จากศูนย์'),
('IT-HW-0005', 'UPDATE', 'เปลี่ยนสถานะเป็น ปลดระวาง (Retired) เนื่องจากหมดประกันและเสื่อมสภาพ');
