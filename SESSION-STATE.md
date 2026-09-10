# Session State - ExclusivePro

## Context
- **Project**: ExclusivePro - Mobile-first browser app for taxi drivers
- **Stack**: Next.js 16, Tailwind CSS v4, React 19, Supabase
- **Deploy**: Vercel at https://exclusivepro-delta.vercel.app
- **Supabase**: https://hznoclubvewyayiyxnzn.supabase.co

## Current Users
| Name | Email | Role | Auth ID | Notes |
|------|-------|------|---------|-------|
| Admin | rafaelregis97@gmail.com | admin | - | Owner |
| Guilherme | guilhermearaaujo456@gmail.com | driver | 9012b3cf-8899-4771-8785-5e9543becb14 | Rents Corolla GLi (FWV0B33) |
| Iago | iagoferreira733@gmail.com | user | c349471c-d60f-4e4b-a656-6a9f4ea82287 | Own car Corolla XEI (SYD0A99) |
| Igor | igormarcelo7@yahoo.com.br | user | 1a1575f7-4f40-46b9-a3a9-b709f7818ab5 | No car needed |
| Guilherme | guilhermeharaujo456@gmail.com | driver | - | Original account |

## Cars
| Model | Plate | Type | Driver | Owner |
|-------|-------|------|--------|-------|
| Corolla GLi | FWV0B33 | taxi | Guilherme | Admin |
| Corolla XEI | SYD0A99 | taxi | Iago | Iago |

## Role Types
- **admin**: Full access (Corridas, Gastos, Histórico, Config, Aluguel)
- **driver**: Rental driver (Corridas, Gastos, Histórico, Config, Aluguel)
- **user**: Own car / guest (Corridas, Gastos, Histórico, Config - NO Aluguel tab)

## Key Features Implemented
### Rides
- Categories: App, Taxímetro, Cooperativa, Particular, Faturado
- car_type: Executivo (purple badge) / Táxi (yellow badge)
- company_name for Faturado category
- Driver name field for passed rides
- Admin adds rides for drivers via Aluguel tab
- `added_by_admin` flag excludes from driver's own totals
- `received_with_client` shows full value to driver in history

### History
- Month/year/day filters
- Type filter (Todas/Próprias/Passadas)
- Car type filter (Executivo/Táxi)
- Expense filter (Todos/Gasolina/Gastos) - correctly filters expenses with category "fuel"
- Company name filter for Faturado rides
- Driver name badge: Guilherme = green, others = blue
- Edit/delete on all rides with driver name field
- Weekly earnings (Sunday-Saturday) with date range display
- Monthly goal uses full month data (not affected by day filter)

### Aluguel
- Admin sees all cars, can add/edit/delete rides
- Driver sees only their own car
- No "Motorista" field in the add form
- Only admin can manage rides (buttons hidden for drivers)

### Config
- Profile edit
- Admin goal settings (daily/weekly)
- Convites link inside Config (not in BottomNav)

### Expenses
- Categories: fuel, wash, food, maintenance, other
- Category grid selector in form
- History shows fuel category items with ⛽ icon

## SQL Notes
- RLS policies use `auth.role() = 'authenticated'` for broad access
- `is_admin()` function is SECURITY DEFINER
- users table INSERT policy needed for new user creation
- driver_cars: admin can manage all, users can manage own
- expenses table has RLS policies (was missing initially)

## Pending / Known Issues
- FTP deployment to HostGator not working (addon domain issue) - using Vercel instead
- Igor's account created but needs to test adding rides
- Consider: should admin see all rides from all drivers in history?

## Files Modified Today
- `src/app/taxi/historico/page.tsx` - History page with filters, driver names, weekly earnings
- `src/app/taxi/aluguel/page.tsx` - Aluguel page with admin restrictions
- `src/app/taxi/components/BottomNav.tsx` - Nav tabs based on role
- `src/app/taxi/components/RideList.tsx` - Category labels in Portuguese
- `src/app/taxi/lib/auth-context.tsx` - Auth provider
