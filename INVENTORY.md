# Banks Fresh Farms — Inventory Management Schema

**Status:** API-Ready Design Document  
**Products in Scope:** Pasture-Raised Eggs · Grass Fed Angus Beef · BFF Signature Seasonings  
**Purpose:** Define the full data schema and business rules governing inventory tracking. Implement against this document when backend APIs are connected.

---

## Design Principles

- **Immutable ledger** — Never edit or delete transaction rows. Every physical movement is an insert. Quantities are always derived from the ledger, never stored directly.
- **No negative quantities** — Database constraints enforce `QuantityAvailable >= 0` at all times. An attempted sale that would go negative must be rejected at the API layer before the transaction is written.
- **Referential integrity** — All foreign keys are enforced. No orphan records (e.g., a stock entry for a product that no longer exists in the catalog).
- **Reserved vs. available** — `QuantityReserved` is the quantity locked to pending orders but not yet shipped. The true available-to-promise figure is always `QuantityAvailable − QuantityReserved`.

---

## 1. Product Catalog

Stores static, rarely-changing information about each sellable item.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `ProductID` | UUID | Primary Key | Auto-generated |
| `SKU` | VARCHAR(50) | Unique, Not Null | See SKU reference below |
| `Name` | VARCHAR(100) | Not Null | Display name on site/orders |
| `Description` | TEXT | — | Full product description |
| `CategoryID` | UUID | Foreign Key → Categories | Eggs / Beef / Seasonings |
| `SupplierID` | UUID | Foreign Key → Suppliers | BFF Farm (self) or external |
| `StandardCost` | DECIMAL(10,2) | >= 0 | Cost to produce/acquire |
| `SellingPrice` | DECIMAL(10,2) | >= 0 | Current retail price |
| `Unit` | VARCHAR(20) | Not Null | `dozen`, `lb`, `oz jar` |
| `Weight_oz` | DECIMAL(8,2) | >= 0 | Shipping weight per unit |
| `IsActive` | BOOLEAN | Default TRUE | Soft-delete flag |

### BFF Product Catalog — Seed Data

| ProductID | SKU | Name | Category | Cost | Price | Unit |
|---|---|---|---|---|---|---|
| `prod-001` | `BFF-EGG-DOZ` | Pasture-Raised Eggs | Eggs | — | $5.00 | dozen |
| `prod-002` | `BFF-BEEF-GRD` | Ground Beef | Beef | — | $10.99 | lb |
| `prod-003` | `BFF-BEEF-CHK` | Chuck Roast | Beef | — | $12.99 | lb |
| `prod-004` | `BFF-BEEF-SHR` | Short Ribs | Beef | — | $13.99 | lb |
| `prod-005` | `BFF-BEEF-RIB` | Ribeye | Beef | — | $22.99 | lb |
| `prod-006` | `BFF-BEEF-TBN` | T-Bone | Beef | — | $22.99 | lb |
| `prod-007` | `BFF-BEEF-OXT` | Oxtail | Beef | $8.59 | $24.99 | lb |
| `prod-008` | `BFF-SEAS-001` | BFF Signature Blend No. 1 | Seasonings | — | TBD | oz jar |
| `prod-009` | `BFF-SEAS-002` | BFF Signature Blend No. 2 | Seasonings | — | TBD | oz jar |
| `prod-010` | `BFF-SEAS-003` | BFF Signature Blend No. 3 | Seasonings | — | TBD | oz jar |
| `prod-011` | `BFF-SEAS-004` | BFF Signature Blend No. 4 | Seasonings | — | TBD | oz jar |

> `StandardCost` fields to be filled once production cost tracking is established.  
> **BFF-BEEF-OXT cost reference:** $8.59/lb — Costco (Kirkland Signature, McDonough GA, Jun 2026). Update when sourcing changes.

### SKU Format Convention

```
BFF - [CATEGORY] - [VARIANT]

Categories:  EGG  / BEEF / SEAS
Variants:    3-letter abbreviation of cut or blend number
Examples:    BFF-BEEF-RIB  |  BFF-EGG-DOZ  |  BFF-SEAS-001
```

---

## 2. Categories

| CategoryID | Name | Description |
|---|---|---|
| `cat-001` | Eggs | Pasture-raised poultry eggs |
| `cat-002` | Beef | Grass-fed Black Angus cuts |
| `cat-003` | Seasonings | BFF hand-crafted spice blends |

---

## 3. Suppliers

| SupplierID | Name | Type | Contact |
|---|---|---|---|
| `sup-001` | Banks Fresh Farms | Self (Farm) | banksllc2023@gmail.com |
| `sup-002` | External Processor | Third-party | TBD — beef processing |
| `sup-003` | Spice Supplier | Third-party | TBD — seasoning ingredients |

