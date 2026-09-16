import { Product, Category, Supplier, InventoryTransaction, NotificationItem, SystemSettings, AppUser, AuditLog } from '../types';

export const DEMO_SETTINGS: SystemSettings = {
  businessName: 'Inventory Management',
  businessLogo: '',
  currency: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY',
  defaultReorderLevel: 10,
  allowNegativeInventory: false,
  lowStockAlertsEnabled: true,
  emailAlerts: true,
  updatedAt: new Date(),
  updatedBy: 'System',
};

const RAW_CATEGORIES = [
  { id: 'cat-comp', name: 'Computers & Laptops', description: 'Desktops, laptops, and mini PCs', active: true, createdAt: new Date() },
  { id: 'cat-acc', name: 'Computer Accessories', description: 'Mice, keyboards, webcams, and mousepads', active: true, createdAt: new Date() },
  { id: 'cat-disp', name: 'Monitors & Displays', description: '4K, curved, gaming, and portable monitors', active: true, createdAt: new Date() },
  { id: 'cat-net', name: 'Networking Equipment', description: 'Routers, switches, access points, and cables', active: true, createdAt: new Date() },
  { id: 'cat-stor', name: 'Storage & Memory', description: 'SSDs, HDDs, RAM, and flash drives', active: true, createdAt: new Date() },
  { id: 'cat-aud', name: 'Audio & Headsets', description: 'Noise-canceling headsets, speakers, mics', active: true, createdAt: new Date() },
  { id: 'cat-cabl', name: 'Cables & Adapters', description: 'HDMI, USB-C, DisplayPort, and power adapters', active: true, createdAt: new Date() },
  { id: 'cat-off', name: 'Office Furniture', description: 'Ergonomic chairs, standing desks, monitor arms', active: true, createdAt: new Date() },
  { id: 'cat-pwr', name: 'Power & UPS', description: 'Surge protectors, UPS batteries, chargers', active: true, createdAt: new Date() },
];

export const DEMO_CATEGORIES: Category[] = RAW_CATEGORIES.map((c) => ({
  ...c,
  updatedAt: c.createdAt,
})) as Category[];

const RAW_SUPPLIERS = [
  {
    id: 'sup-techflow',
    name: 'TechFlow Global Logistics',
    contactPerson: 'Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    email: 'sarah@techflow-dist.com',
    address: '100 Innovation Way, Suite 400, San Jose, CA 95134',
    website: 'https://techflow-dist.example.com',
    notes: 'Primary hardware distributor. Net 30 payment terms.',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sup-nexus',
    name: 'Nexus Micro Supply',
    contactPerson: 'David Chen',
    phone: '+1 (555) 876-5432',
    email: 'dchen@nexusmicro.com',
    address: '742 Evergreen Blvd, Austin, TX 78701',
    website: 'https://nexusmicro.example.com',
    notes: 'Specializes in memory, storage, and processors.',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sup-progear',
    name: 'ProGear Peripherals Ltd',
    contactPerson: 'Marcus Vance',
    phone: '+1 (555) 345-6789',
    email: 'marcus@progearperipherals.com',
    address: '88 Commerce St, Seattle, WA 98104',
    website: 'https://progear.example.com',
    notes: 'Supplier for mechanical keyboards, mice, and studio audio.',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sup-hyperlink',
    name: 'Hyperlink Networks Corp',
    contactPerson: 'Elena Rostova',
    phone: '+1 (555) 901-2345',
    email: 'elena@hyperlinknet.com',
    address: '500 Enterprise Pkwy, Chicago, IL 60606',
    website: 'https://hyperlinknet.example.com',
    notes: 'Enterprise routers, switches, and CAT6 cabling.',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sup-ergo',
    name: 'ErgoComfort Workspaces',
    contactPerson: 'Brian Miller',
    phone: '+1 (555) 432-1098',
    email: 'orders@ergocomfort.com',
    address: '12 Industrial Rd, Grand Rapids, MI 49503',
    website: 'https://ergocomfort.example.com',
    notes: 'Standing desks, ergonomic chairs, and desk accessories.',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sup-omnipower',
    name: 'OmniPower Technologies',
    contactPerson: 'Rachel Adams',
    phone: '+1 (555) 678-9012',
    email: 'sales@omnipower.com',
    address: '320 Solar Way, Phoenix, AZ 85001',
    website: 'https://omnipower.example.com',
    notes: 'UPS backup batteries, GaN chargers, power distribution units.',
    active: true,
    createdAt: new Date(),
  },
];

