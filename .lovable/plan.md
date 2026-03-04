

# Plan: Beta Warning Dialog for Mercado Livre Integration

## Changes

### 1. Create `src/components/integrations/BetaWarningDialog.tsx`
New dialog component matching the user's spec: header with Flask icon + "Beta" badge, warning alert, list of possible issues (Bug, RefreshCw, AlertTriangle icons), green reassurance box, checkbox for acceptance, and Cancel/Continue buttons. Continue button disabled until checkbox is checked. On confirm, calls `onConfirm` callback and resets state.

### 2. Update `src/pages/reseller/LojafyIntegra.tsx`
- Add state `showBetaWarning` (boolean)
- Change the Mercado Livre "Integrar" button from a direct `<a>` link to a `<Button onClick>` that opens the dialog
- On dialog confirm, redirect to the OAuth URL via `window.open(getMercadoLivreAuthUrl(), '_blank')`
- Render `<BetaWarningDialog>` at the bottom of the component