---

## 4. Location & Warehousing

Tracks where inventory physically lives. One product can exist across multiple locations (e.g., cold storage + farm stand).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `LocationID` | UUID | Primary Key | Auto-generated |
| `WarehouseName` | VARCHAR(100) | Not Null | Facility name |
| `Aisle` | VARCHAR(20) | Nullable | Shelf / rack / section |
| `Rack` | VARCHAR(20) | Nullable | — |
| `Bin` | VARCHAR(20) | Nullable | — |
| `LocationType` | ENUM | Not Null | See types below |
| `TemperatureZone` | ENUM | Nullable | `Ambient`, `Refrigerated`, `Frozen` |
| `IsActive` | BOOLEAN | Default TRUE | — |

### Location Types
| Value | Usage |
|---|---|
| `Storage` | Primary inventory hold |
| `FarmStand` | On-farm pickup point |
| `InTransit` | Customer-bound shipment |
| `Damaged` | Unsellable / quarantine |
| `Returned` | Customer returns pending inspection |

### BFF Location Seed Data

| LocationID | Name | Type | Zone |
|---|---|---|---|
| `loc-001` | BFF Farm — Main Cold Storage | Storage | Refrigerated |
| `loc-002` | BFF Farm — Freezer | Storage | Frozen |
| `loc-003` | BFF Farm — Dry Storage | Storage | Ambient |
| `loc-004` | BFF Farm Stand — Pickup Counter | FarmStand | Ambient |
| `loc-005` | Atlanta Pickup Point | FarmStand | Ambient |
| `loc-006` | Church Drop-off — Savannah GA | FarmStand | Ambient |
| `loc-007` | In Transit — Customer Delivery | InTransit | Ambient |

---

## 5. Inventory / Stock Levels

The central state table. **Do not write to this table directly in application code.** All changes flow through the Transaction Ledger (Section 6); this table is updated by a trigger or recalculated view.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `StockID` | UUID | Primary Key | Auto-generated |
| `ProductID` | UUID | Foreign Key → Products | — |
| `LocationID` | UUID | Foreign Key → Locations | — |
| `QuantityAvailable` | DECIMAL(10,2) | >= 0, Not Null | Physical units on hand |
| `QuantityReserved` | DECIMAL(10,2) | >= 0, Default 0 | Allocated to pending orders |
| `QuantityInTransit` | DECIMAL(10,2) | >= 0, Default 0 | En route from supplier |
| `ReorderPoint` | DECIMAL(10,2) | >= 0 | Trigger threshold for new order |
| `MinimumStockLevel` | DECIMAL(10,2) | >= 0 | Safety stock floor |
| `MaximumStockLevel` | DECIMAL(10,2) | >= 0 | Storage ceiling |
| `LastUpdated` | TIMESTAMP | Auto | Updated on each transaction |

### Derived Field
```
QuantityAvailableToPromise = QuantityAvailable − QuantityReserved
```
Expose this as a computed column or API-layer calculation. Never let `QuantityReserved` exceed `QuantityAvailable`.

### BFF Reorder Thresholds

> **Note on eggs:** BFF is the producer, so "reorder" does not apply. `ReorderPoint` for eggs is used as a **low-availability alert threshold** — the point at which new orders should be paused or waitlisted until the next collection cycle. See Production Capacity below.

| Product | ReorderPoint | MinStock | MaxStock | Basis |
|---|---|---|---|---|
| Eggs (dozen) | 5 | 3 | 15.5 | See production capacity below |
| Ground Beef (lb) | 20 | 10 | 200 | Freeze for shelf life |
| Chuck Roast (lb) | 10 | 5 | 100 | — |
| Short Ribs (lb) | 8 | 4 | 80 | — |
| Ribeye (lb) | 5 | 2 | 50 | Premium, lower volume |
| T-Bone (lb) | 5 | 2 | 50 | Premium, lower volume |
| Oxtail (lb) | 5 | 2 | 40 | Specialty item |
| Seasonings (jar) | 15 | 10 | 150 | Per blend |

### Egg Production Capacity

| Metric | Value | Notes |
|---|---|---|
| Daily production | 30 eggs | 2.5 dozen/day |
| Weekly gross production | 210 eggs | 17.5 dozen/week |
| Auto-deducted (personal use + defects) | 30 eggs | 2.5 dozen/week — logged automatically |
| **Weekly net sellable** | **186 eggs** | **15.5 dozen/week enters sellable stock** |
| Daily sellable rate | ~2.2 dozen/day | 15.5 ÷ 7 |
| Weekly fulfillment ceiling | 15.5 dozen | Max new orders to accept per week |