export const DEMO_SUPPLIERS: Supplier[] = RAW_SUPPLIERS.map((s) => ({
  ...s,
  updatedAt: s.createdAt,
})) as Supplier[];

const RAW_DEMO_PRODUCTS = [
  { id: 'prod-01', sku: 'KB-MECH-RGB', name: 'Apex Pro Mechanical Keyboard', categoryId: 'cat-acc', categoryName: 'Computer Accessories', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 48, sellingPrice: 89.99, currentStock: 45, minimumStock: 10, reorderLevel: 15, maximumStock: 150, barcode: '89345001', active: true, createdAt: new Date() },
  { id: 'prod-02', sku: 'MS-WLS-PRO', name: 'ErgoGrip Wireless Optical Mouse', categoryId: 'cat-acc', categoryName: 'Computer Accessories', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 18, sellingPrice: 39.99, currentStock: 68, minimumStock: 15, reorderLevel: 20, maximumStock: 200, barcode: '89345002', active: true, createdAt: new Date() },
  { id: 'prod-03', sku: 'WC-4K-STRM', name: 'UltraHD 4K Streaming Webcam', categoryId: 'cat-acc', categoryName: 'Computer Accessories', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'pcs', purchasePrice: 55, sellingPrice: 99.00, currentStock: 6, minimumStock: 8, reorderLevel: 12, maximumStock: 100, barcode: '89345003', active: true, createdAt: new Date() },
  { id: 'prod-04', sku: 'MP-XXL-DESK', name: 'DeskMat XXL Spill-Resistant', categoryId: 'cat-acc', categoryName: 'Computer Accessories', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 8, sellingPrice: 24.99, currentStock: 92, minimumStock: 20, reorderLevel: 30, maximumStock: 300, barcode: '89345004', active: true, createdAt: new Date() },
  { id: 'prod-05', sku: 'KB-MEM-SLIM', name: 'Slimline Wireless Quiet Keyboard', categoryId: 'cat-acc', categoryName: 'Computer Accessories', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 14, sellingPrice: 29.99, currentStock: 0, minimumStock: 10, reorderLevel: 15, maximumStock: 150, barcode: '89345005', active: true, createdAt: new Date() },
  { id: 'prod-06', sku: 'LP-DEV-16', name: 'Horizon Pro 16" Laptop (M3, 32GB)', categoryId: 'cat-comp', categoryName: 'Computers & Laptops', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'units', purchasePrice: 1450, sellingPrice: 1999.00, currentStock: 14, minimumStock: 5, reorderLevel: 8, maximumStock: 50, barcode: '89345006', active: true, createdAt: new Date() },
  { id: 'prod-07', sku: 'LP-AIR-13', name: 'Horizon Air 13" Ultralight', categoryId: 'cat-comp', categoryName: 'Computers & Laptops', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'units', purchasePrice: 820, sellingPrice: 1199.00, currentStock: 22, minimumStock: 6, reorderLevel: 10, maximumStock: 60, barcode: '89345007', active: true, createdAt: new Date() },
  { id: 'prod-08', sku: 'PC-MINI-PRO', name: 'CoreMini Desktop Workstation i7', categoryId: 'cat-comp', categoryName: 'Computers & Laptops', supplierId: 'sup-nexus', supplierName: 'Nexus Micro Supply', unit: 'units', purchasePrice: 520, sellingPrice: 749.00, currentStock: 3, minimumStock: 5, reorderLevel: 8, maximumStock: 40, barcode: '89345008', active: true, createdAt: new Date() },
  { id: 'prod-09', sku: 'MN-27-4K', name: 'UltraView 27" 4K IPS Monitor', categoryId: 'cat-disp', categoryName: 'Monitors & Displays', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'units', purchasePrice: 210, sellingPrice: 349.99, currentStock: 35, minimumStock: 8, reorderLevel: 12, maximumStock: 80, barcode: '89345009', active: true, createdAt: new Date() },
  { id: 'prod-10', sku: 'MN-34-CRV', name: 'Panorama 34" Ultrawide Curved', categoryId: 'cat-disp', categoryName: 'Monitors & Displays', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'units', purchasePrice: 380, sellingPrice: 579.00, currentStock: 11, minimumStock: 5, reorderLevel: 8, maximumStock: 40, barcode: '89345010', active: true, createdAt: new Date() },
  { id: 'prod-11', sku: 'MN-15-PORT', name: 'Vantage 15.6" Portable USB-C Display', categoryId: 'cat-disp', categoryName: 'Monitors & Displays', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'units', purchasePrice: 95, sellingPrice: 169.99, currentStock: 0, minimumStock: 5, reorderLevel: 10, maximumStock: 50, barcode: '89345011', active: true, createdAt: new Date() },
  { id: 'prod-12', sku: 'SSD-NVME-2TB', name: 'Velocity Pro 2TB NVMe PCIe Gen4', categoryId: 'cat-stor', categoryName: 'Storage & Memory', supplierId: 'sup-nexus', supplierName: 'Nexus Micro Supply', unit: 'pcs', purchasePrice: 82, sellingPrice: 149.99, currentStock: 54, minimumStock: 15, reorderLevel: 25, maximumStock: 200, barcode: '89345012', active: true, createdAt: new Date() },
  { id: 'prod-13', sku: 'SSD-NVME-1TB', name: 'Velocity Pro 1TB NVMe PCIe Gen4', categoryId: 'cat-stor', categoryName: 'Storage & Memory', supplierId: 'sup-nexus', supplierName: 'Nexus Micro Supply', unit: 'pcs', purchasePrice: 46, sellingPrice: 89.99, currentStock: 8, minimumStock: 15, reorderLevel: 25, maximumStock: 250, barcode: '89345013', active: true, createdAt: new Date() },
  { id: 'prod-14', sku: 'RAM-DDR5-32', name: 'HyperSync 32GB (2x16GB) DDR5 6000MHz', categoryId: 'cat-stor', categoryName: 'Storage & Memory', supplierId: 'sup-nexus', supplierName: 'Nexus Micro Supply', unit: 'kits', purchasePrice: 65, sellingPrice: 119.99, currentStock: 40, minimumStock: 12, reorderLevel: 20, maximumStock: 150, barcode: '89345014', active: true, createdAt: new Date() },
  { id: 'prod-15', sku: 'HDD-EXT-5TB', name: 'VaultSafe 5TB Rugged External HDD', categoryId: 'cat-stor', categoryName: 'Storage & Memory', supplierId: 'sup-nexus', supplierName: 'Nexus Micro Supply', unit: 'pcs', purchasePrice: 72, sellingPrice: 129.99, currentStock: 19, minimumStock: 8, reorderLevel: 15, maximumStock: 100, barcode: '89345015', active: true, createdAt: new Date() },
  { id: 'prod-16', sku: 'NET-RTR-WIFI6', name: 'AeroLink WiFi 6E Mesh Dual-Pack', categoryId: 'cat-net', categoryName: 'Networking Equipment', supplierId: 'sup-hyperlink', supplierName: 'Hyperlink Networks Corp', unit: 'sets', purchasePrice: 130, sellingPrice: 229.00, currentStock: 26, minimumStock: 8, reorderLevel: 12, maximumStock: 80, barcode: '89345016', active: true, createdAt: new Date() },
  { id: 'prod-17', sku: 'NET-SW-24POE', name: 'Gigabit 24-Port Managed PoE+ Switch', categoryId: 'cat-net', categoryName: 'Networking Equipment', supplierId: 'sup-hyperlink', supplierName: 'Hyperlink Networks Corp', unit: 'units', purchasePrice: 220, sellingPrice: 389.00, currentStock: 5, minimumStock: 6, reorderLevel: 10, maximumStock: 40, barcode: '89345017', active: true, createdAt: new Date() },
  { id: 'prod-18', sku: 'NET-CBL-CAT6', name: 'Shielded CAT6 Ethernet Cable 50ft', categoryId: 'cat-net', categoryName: 'Networking Equipment', supplierId: 'sup-hyperlink', supplierName: 'Hyperlink Networks Corp', unit: 'coils', purchasePrice: 9, sellingPrice: 22.50, currentStock: 120, minimumStock: 25, reorderLevel: 40, maximumStock: 400, barcode: '89345018', active: true, createdAt: new Date() },
  { id: 'prod-19', sku: 'NET-AP-WIFI7', name: 'Enterprise Ceiling AP WiFi 7', categoryId: 'cat-net', categoryName: 'Networking Equipment', supplierId: 'sup-hyperlink', supplierName: 'Hyperlink Networks Corp', unit: 'units', purchasePrice: 180, sellingPrice: 299.00, currentStock: 15, minimumStock: 5, reorderLevel: 8, maximumStock: 50, barcode: '89345019', active: true, createdAt: new Date() },
  { id: 'prod-20', sku: 'AUD-HDST-ANC', name: 'SoundGuard ANC Studio Headset', categoryId: 'cat-aud', categoryName: 'Audio & Headsets', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 65, sellingPrice: 129.99, currentStock: 32, minimumStock: 10, reorderLevel: 15, maximumStock: 120, barcode: '89345020', active: true, createdAt: new Date() },
  { id: 'prod-21', sku: 'AUD-MIC-USB', name: 'VoiceMaster Studio Cardioid USB Mic', categoryId: 'cat-aud', categoryName: 'Audio & Headsets', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 42, sellingPrice: 79.99, currentStock: 4, minimumStock: 8, reorderLevel: 12, maximumStock: 100, barcode: '89345021', active: true, createdAt: new Date() },
  { id: 'prod-22', sku: 'AUD-SPK-CONF', name: 'OmniVoice Conference Speakerphone', categoryId: 'cat-aud', categoryName: 'Audio & Headsets', supplierId: 'sup-progear', supplierName: 'ProGear Peripherals Ltd', unit: 'pcs', purchasePrice: 55, sellingPrice: 99.00, currentStock: 18, minimumStock: 6, reorderLevel: 10, maximumStock: 80, barcode: '89345022', active: true, createdAt: new Date() },
  { id: 'prod-23', sku: 'CBL-USBC-100W', name: 'Braided USB-C 100W PD Cable 2m', categoryId: 'cat-cabl', categoryName: 'Cables & Adapters', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'pcs', purchasePrice: 3.5, sellingPrice: 14.99, currentStock: 240, minimumStock: 40, reorderLevel: 60, maximumStock: 600, barcode: '89345023', active: true, createdAt: new Date() },
  { id: 'prod-24', sku: 'CBL-HDMI-21', name: 'Ultra High-Speed HDMI 2.1 Cable 3m', categoryId: 'cat-cabl', categoryName: 'Cables & Adapters', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'pcs', purchasePrice: 4.8, sellingPrice: 17.99, currentStock: 175, minimumStock: 30, reorderLevel: 50, maximumStock: 500, barcode: '89345024', active: true, createdAt: new Date() },
  { id: 'prod-25', sku: 'ADP-DOCK-11', name: 'Multiport 11-in-1 USB-C Hub Dock', categoryId: 'cat-cabl', categoryName: 'Cables & Adapters', supplierId: 'sup-techflow', supplierName: 'TechFlow Global Logistics', unit: 'pcs', purchasePrice: 28, sellingPrice: 59.99, currentStock: 7, minimumStock: 10, reorderLevel: 15, maximumStock: 120, barcode: '89345025', active: true, createdAt: new Date() },
  { id: 'prod-26', sku: 'FUR-CHR-ERGO', name: 'AeroSpine Mesh Ergonomic Office Chair', categoryId: 'cat-off', categoryName: 'Office Furniture', supplierId: 'sup-ergo', supplierName: 'ErgoComfort Workspaces', unit: 'chairs', purchasePrice: 180, sellingPrice: 349.00, currentStock: 16, minimumStock: 4, reorderLevel: 8, maximumStock: 40, barcode: '89345026', active: true, createdAt: new Date() },
  { id: 'prod-27', sku: 'FUR-DSK-DUAL', name: 'Apex Dual-Motor Electric Standing Desk', categoryId: 'cat-off', categoryName: 'Office Furniture', supplierId: 'sup-ergo', supplierName: 'ErgoComfort Workspaces', unit: 'desks', purchasePrice: 240, sellingPrice: 479.00, currentStock: 10, minimumStock: 4, reorderLevel: 6, maximumStock: 30, barcode: '89345027', active: true, createdAt: new Date() },
  { id: 'prod-28', sku: 'FUR-ARM-DUAL', name: 'Heavy-Duty Gas Spring Dual Monitor Arm', categoryId: 'cat-off', categoryName: 'Office Furniture', supplierId: 'sup-ergo', supplierName: 'ErgoComfort Workspaces', unit: 'pcs', purchasePrice: 34, sellingPrice: 79.99, currentStock: 28, minimumStock: 8, reorderLevel: 12, maximumStock: 100, barcode: '89345028', active: true, createdAt: new Date() },
  { id: 'prod-29', sku: 'PWR-UPS-1500', name: 'PowerShield 1500VA Battery Backup UPS', categoryId: 'cat-pwr', categoryName: 'Power & UPS', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'units', purchasePrice: 110, sellingPrice: 189.00, currentStock: 14, minimumStock: 5, reorderLevel: 8, maximumStock: 50, barcode: '89345029', active: true, createdAt: new Date() },
  { id: 'prod-30', sku: 'PWR-CHG-140W', name: 'GaN 140W 4-Port Fast Desktop Charger', categoryId: 'cat-pwr', categoryName: 'Power & UPS', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'pcs', purchasePrice: 29, sellingPrice: 69.99, currentStock: 52, minimumStock: 15, reorderLevel: 20, maximumStock: 150, barcode: '89345030', active: true, createdAt: new Date() },
  { id: 'prod-31', sku: 'PWR-SRG-12', name: 'Heavy Duty 12-Outlet Surge Protector', categoryId: 'cat-pwr', categoryName: 'Power & UPS', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'pcs', purchasePrice: 12, sellingPrice: 29.99, currentStock: 85, minimumStock: 20, reorderLevel: 30, maximumStock: 200, barcode: '89345031', active: true, createdAt: new Date() },
  { id: 'prod-32', sku: 'PWR-BNK-25K', name: 'OmniCharge 25,000mAh 100W Power Bank', categoryId: 'cat-pwr', categoryName: 'Power & UPS', supplierId: 'sup-omnipower', supplierName: 'OmniPower Technologies', unit: 'pcs', purchasePrice: 38, sellingPrice: 89.99, currentStock: 0, minimumStock: 10, reorderLevel: 15, maximumStock: 100, barcode: '89345032', active: true, createdAt: new Date() },
];

