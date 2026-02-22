
## Fix: "Erro no login - missing email or phone" on Password Reset

### Problem
The "Recuperar senha" (Reset Password) dialog is rendered inside the login `<form>` tag. When the user submits the reset password form, the submit event bubbles up and also triggers the parent login form, which attempts `signInWithPassword` with empty email/password fields.

### Solution
Move the reset password `<Dialog>` component outside the login `<form>` tag. This prevents form event bubbling issues entirely.

### Technical Details

**File**: `src/pages/Auth.tsx`

Currently the structure is:
```
<form onSubmit={handleLogin}>
  ...email input...
  ...password input...
  <Dialog>  <!-- Reset password dialog is INSIDE login form -->
    <form onSubmit={handleResetPassword}>
      ...
    </form>
  </Dialog>
  <Button type="submit">Entrar</Button>
</form>
```

The fix restructures to:
```
<form onSubmit={handleLogin}>
  ...email input...
  ...password input...
  <Button variant="link" onClick={() => setShowResetPasswordDialog(true)}>
    Esqueci minha senha
  </Button>
  <Button type="submit">Entrar</Button>
</form>

<Dialog>  <!-- Reset password dialog is OUTSIDE login form -->
  <form onSubmit={handleResetPassword}>
    ...
  </form>
</Dialog>
```

This moves the `Dialog` (with its `DialogTrigger` replaced by a simple `onClick`) out of the login form, eliminating the nested form issue completely.