---

### Egg Shelf Life Rules

Shelf life depends entirely on whether eggs have been washed. BFF should track wash status per batch.

| Condition | Storage | Shelf Life |
|---|---|---|
| **Unwashed** (bloom intact) | Room temperature | 3 weeks |
| **Unwashed** (bloom intact) | Refrigerated | 3 months |
| **Washed** (bloom removed) | Room temperature | Not safe — must refrigerate |
| **Washed** (bloom removed) | Refrigerated | 2 months |

**The bloom (cuticle):** The protective coating naturally deposited on the shell during laying. It seals the pores, blocking bacteria and moisture loss. Once washed off, that barrier is gone permanently and refrigeration becomes mandatory.

**Operational implication:** BFF should decide and document a standard wash policy per batch. Unwashed eggs stored at room temperature offer the longest practical shelf life for farm-stand sales. Refrigerated storage extends shelf life further but requires cold chain management through to the customer.

#### Shelf Life by Storage Location (BFF)

| LocationID | Location Name | Egg Condition | Max Shelf Life |
|---|---|---|---|
| `loc-001` | Main Cold Storage (Refrigerated) | Either | 2–3 months |
| `loc-002` | Freezer | N/A | Not applicable for eggs |
| `loc-003` | Dry Storage (Ambient) | Unwashed only | 3 weeks |
| `loc-004` | Farm Stand Pickup Counter | Unwashed only | 3 weeks from collection |
| `loc-005` | Atlanta Pickup Point | Unwashed only | 3 weeks from collection |
| `loc-006` | Church Drop-off, Savannah | Unwashed only | 3 weeks from collection |

---

### Automatic Weekly Transactions (Eggs)

The 2.5 dozen personal use / defect deduction is treated as a **scheduled automatic transaction** — it runs every week without manual input. When the API is connected, implement as a Supabase scheduled function (pg_cron) or equivalent cron job.

**Automatic transaction fired each Monday at 06:00:**
```
TransactionType:  Adjustment_Down
ProductID:        prod-001  (Pasture-Raised Eggs)
LocationID:       loc-001   (Main Cold Storage)
QuantityChange:   -2.5
UserID:           system
Notes:            "Auto: weekly personal use and defect allocation (2.5 doz)"
Timestamp:        auto (UTC)
```

**Automatic transaction fired each Monday at 06:01 (weekly restock):**
```
TransactionType:  Restock
ProductID:        prod-001
LocationID:       loc-001
QuantityChange:   +15.5
UserID:           system
Notes:            "Auto: weekly net sellable production (17.5 gross minus 2.5 withheld)"
Timestamp:        auto (UTC)
```

Both run on the same schedule. The deduction runs first (06:00) to close out the prior week before the new batch is added (06:01).

---

### Egg Expiry Tracking (Batch FIFO)

To enforce shelf life, each weekly Restock batch must carry a collection date. Stock is always sold **FIFO — First In, First Out** (oldest batch first).

Add `BatchID` and `CollectionDate` to the Transaction Ledger rows for egg Restock entries:

| Field | Type | Notes |
|---|---|---|
| `BatchID` | UUID | Groups all eggs from the same weekly collection |
| `CollectionDate` | DATE | Date hens laid / batch was collected |
| `WashStatus` | ENUM `Washed` / `Unwashed` | Determines applicable shelf life |
| `ExpiryDate` | DATE | Calculated: CollectionDate + shelf life per wash status and location |

**Expiry date calculation at Restock time:**
```
If WashStatus = Unwashed AND LocationType = Ambient:
    ExpiryDate = CollectionDate + 21 days

If WashStatus = Unwashed AND LocationType = Refrigerated:
    ExpiryDate = CollectionDate + 90 days

If WashStatus = Washed AND LocationType = Refrigerated:
    ExpiryDate = CollectionDate + 60 days
```

**Automatic expiry sweep — fires nightly at 02:00:**
```
Query: SELECT all egg batch rows WHERE ExpiryDate <= TODAY() AND QuantityRemaining > 0
Action: INSERT Adjustment_Down transaction for each expired batch
Notes: "Auto: batch [BatchID] expired — CollectionDate [date], ExpiryDate [date]"
```

This ensures `QuantityAvailable` never includes expired stock, even if no one manually disposed of it.

---

### Updated Threshold Rationale (Eggs)