export const DEMO_PRODUCTS: Product[] = RAW_DEMO_PRODUCTS.map((p) => ({
  ...p,
  updatedAt: p.createdAt,
})) as Product[];

export const DEMO_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'txn-01',
    transactionId: 'TXN-2026-001',
    type: 'STOCK_IN',
    productId: 'prod-01',
    productName: 'Apex Pro Mechanical Keyboard',
    sku: 'KB-MECH-RGB',
    quantity: 20,
    previousStock: 25,
    newStock: 45,
    unitCost: 48,
    totalValue: 960,
    referenceNumber: 'PO-9821',
    supplierId: 'sup-progear',
    createdBy: 'Victoria Sterling',
    createdAt: new Date(),
  },
  {
    id: 'txn-02',
    transactionId: 'TXN-2026-002',
    type: 'STOCK_OUT',
    productId: 'prod-06',
    productName: 'Horizon Pro 16" Laptop (M3, 32GB)',
    sku: 'LP-DEV-16',
    quantity: -2,
    previousStock: 16,
    newStock: 14,
    unitCost: 1450,
    totalValue: 3998,
    referenceNumber: 'SO-1044',
    customerName: 'Acme Corp Tech Team',
    createdBy: 'Alexander Vance',
    createdAt: new Date(),
  },
  {
    id: 'txn-03',
    transactionId: 'TXN-2026-003',
    type: 'STOCK_IN',
    productId: 'prod-23',
    productName: 'Braided USB-C 100W PD Cable 2m',
    sku: 'CBL-USBC-100W',
    quantity: 100,
    previousStock: 140,
    newStock: 240,
    unitCost: 3.5,
    totalValue: 350,
    referenceNumber: 'PO-9825',
    supplierId: 'sup-omnipower',
    createdBy: 'Jordan Lee',
    createdAt: new Date(),
  },
  {
    id: 'txn-04',
    transactionId: 'TXN-2026-004',
    type: 'ADJUSTMENT',
    productId: 'prod-08',
    productName: 'CoreMini Desktop Workstation i7',
    sku: 'PC-MINI-PRO',
    quantity: -1,
    previousStock: 4,
    newStock: 3,
    unitCost: 520,
    totalValue: 520,
    reason: 'Damaged in transit / unrepairable chassis',
    createdBy: 'Alexander Vance',
    createdAt: new Date(),
  },
  {
    id: 'txn-05',
    transactionId: 'TXN-2026-005',
    type: 'STOCK_OUT',
    productId: 'prod-12',
    productName: 'Velocity Pro 2TB NVMe PCIe Gen4',
    sku: 'SSD-NVME-2TB',
    quantity: -5,
    previousStock: 59,
    newStock: 54,
    unitCost: 82,
    totalValue: 749.95,
    referenceNumber: 'SO-1048',
    customerName: 'Nexis Media Agency',
    createdBy: 'Jordan Lee',
    createdAt: new Date(),
  },
];

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: 'UltraHD 4K Streaming Webcam is down to 6 units (reorder level: 12).',
    productId: 'prod-03',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'notif-02',
    type: 'OUT_OF_STOCK',
    title: 'Stock Depleted',
    message: 'Slimline Wireless Quiet Keyboard is currently completely out of stock.',
    productId: 'prod-05',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'notif-03',
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: 'VoiceMaster Studio Cardioid USB Mic has only 4 units remaining.',
    productId: 'prod-21',
    read: true,
    createdAt: new Date(),
  },
  {
    id: 'notif-04',
    type: 'STOCK_IN',
    title: 'Shipment Received',
    message: 'Successfully checked in 100 units of Braided USB-C 100W PD Cable.',
    productId: 'prod-23',
    read: true,
    createdAt: new Date(),
  },
];

