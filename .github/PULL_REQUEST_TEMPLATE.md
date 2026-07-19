# 📝 Summary

<!-- What changes, and why. Link the plan phase or issue this belongs to. -->

## 🏷️ Type

- [ ] ✨ feat
- [ ] 🐛 fix
- [ ] ♻️ refactor / ⚡ perf
- [ ] 📚 docs / 🧪 test / 📦 build / 🤖 ci / 🧹 chore

## 🔍 How this was verified

<!-- Say what you actually ran or clicked, not what should work.
     "typecheck + lint pass" is not verification of behaviour. -->

- [ ] `bun run lint` passes
- [ ] `bun run build` passes (build **and** preview — a Rolldown break can be prod-only)
- [ ] Behaviour exercised in the running app

## ✅ Checks

- [ ] No hardcoded user-facing strings — new copy goes through i18n (`bun run lang:check` passes)
- [ ] Server state via TanStack Query, client state via Zustand — no overlap
- [ ] Lists follow the List UX contract: URL-as-truth, debounced search, page resets on filter change, no layout jump
- [ ] Architectural boundaries respected: `config/` values, `lib/` clients, `utils/` pure helpers
- [ ] No secrets, `.env` files, or credentials committed

## 💬 Notes for the reviewer

<!-- Trade-offs, deliberate omissions, follow-ups. -->
