# Lojafy.app

Own e-commerce platform for dropshipping with automated product registration, reseller stores, and integrated order management with suppliers.

---

## What is it?

Lojafy is a modular e-commerce platform built to replace WooCommerce in a dropshipping operation that had become unscalable. The system centralizes catalog, orders, payments, supplier operations, and reseller stores in one place, with automated product registration via scraping.

---

## Problem it solves

Dropshipping operation with ~900 products running on WooCommerce: product registration consumed an entire day, order forwarding to suppliers was 100% manual (WhatsApp/email, one by one), and the promised core functionality for resellers (stores with one-click import) was technically impossible on the platform.

Scaling would require hiring proportional headcount. Lojafy eliminated this dependency.

---

## Modules

**Superadmin Panel**
- Management of payments, orders, and products
- Processing of supplier data and registration in the system
- Automated product registration pipeline

**Supplier Panel**
- Viewing of paid orders
- Label printing
- Status update (picking and shipping)

**Reseller Panel**
- Creation of a customized store
- Definition of profit margin
- Import of products from the main catalog with one click
- Imported products already automatically categorized

**Checkout and Payment**
- Integration with Mercado Pago (PIX)
- Automatically generated QR Code
- Confirmation via webhook
- Mandatory upload of PDF label at checkout

**Product Registration Pipeline**
1. Supplier sends spreadsheet (name + cost price)
2. Superadmin performs quick cleanup and uploads to Google Sheets
3. n8n processes product by product
4. Search via RapidAPI (Real-Time Amazon Data)
5. JavaScript calculates match Likelihood (0.0 to 1.0)
6. Scrapes complete data: title, description, photos, category
7. Verifies/creates category via internal API
8. Registers priced product
9. Optional approval queue

**Internal Split**
- Registration of value division between reseller and operation
- Centralization in a single account, on-demand withdrawal

**Lojafy Academy**
- Members area with training
- AI-powered support chat based on knowledge base

---

## Stack

| Layer | Technology |

|---|---|

| Frontend | Lovable |

| Backend / API | Supabase Edge Functions |

| Database | Supabase (PostgreSQL) |

| Orchestration | n8n |

| Payment | Mercado Pago API |

| Scraping | RapidAPI (Real-Time Amazon Data) |

---

## Results

- Product registration: from **1 full day** to **30 minutes**
- Automatic match accuracy rate: **90%**
- Order management: **zero recurring human intervention**
- Payments: **fully automated via webhook**
- Reseller stores: **operate autonomously**

---

## Scope Limitations

- Does not integrate with marketplaces
- Does not automatically calculate shipping costs via carriers
- Does not perform external anti-fraud measures (delegated to Mercado Pago)
- Does not handle logistics or direct shipping (supplier's responsibility)
- Does not perform direct payment splitting to accounts (centralized in a centralized account)
- Credit card disabled (low MP approval rate)

---

## Residual Human Intervention

- Initial data cleanup of the supplier's spreadsheet (5-10 min)
- Review of products in the approval queue or with errors (5-10 min)
- Daily review of AI support conversations (15-30 min)

---

## Lojafy Integrates `BETA`

Evolution of the Lojafy platform focusing on complete integration between suppliers, resellers, and operations. Includes everything the current version offers, plus:

**What changes:**
- Four formalized operational roles: Superadmin, Supplier, Reseller, End Customer
- Supplier receives orders directly in the dashboard or via email through a configurable workflow
- Reseller with their own store, configurable margin, and one-click product import — products already categorized and priced automatically
- Internal split system with accumulated balance and on-demand withdrawal
- Product registration pipeline with likelihood matching via RapidAPI (accuracy rate: 90%), approval queue, and error log to spreadsheet
- Lojafy Academy with members area, training, and AI support (knowledge base + daily human review + learning through corrections)
- Order management with complete status cycle: awaiting payment → paid → picked → shipped

**Additional Stack:**
- Google Sheets as an entry interface for the product pipeline
- RapidAPI Real-Time Amazon Data for scraping product data
- AI support with correction storage for Continuous Improvement

**Status:** In beta. Features being validated with real-world operation. Platform core (checkout, orders, payments) stable and inherited from the main version.

**Additional limitations:**
- Does not integrate with marketplaces (planned)
- Does not support SPL