export const DEMO_USERS: AppUser[] = [
  {
    uid: 'user-superadmin',
    displayName: 'Victoria Sterling (Super Admin)',
    email: 'admin@inventorypro.com',
    role: 'SUPER_ADMIN',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uid: 'user-admin',
    displayName: 'Alexander Vance (Operations Manager)',
    email: 'alex.vance@inventorypro.com',
    role: 'ADMIN',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uid: 'user-staff',
    displayName: 'Jordan Lee (Warehouse Associate)',
    email: 'jordan.lee@inventorypro.com',
    role: 'STAFF',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-01',
    userId: 'user-superadmin',
    userName: 'Victoria Sterling',
    userEmail: 'admin@inventorypro.com',
    action: 'CREATE_PRODUCT',
    module: 'PRODUCTS',
    entityId: 'prod-06',
    description: 'Added new product Horizon Pro 16" Laptop (SKU: LP-DEV-16)',
    createdAt: new Date(),
  },
  {
    id: 'audit-02',
    userId: 'user-admin',
    userName: 'Alexander Vance',
    userEmail: 'alex.vance@inventorypro.com',
    action: 'STOCK_OUT',
    module: 'INVENTORY',
    entityId: 'prod-06',
    description: 'Processed outbound dispatch of 2 units to Acme Corp Tech Team',
    createdAt: new Date(),
  },
  {
    id: 'audit-03',
    userId: 'user-staff',
    userName: 'Jordan Lee',
    userEmail: 'jordan.lee@inventorypro.com',
    action: 'STOCK_IN',
    module: 'INVENTORY',
    entityId: 'prod-23',
    description: 'Received shipment PO-9825: 100 units Braided USB-C Cable',
    createdAt: new Date(),
  },
];

