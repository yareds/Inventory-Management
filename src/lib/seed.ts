import {
  collection,
  doc,
  writeBatch,
  getDocs,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(query(collection(db, 'products'), limit(1)));
    return snap.empty;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      // Handled gracefully: Firestore permissions not yet active in Firebase console
      return false;
    }
    console.warn('Unable to verify database status:', err?.message || err);
    return false;
  }
}

export async function seedDatabase(currentUserEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const batch1 = writeBatch(db);

    // 1. Categories (8+ categories)
    const categoryData = [
      { id: 'cat-comp', name: 'Computers & Laptops', description: 'Desktops, laptops, and mini PCs', active: true },
      { id: 'cat-acc', name: 'Computer Accessories', description: 'Mice, keyboards, webcams, and mousepads', active: true },
      { id: 'cat-disp', name: 'Monitors & Displays', description: '4K, curved, gaming, and portable monitors', active: true },
      { id: 'cat-net', name: 'Networking Equipment', description: 'Routers, switches, access points, and cables', active: true },
      { id: 'cat-stor', name: 'Storage & Memory', description: 'SSDs, HDDs, RAM, and flash drives', active: true },
      { id: 'cat-aud', name: 'Audio & Headsets', description: 'Noise-canceling headsets, speakers, mics', active: true },
      { id: 'cat-cabl', name: 'Cables & Adapters', description: 'HDMI, USB-C, DisplayPort, and power adapters', active: true },
      { id: 'cat-off', name: 'Office Furniture', description: 'Ergonomic chairs, standing desks, monitor arms', active: true },
      { id: 'cat-pwr', name: 'Power & UPS', description: 'Surge protectors, UPS batteries, chargers', active: true },
    ];

    for (const cat of categoryData) {
      const ref = doc(db, 'categories', cat.id);
      batch1.set(ref, {
        name: cat.name,
        description: cat.description,
        active: cat.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'System Seed',
      });
    }

    // 2. Suppliers (5+ suppliers)
    const supplierData = [
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
      },
    ];

    for (const sup of supplierData) {
      const ref = doc(db, 'suppliers', sup.id);
      batch1.set(ref, {
        ...sup,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'System Seed',
      });
    }

    // 3. System Users & Roles
    const usersData = [
      {
        uid: 'user-superadmin',
        displayName: 'Victoria Sterling (Super Admin)',
        email: currentUserEmail || 'admin@inventorypro.com',
        role: 'SUPER_ADMIN',
        active: true,
      },
      {
        uid: 'user-admin',
        displayName: 'Alexander Vance (Manager)',
        email: 'alex.vance@inventorypro.com',
        role: 'ADMIN',
        active: true,
      },
      {
        uid: 'user-staff',
        displayName: 'Jordan Lee (Warehouse Staff)',
        email: 'jordan.lee@inventorypro.com',
        role: 'STAFF',
        active: true,
      },
    ];

    for (const u of usersData) {
      const ref = doc(db, 'users', u.uid);
      batch1.set(ref, {
        ...u,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 4. Default Settings (settings/general)
    const settingsRef = doc(db, 'settings', 'general');
    batch1.set(settingsRef, {
      businessName: 'Inventory Management',
      businessLogo: '',
      currency: 'USD',
      currencySymbol: '$',
      dateFormat: 'MM/DD/YYYY',
      defaultReorderLevel: 10,
      allowNegativeInventory: false,
      lowStockAlertsEnabled: true,
      emailAlerts: true,
      updatedAt: serverTimestamp(),
      updatedBy: 'System Seed',
    });

    await batch1.commit();

    // 5. Products (32+ products including In Stock, Low Stock, and Out of Stock)
    const batch2 = writeBatch(db);

    const productDefinitions = [
      // Computer Accessories
      { id: 'prod-01', sku: 'KB-MECH-RGB', name: 'Apex Pro Mechanical Keyboard', catId: 'cat-acc', catName: 'Computer Accessories', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 48, sell: 89.99, stock: 45, min: 10, reorder: 15, max: 150, barcode: '89345001' },
      { id: 'prod-02', sku: 'MS-WLS-PRO', name: 'ErgoGrip Wireless Optical Mouse', catId: 'cat-acc', catName: 'Computer Accessories', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 18, sell: 39.99, stock: 68, min: 15, reorder: 20, max: 200, barcode: '89345002' },
      { id: 'prod-03', sku: 'WC-4K-STRM', name: 'UltraHD 4K Streaming Webcam', catId: 'cat-acc', catName: 'Computer Accessories', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'pcs', buy: 55, sell: 99.00, stock: 6, min: 8, reorder: 12, max: 100, barcode: '89345003' }, // LOW STOCK
      { id: 'prod-04', sku: 'MP-XXL-DESK', name: 'DeskMat XXL Spill-Resistant', catId: 'cat-acc', catName: 'Computer Accessories', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 8, sell: 24.99, stock: 92, min: 20, reorder: 30, max: 300, barcode: '89345004' },
      { id: 'prod-05', sku: 'KB-MEM-SLIM', name: 'Slimline Wireless Quiet Keyboard', catId: 'cat-acc', catName: 'Computer Accessories', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 14, sell: 29.99, stock: 0, min: 10, reorder: 15, max: 150, barcode: '89345005' }, // OUT OF STOCK

      // Computers & Laptops
      { id: 'prod-06', sku: 'LP-DEV-16', name: 'Horizon Pro 16" Laptop (M3, 32GB)', catId: 'cat-comp', catName: 'Computers & Laptops', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'units', buy: 1450, sell: 1999.00, stock: 14, min: 5, reorder: 8, max: 50, barcode: '89345006' },
      { id: 'prod-07', sku: 'LP-AIR-13', name: 'Horizon Air 13" Ultralight', catId: 'cat-comp', catName: 'Computers & Laptops', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'units', buy: 820, sell: 1199.00, stock: 22, min: 6, reorder: 10, max: 60, barcode: '89345007' },
      { id: 'prod-08', sku: 'PC-MINI-PRO', name: 'CoreMini Desktop Workstation i7', catId: 'cat-comp', catName: 'Computers & Laptops', supId: 'sup-nexus', supName: 'Nexus Micro Supply', unit: 'units', buy: 520, sell: 749.00, stock: 3, min: 5, reorder: 8, max: 40, barcode: '89345008' }, // LOW STOCK

      // Monitors & Displays
      { id: 'prod-09', sku: 'MN-27-4K', name: 'UltraView 27" 4K IPS Monitor', catId: 'cat-disp', catName: 'Monitors & Displays', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'units', buy: 210, sell: 349.99, stock: 35, min: 8, reorder: 12, max: 80, barcode: '89345009' },
      { id: 'prod-10', sku: 'MN-34-CRV', name: 'Panorama 34" Ultrawide Curved', catId: 'cat-disp', catName: 'Monitors & Displays', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'units', buy: 380, sell: 579.00, stock: 11, min: 5, reorder: 8, max: 40, barcode: '89345010' },
      { id: 'prod-11', sku: 'MN-15-PORT', name: 'Vantage 15.6" Portable USB-C Display', catId: 'cat-disp', catName: 'Monitors & Displays', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'units', buy: 95, sell: 169.99, stock: 0, min: 5, reorder: 10, max: 50, barcode: '89345011' }, // OUT OF STOCK

      // Storage & Memory
      { id: 'prod-12', sku: 'SSD-NVME-2TB', name: 'Velocity Pro 2TB NVMe PCIe Gen4', catId: 'cat-stor', catName: 'Storage & Memory', supId: 'sup-nexus', supName: 'Nexus Micro Supply', unit: 'pcs', buy: 82, sell: 149.99, stock: 54, min: 15, reorder: 25, max: 200, barcode: '89345012' },
      { id: 'prod-13', sku: 'SSD-NVME-1TB', name: 'Velocity Pro 1TB NVMe PCIe Gen4', catId: 'cat-stor', catName: 'Storage & Memory', supId: 'sup-nexus', supName: 'Nexus Micro Supply', unit: 'pcs', buy: 46, sell: 89.99, stock: 8, min: 15, reorder: 25, max: 250, barcode: '89345013' }, // LOW STOCK
      { id: 'prod-14', sku: 'RAM-DDR5-32', name: 'HyperSync 32GB (2x16GB) DDR5 6000MHz', catId: 'cat-stor', catName: 'Storage & Memory', supId: 'sup-nexus', supName: 'Nexus Micro Supply', unit: 'kits', buy: 65, sell: 119.99, stock: 40, min: 12, reorder: 20, max: 150, barcode: '89345014' },
      { id: 'prod-15', sku: 'HDD-EXT-5TB', name: 'VaultSafe 5TB Rugged External HDD', catId: 'cat-stor', catName: 'Storage & Memory', supId: 'sup-nexus', supName: 'Nexus Micro Supply', unit: 'pcs', buy: 72, sell: 129.99, stock: 19, min: 8, reorder: 15, max: 100, barcode: '89345015' },

      // Networking Equipment
      { id: 'prod-16', sku: 'NET-RTR-WIFI6', name: 'AeroLink WiFi 6E Mesh Dual-Pack', catId: 'cat-net', catName: 'Networking Equipment', supId: 'sup-hyperlink', supName: 'Hyperlink Networks Corp', unit: 'sets', buy: 130, sell: 229.00, stock: 26, min: 8, reorder: 12, max: 80, barcode: '89345016' },
      { id: 'prod-17', sku: 'NET-SW-24POE', name: 'Gigabit 24-Port Managed PoE+ Switch', catId: 'cat-net', catName: 'Networking Equipment', supId: 'sup-hyperlink', supName: 'Hyperlink Networks Corp', unit: 'units', buy: 220, sell: 389.00, stock: 5, min: 6, reorder: 10, max: 40, barcode: '89345017' }, // LOW STOCK
      { id: 'prod-18', sku: 'NET-CBL-CAT6', name: 'Shielded CAT6 Ethernet Cable 50ft', catId: 'cat-net', catName: 'Networking Equipment', supId: 'sup-hyperlink', supName: 'Hyperlink Networks Corp', unit: 'coils', buy: 9, sell: 22.50, stock: 120, min: 25, reorder: 40, max: 400, barcode: '89345018' },
      { id: 'prod-19', sku: 'NET-AP-WIFI7', name: 'Enterprise Ceiling AP WiFi 7', catId: 'cat-net', catName: 'Networking Equipment', supId: 'sup-hyperlink', supName: 'Hyperlink Networks Corp', unit: 'units', buy: 180, sell: 299.00, stock: 15, min: 5, reorder: 8, max: 50, barcode: '89345019' },

      // Audio & Headsets
      { id: 'prod-20', sku: 'AUD-HDST-ANC', name: 'SoundGuard ANC Studio Headset', catId: 'cat-aud', catName: 'Audio & Headsets', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 65, sell: 129.99, stock: 32, min: 10, reorder: 15, max: 120, barcode: '89345020' },
      { id: 'prod-21', sku: 'AUD-MIC-USB', name: 'VoiceMaster Studio Cardioid USB Mic', catId: 'cat-aud', catName: 'Audio & Headsets', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 42, sell: 79.99, stock: 4, min: 8, reorder: 12, max: 100, barcode: '89345021' }, // LOW STOCK
      { id: 'prod-22', sku: 'AUD-SPK-CONF', name: 'OmniVoice Conference Speakerphone', catId: 'cat-aud', catName: 'Audio & Headsets', supId: 'sup-progear', supName: 'ProGear Peripherals Ltd', unit: 'pcs', buy: 55, sell: 99.00, stock: 18, min: 6, reorder: 10, max: 80, barcode: '89345022' },

      // Cables & Adapters
      { id: 'prod-23', sku: 'CBL-USBC-100W', name: 'Braided USB-C 100W PD Cable 2m', catId: 'cat-cabl', catName: 'Cables & Adapters', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'pcs', buy: 3.5, sell: 14.99, stock: 240, min: 40, reorder: 60, max: 600, barcode: '89345023' },
      { id: 'prod-24', sku: 'CBL-HDMI-21', name: 'Ultra High-Speed HDMI 2.1 Cable 3m', catId: 'cat-cabl', catName: 'Cables & Adapters', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'pcs', buy: 4.8, sell: 17.99, stock: 175, min: 30, reorder: 50, max: 500, barcode: '89345024' },
      { id: 'prod-25', sku: 'ADP-DOCK-11', name: 'Multiport 11-in-1 USB-C Hub Dock', catId: 'cat-cabl', catName: 'Cables & Adapters', supId: 'sup-techflow', supName: 'TechFlow Global Logistics', unit: 'pcs', buy: 28, sell: 59.99, stock: 7, min: 10, reorder: 15, max: 120, barcode: '89345025' }, // LOW STOCK

      // Office Furniture
      { id: 'prod-26', sku: 'FUR-CHR-ERGO', name: 'AeroSpine Mesh Ergonomic Office Chair', catId: 'cat-off', catName: 'Office Furniture', supId: 'sup-ergo', supName: 'ErgoComfort Workspaces', unit: 'chairs', buy: 180, sell: 349.00, stock: 16, min: 4, reorder: 8, max: 40, barcode: '89345026' },
      { id: 'prod-27', sku: 'FUR-DSK-DUAL', name: 'Apex Dual-Motor Electric Standing Desk', catId: 'cat-off', catName: 'Office Furniture', supId: 'sup-ergo', supName: 'ErgoComfort Workspaces', unit: 'desks', buy: 240, sell: 479.00, stock: 10, min: 4, reorder: 6, max: 30, barcode: '89345027' },
      { id: 'prod-28', sku: 'FUR-ARM-DUAL', name: 'Heavy-Duty Gas Spring Dual Monitor Arm', catId: 'cat-off', catName: 'Office Furniture', supId: 'sup-ergo', supName: 'ErgoComfort Workspaces', unit: 'pcs', buy: 34, sell: 79.99, stock: 28, min: 8, reorder: 12, max: 100, barcode: '89345028' },

      // Power & UPS
      { id: 'prod-29', sku: 'PWR-UPS-1500', name: 'PowerShield 1500VA Battery Backup UPS', catId: 'cat-pwr', catName: 'Power & UPS', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'units', buy: 110, sell: 189.00, stock: 14, min: 5, reorder: 8, max: 50, barcode: '89345029' },
      { id: 'prod-30', sku: 'PWR-CHG-140W', name: 'GaN 140W 4-Port Fast Desktop Charger', catId: 'cat-pwr', catName: 'Power & UPS', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'pcs', buy: 29, sell: 69.99, stock: 52, min: 15, reorder: 20, max: 150, barcode: '89345030' },
      { id: 'prod-31', sku: 'PWR-SRG-12', name: 'Heavy Duty 12-Outlet Surge Protector', catId: 'cat-pwr', catName: 'Power & UPS', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'pcs', buy: 12, sell: 29.99, stock: 85, min: 20, reorder: 30, max: 200, barcode: '89345031' },
      { id: 'prod-32', sku: 'PWR-BNK-25K', name: 'OmniCharge 25,000mAh 100W Power Bank', catId: 'cat-pwr', catName: 'Power & UPS', supId: 'sup-omnipower', supName: 'OmniPower Technologies', unit: 'pcs', buy: 38, sell: 89.99, stock: 0, min: 10, reorder: 15, max: 100, barcode: '89345032' }, // OUT OF STOCK
    ];

    for (const p of productDefinitions) {
      const pRef = doc(db, 'products', p.id);
      batch2.set(pRef, {
        sku: p.sku,
        name: p.name,
        categoryId: p.catId,
        categoryName: p.catName,
        supplierId: p.supId,
        supplierName: p.supName,
        unit: p.unit,
        purchasePrice: p.buy,
        sellingPrice: p.sell,
        currentStock: p.stock,
        minimumStock: p.min,
        reorderLevel: p.reorder,
        maximumStock: p.max,
        barcode: p.barcode,
        imageUrl: '',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'System Seed',
      });
    }

    await batch2.commit();

    // 6. Recent Stock Transactions & History (Batch 3)
    const batch3 = writeBatch(db);

    // Initial stock in record
    const stockInRef = doc(collection(db, 'stockIn'));
    batch3.set(stockInRef, {
      referenceNumber: 'REC-2026-INIT',
      supplierId: 'sup-techflow',
      supplierName: 'TechFlow Global Logistics',
      date: '2026-09-01',
      totalCost: 14850,
      notes: 'Quarterly warehouse bulk replenishment',
      createdBy: 'Victoria Sterling',
      createdAt: serverTimestamp(),
      items: [
        { productId: 'prod-01', productName: 'Apex Pro Mechanical Keyboard', sku: 'KB-MECH-RGB', quantity: 50, unitCost: 48, totalCost: 2400 },
        { productId: 'prod-06', productName: 'Horizon Pro 16" Laptop', sku: 'LP-DEV-16', quantity: 15, unitCost: 1450, totalCost: 21750 },
      ],
    });

    // Stock Out record
    const stockOutRef = doc(collection(db, 'stockOut'));
    batch3.set(stockOutRef, {
      referenceNumber: 'ISS-2026-0902',
      customerName: 'Acme Software Solutions',
      date: '2026-09-02',
      notes: 'Engineering workstation deployment',
      createdBy: 'Alexander Vance',
      createdAt: serverTimestamp(),
      items: [
        { productId: 'prod-01', productName: 'Apex Pro Mechanical Keyboard', sku: 'KB-MECH-RGB', quantity: 5, unitPrice: 89.99, totalValue: 449.95 },
        { productId: 'prod-06', productName: 'Horizon Pro 16" Laptop', sku: 'LP-DEV-16', quantity: 1, unitPrice: 1999.00, totalValue: 1999.00 },
      ],
    });

    // Stock Adjustment record
    const adjRef = doc(collection(db, 'stockAdjustments'));
    batch3.set(adjRef, {
      productId: 'prod-03',
      productName: 'UltraHD 4K Streaming Webcam',
      sku: 'WC-4K-STRM',
      systemQuantity: 8,
      actualQuantity: 6,
      difference: -2,
      reason: 'Physical count discrepancy / damaged packaging',
      notes: 'Found 2 damaged items during cycle count',
      createdBy: 'Alexander Vance',
      createdAt: serverTimestamp(),
    });

    // Transactions log
    const txns = [
      {
        transactionId: 'TXN-001',
        type: 'STOCK_IN',
        productId: 'prod-01',
        productName: 'Apex Pro Mechanical Keyboard',
        sku: 'KB-MECH-RGB',
        quantity: 50,
        previousStock: 0,
        newStock: 50,
        unitCost: 48,
        totalValue: 2400,
        referenceNumber: 'REC-2026-INIT',
        createdBy: 'Victoria Sterling',
      },
      {
        transactionId: 'TXN-002',
        type: 'STOCK_OUT',
        productId: 'prod-01',
        productName: 'Apex Pro Mechanical Keyboard',
        sku: 'KB-MECH-RGB',
        quantity: -5,
        previousStock: 50,
        newStock: 45,
        unitCost: 48,
        totalValue: 449.95,
        referenceNumber: 'ISS-2026-0902',
        customerName: 'Acme Software Solutions',
        createdBy: 'Alexander Vance',
      },
      {
        transactionId: 'TXN-003',
        type: 'ADJUSTMENT',
        productId: 'prod-03',
        productName: 'UltraHD 4K Streaming Webcam',
        sku: 'WC-4K-STRM',
        quantity: -2,
        previousStock: 8,
        newStock: 6,
        unitCost: 55,
        totalValue: 110,
        reason: 'Physical count discrepancy / damaged packaging',
        createdBy: 'Alexander Vance',
      },
    ];

    for (const t of txns) {
      const tRef = doc(collection(db, 'inventoryTransactions'));
      batch3.set(tRef, {
        ...t,
        createdAt: serverTimestamp(),
      });
    }

    // Low stock notifications
    const notif1 = doc(collection(db, 'notifications'));
    batch3.set(notif1, {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert: UltraHD 4K Streaming Webcam',
      message: 'UltraHD 4K Streaming Webcam is low in stock. Only 6 units remain. Reorder level is 12.',
      productId: 'prod-03',
      read: false,
      createdAt: serverTimestamp(),
    });

    const notif2 = doc(collection(db, 'notifications'));
    batch3.set(notif2, {
      type: 'OUT_OF_STOCK',
      title: 'Out of Stock: Slimline Wireless Quiet Keyboard',
      message: 'Slimline Wireless Quiet Keyboard is completely out of stock (0 units). Reorder level is 15.',
      productId: 'prod-05',
      read: false,
      createdAt: serverTimestamp(),
    });

    // Audit logs
    const audit1 = doc(collection(db, 'auditLogs'));
    batch3.set(audit1, {
      userId: 'user-superadmin',
      userName: 'Victoria Sterling',
      action: 'SYSTEM_SEEDED',
      module: 'SYSTEM',
      description: 'Initialized demo dataset with 32 products, 9 categories, and 6 suppliers.',
      createdAt: serverTimestamp(),
    });

    await batch3.commit();

    return {
      success: true,
      message: 'Seeded 32 products, 9 categories, 6 suppliers, transactions, and alerts successfully!',
    };
  } catch (error: any) {
    console.error('Seed error:', error);
    return {
      success: false,
      message: error.message || 'Failed to seed database.',
    };
  }
}