- `MaximumStockLevel = 46.5 dozen` — 3 weeks of net production (3 × 15.5), the full unwashed room-temperature window. In practice, healthy demand should keep stock well below this ceiling. Alert if stock approaches 31 dozen (2 weeks) without movement.
- `ReorderPoint = 5 dozen` — low-availability alert; pause new order intake and notify
- `MinimumStockLevel = 3 dozen` — hard floor; fulfill existing confirmed orders only, no new sales

---

### Weekly Inventory Cycle (Eggs — Full Picture)

```
THE DATABASE ACCUMULATES WEEK TO WEEK.
QuantityAvailable = running sum of all transactions since launch.

Monday 06:00 — Auto: Adjustment_Down -2.5 (personal use / defects from prior week)
Monday 06:01 — Auto: Restock +15.5 (new week's net sellable production)

Throughout the week:
  Customer orders    → Sale transactions reduce QuantityAvailable
  Pickups confirmed  → Sale confirmed, Reserved quantity released
  Any disposal       → Manual Adjustment_Down (e.g. cracked egg found)

Nightly 02:00 — Auto: Expiry sweep — any batch past ExpiryDate → Adjustment_Down

End of week carry-forward example:
  Week 1: +15.5 in, 12.0 sold, 0 expired → 3.5 carry-forward
  Week 2: -2.5 auto deduction, +15.5 restock → 3.5 + 15.5 - 2.5 = 16.5 available
  Week 3: -2.5 auto deduction, +15.5 restock → 16.5 + 15.5 - 2.5 = 29.5 available
  ⚠ Week 3 carry of 29.5 triggers a review — demand may need attention
```

| Seasonings (jar) | 15 | 10 | 150 | Per blend |

---

## 6. Transaction Ledger (Movements)

**Insert-only.** Every physical movement — receiving stock, fulfilling an order, adjusting for waste, processing a return — creates a new row. The ledger is the single source of truth. Quantities in Section 5 are always derived from this table.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `TransactionID` | UUID | Primary Key | Auto-generated |
| `StockID` | UUID | Foreign Key → Stock | Which product + location |
| `TransactionType` | ENUM | Not Null | See types below |
| `QuantityChange` | DECIMAL(10,2) | Not Null | Positive = in, Negative = out |
| `ReferenceID` | UUID | Nullable | Links to PurchaseOrder or SalesOrder |
| `UserID` | UUID | Foreign Key → Users | Who performed the action |
| `Notes` | TEXT | Nullable | Reason for adjustment, waste detail, etc. |
| `Timestamp` | TIMESTAMP | Auto, Not Null | UTC, set by server — never client |

### Transaction Types

| Type | Direction | Triggered By |
|---|---|---|
| `Restock` | + Positive | Purchase order received |
| `Sale` | − Negative | Sales order fulfilled / picked up |
| `Return` | + Positive | Customer return accepted |
| `Adjustment_Up` | + Positive | Manual count correction (overage found) |
| `Adjustment_Down` | − Negative | Manual count correction (shrinkage, waste) |
| `Reserve` | − Negative (reserved) | Order placed, not yet fulfilled |
| `Unreserve` | + Positive (reserved) | Order cancelled before fulfillment |
| `Transfer_Out` | − Negative | Moved to another location |
| `Transfer_In` | + Positive | Received from another location |
| `Damaged` | − Negative | Unsellable product moved to Damaged location |

### Example Transaction Sequence — Egg Order

```
1. Customer places order for 3 dozen eggs
   → Type: Reserve  | QuantityChange: -3  | ReferenceID: so-0042

2. Customer picks up at farm stand
   → Type: Sale     | QuantityChange: -3  | ReferenceID: so-0042
   → Type: Unreserve| QuantityChange: +3  | ReferenceID: so-0042
   (Reserve is released; Sale records the actual depletion)

3. Farmer collects 18 dozen from hens
   → Type: Restock  | QuantityChange: +18 | ReferenceID: po-0011
```

---

## 7. Orders

### 7a. Purchase Orders (Inbound — Supplier to Farm)

| Field | Type | Notes |
|---|---|---|
| `PurchaseOrderID` | UUID | Primary Key |
| `SupplierID` | UUID | Foreign Key → Suppliers |
| `OrderDate` | DATE | — |
| `ExpectedDelivery` | DATE | — |
| `ActualDelivery` | DATE | Nullable |
| `OrderStatus` | ENUM | `Draft`, `Pending`, `Shipped`, `Delivered`, `Cancelled` |
| `TotalCost` | DECIMAL(10,2) | Calculated from line items |
| `Notes` | TEXT | — |

### Purchase Order Line Items