export const FIRESTORE_RULES_SOURCE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isBootstrappedAdmin() {
      return isAuthenticated() && (
        request.auth.token.email == 'yared.abegaz@gmail.com' ||
        (request.auth.token.email != null && request.auth.token.email.matches('.*@inventorypro\\\\.com'))
      );
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function getUserRole() {
      return isBootstrappedAdmin() ? 'SUPER_ADMIN' : (
        isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.uid))
          ? getUserData().role
          : 'STAFF'
      );
    }

    function isSuperAdmin() {
      return isBootstrappedAdmin() || getUserRole() == 'SUPER_ADMIN';
    }

    function isAdmin() {
      let role = getUserRole();
      return isBootstrappedAdmin() || role == 'ADMIN' || role == 'SUPER_ADMIN';
    }

    function isStaff() {
      let role = getUserRole();
      return isBootstrappedAdmin() || role == 'STAFF' || role == 'ADMIN' || role == 'SUPER_ADMIN';
    }

    // Users Collection
    match /users/{userId} {
      allow read: if true;
      allow create, update: if isAuthenticated() || true;
      allow delete: if isSuperAdmin();
    }

    // Products Collection
    match /products/{productId} {
      allow read: if true;
      allow create, update: if isAuthenticated() || true;
      allow delete: if isSuperAdmin();
    }

    // Categories Collection
    match /categories/{categoryId} {
      allow read: if true;
      allow create, update: if isAuthenticated() || true;
      allow delete: if isSuperAdmin();
    }

    // Suppliers Collection
    match /suppliers/{supplierId} {
      allow read: if true;
      allow create, update: if isAuthenticated() || true;
      allow delete: if isSuperAdmin();
    }

    // Inventory Transactions (Immutable history)
    match /inventoryTransactions/{transactionId} {
      allow read: if true;
      allow create: if isAuthenticated() || true;
      allow update, delete: if false; // Immutable
    }

    // Stock In
    match /stockIn/{stockInId} {
      allow read: if true;
      allow create: if isAuthenticated() || true;
      allow update, delete: if false;
    }

    // Stock Out
    match /stockOut/{stockOutId} {
      allow read: if true;
      allow create: if isAuthenticated() || true;
      allow update, delete: if false;
    }

    // Stock Adjustments
    match /stockAdjustments/{adjustmentId} {
      allow read: if true;
      allow create: if isAuthenticated() || true;
      allow update, delete: if false;
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read: if true;
      allow create, update: if isAuthenticated() || true;
      allow delete: if isAdmin();
    }

    // Audit Logs
    match /auditLogs/{logId} {
      allow read: if true;
      allow create: if isAuthenticated() || true;
      allow update, delete: if false; // Immutable audit trail
    }

    // Settings
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAuthenticated() || true;
    }
  }
}
`;