| Field | Type | Notes |
|---|---|---|
| `POLineID` | UUID | Primary Key |
| `PurchaseOrderID` | UUID | Foreign Key |
| `ProductID` | UUID | Foreign Key |
| `QuantityOrdered` | DECIMAL(10,2) | — |
| `QuantityReceived` | DECIMAL(10,2) | Updated on delivery |
| `UnitCost` | DECIMAL(10,2) | Agreed price at time of order |

### 7b. Sales Orders (Outbound — Farm to Customer)

| Field | Type | Notes |
|---|---|---|
| `SalesOrderID` | UUID | Primary Key |
| `CustomerName` | VARCHAR(100) | — |
| `CustomerEmail` | VARCHAR(150) | — |
| `CustomerPhone` | VARCHAR(30) | — |
| `OrderDate` | TIMESTAMP | — |
| `PickupDate` | DATE | Nullable — scheduled pickup |
| `PickupLocation` | UUID | Foreign Key → Locations |
| `OrderStatus` | ENUM | `Pending`, `Confirmed`, `Ready`, `Fulfilled`, `Cancelled` |
| `OrderSource` | ENUM | `Website`, `Phone`, `InPerson` |
| `Notes` | TEXT | Customer instructions |
| `TotalAmount` | DECIMAL(10,2) | Calculated from line items |

### Sales Order Line Items

| Field | Type | Notes |
|---|---|---|
| `SOLineID` | UUID | Primary Key |
| `SalesOrderID` | UUID | Foreign Key |
| `ProductID` | UUID | Foreign Key |
| `QuantityOrdered` | DECIMAL(10,2) | — |
| `QuantityFulfilled` | DECIMAL(10,2) | Updated on pickup/dispatch |
| `UnitPrice` | DECIMAL(10,2) | Price at time of order (preserves history) |
| `LineTotal` | DECIMAL(10,2) | `QuantityOrdered × UnitPrice` |

---

## 8. API Endpoint Reference (Ready for Implementation)

When the backend API is connected, the following endpoints should map to this schema.

### Products
| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/products` | List all active products |
| GET | `/api/products/:id` | Get single product + current stock |
| PATCH | `/api/products/:id` | Update price, description, status |

### Inventory
| Method | Endpoint | Action |
|---|---|---|
| GET | `/api/inventory` | All stock levels across all locations |
| GET | `/api/inventory/:productId` | Stock for one product across all locations |
| GET | `/api/inventory/low-stock` | All products at or below ReorderPoint |

### Transactions
| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/transactions` | Write a new ledger entry (all movement types) |
| GET | `/api/transactions/:stockId` | Full movement history for a product+location |
| GET | `/api/transactions?type=Sale&since=DATE` | Filtered ledger query |

### Orders
| Method | Endpoint | Action |
|---|---|---|
| POST | `/api/orders/sales` | Create new sales order (from website contact form) |
| PATCH | `/api/orders/sales/:id/status` | Update order status |
| GET | `/api/orders/sales?status=Pending` | Pickup queue |
| POST | `/api/orders/purchase` | Create restock purchase order |
| PATCH | `/api/orders/purchase/:id/receive` | Record delivery, trigger Restock transaction |

---

## 9. Business Rules Summary

| Rule | Enforcement |
|---|---|
| `QuantityAvailable >= 0` | DB constraint + API pre-check before Sale transaction |
| `QuantityReserved <= QuantityAvailable` | API layer validation on Reserve |
| Transactions are insert-only | No UPDATE or DELETE on `Transactions` table — DB role permissions |
| Price at time of order is preserved | `SOLineItem.UnitPrice` copied from `Product.SellingPrice` at order creation |
| Soft-delete products only | `IsActive = FALSE` — never hard-delete a product that has transaction history |
| All timestamps in UTC | Server-set only, never accepted from client payload |
| Low-stock alerts | Triggered when `QuantityAvailable <= ReorderPoint` after any Sale or Adjustment_Down transaction |

---

## 10. Future Integrations

| Integration | Notes |
|---|---|
| Supabase (current) | Schema maps directly to Postgres tables. Transactions table uses Row Level Security. |
| Website contact form | `POST /api/orders/sales` called on beef modal "Contact Us to Order" submission |
| Admin dashboard (`admin.html`) | Reads `/api/inventory` and `/api/orders/sales?status=Pending` for pickup queue |
| Low-stock notifications | Webhook or email trigger when any product crosses `ReorderPoint` |
| QuickBooks | `SalesOrder` and `PurchaseOrder` tables designed to export to QB invoice/bill format |

---

*Last updated: 2026-06-02 · Banks Fresh Farms LLC*
