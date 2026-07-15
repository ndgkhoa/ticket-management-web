# Audit toàn bộ `src/` — đối chiếu plan 9 phase

Ngày: 2026-07-16 · Sau khi Phase 01 hoàn tất · Branch `develop`

Mục đích: soi mọi thứ trong `src/` xem chỗ nào chưa ổn, và với mỗi chỗ, plan đã có ý định
sửa chưa. Cột **Plan** là điểm mấu chốt: thứ plan đã cover thì để đúng phase làm (sửa sớm =
làm 2 lần); thứ plan **bỏ sót** mới là rủi ro thật vì không ai dọn.

Đã fix trong đợt này (user duyệt) nên không liệt kê lại: store key collision, token
interceptor, dead RBAC chain, `@ant-design/icons` phantom, `immer`/`faker`, rename
`lang-generate.ts` → `generate-locales.ts`.

---

## A. Plan BỎ SÓT — không phase nào dọn

| #   | Vấn đề                                                                                                                                                                                                                                                                                                                       | Vị trí                                                                       | Ghi vào  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| A1  | **`forwardRef` — React 19 đã deprecate**, `ref` giờ là prop thường. Còn 6 file. React 19 vẫn chạy `forwardRef` nhưng đây đúng là loại code làm reviewer CV đánh giá "viết theo React 18".                                                                                                                                    | `components/ui/{button,tooltip}.tsx`, 4 file `*-{roles,permissions}-tab.tsx` | phase-05 |
| A2  | **`lodash` không phase nào xoá.** Chỉ còn 2 usage: `omitBy/isNil` (chết ở phase 04), `debounce` (phase 05 đã có `use-debounced-value.ts`). Sau phase 05 thì `lodash` + `@types/lodash` nằm lại vô ích.                                                                                                                       | `utils/clean-search-params.ts`, `hooks/use-query-params.ts`                  | phase-05 |
| A3  | **`@ant-design/icons` phải xoá cùng antd.** Giờ đã khai báo tường minh (trước là phantom qua antd hoist). Phase 05 xoá antd mà quên nó → dep mồ côi.                                                                                                                                                                         | 20 file                                                                      | phase-05 |
| A4  | **`react-error-boundary` không được nhắc ở bất kỳ phase nào.** Lib vẫn sống tốt (v6.1.2, 05/2026, peer React 19) → **giữ**. Nhưng phase 04 thêm route-level `errorComponent` (TanStack Router) → cần chốt ranh giới: route error → router, component error → react-error-boundary. Không chốt thì thành 2 cơ chế chồng nhau. | `app/provider.tsx`                                                           | phase-04 |
| A5  | **`features/dashboard.tsx` là file lẻ** trong khi `auth/` và `admin/` là folder. Bất đối xứng cấu trúc ngay tại thư mục `features/`.                                                                                                                                                                                         | `features/dashboard.tsx`                                                     | phase-06 |
| A6  | **`ProtectedRoute` có prop `allowed?: string` khai báo nhưng không hề dùng** — tàn dư RBAC. File chết ở phase 04 nên chỉ cần không bê prop này sang guard mới.                                                                                                                                                               | `features/auth/components/protected-route.tsx:8`                             | phase-04 |

## B. Plan ĐÃ cover — để đúng phase làm

| Vấn đề                                                                                                       | Vị trí                                          | Phase                                      |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------ |
| `use-query-params` + `query-string` + `ReactRouter6Adapter` (adapter RR6 nhưng repo chạy RR7)                | `app/provider.tsx`, `hooks/use-query-params.ts` | 04 — xoá, thay bằng typed search params    |
| `clean-search-params.ts` (`any` + lodash)                                                                    | `utils/`                                        | 04 — thay bằng `stripSearchParams`         |
| `AppRoutes.tsx` + `ProtectedRoute`                                                                           | root                                            | 04 — xoá, thay bằng `beforeLoad` guard     |
| `notification.ts` — class dùng như hàm, `any`, hardcode tiếng Việt                                           | `utils/notification.ts`                         | 05 — bỏ, thay sonner                       |
| `styles/theme.ts` (antd token)                                                                               | `styles/`                                       | 05 — xoá, thay `lib/theme.ts`              |
| `types/index.ts` — shape backend (`Data`/`TotalRecord`/`Message`, PascalCase)                                | `types/`                                        | 03 — thay bằng `z.infer`                   |
| Filename PascalCase: `types/{User,Role,Permission,AuthProviders}.ts`                                         | features                                        | 03 — "don't rename, delete"                |
| `setMutationDefaults()` ở module scope (side effect khi import) — **11 file**, không phải 1 như phase-01 ghi | mọi `hooks/mutations/*`                         | 03 — viết lại, "đừng bê pattern này sang"  |
| `hooks/queries/` + `hooks/mutations/` lồng sâu                                                               | features                                        | 03 — gộp vào `api/`                        |
| Field PascalCase backend (`Id`, `AccessToken`)                                                               | `stores/auth.ts`, types                         | 03 — map ở API boundary                    |
| Trùng lặp: 3 `*-list` (~125 dòng/file), 3 `*-form`, 5 `delete-*-confirmation` (~53 dòng/file) gần y hệt      | features                                        | 05 — `data-table.tsx` + `form/` dùng chung |
| `window.location.href` redirect khi 401/403                                                                  | `lib/axios.ts`                                  | 03 — Supabase session + router navigation  |

## C. Hardcoded string tiếng Việt còn sót (rule i18n: cấm)

Phase 01 dọn 4 chỗ (empty state ×3, sign-up title). Còn **8 chỗ**, tất cả nằm trong file mà
phase 03/05 sẽ viết lại — nên plan cover _gián tiếp_, nhưng chưa phase nào liệt kê ra:

```
lib/axios.ts:39,45                       'Phiên đăng nhập đã hết hạn...', 'Bạn không có quyền...'   -> phase 03
utils/notification.ts:9,10               'Có lỗi xảy ra', 'Thành công'                              -> phase 05
components/buttons/confirmation-button.tsx:26-29  'Cảnh báo', 'Bạn có chắc...', 'Xác nhận', 'Hủy bỏ' -> phase 05
features/admin/permissions/components/permission-form.tsx:79  'Tối đa 25 ký tự'                     -> phase 05
features/admin/users/components/update-user-roles-modal.tsx:24 'Cập nhật người dùng'                -> phase 05
features/auth/api/auth-api.ts:16         'Đăng nhập bằng Google thành công!'                        -> phase 03
```

Rủi ro: chúng nằm rải rác, không có rule nào chặn được ⇒ dễ sót. Phase 05 nên có bước
"grep tiếng Việt trong `src/`, phải ra 0 kết quả" làm điều kiện done.

## D. Không phải vấn đề (đã kiểm chứng, đừng đụng)

- **`react-error-boundary` không chết** — v6.1.2 (05/2026), peer `react ^18 || ^19`. Giữ.
- **`query-string` vẫn được maintain** (v9.4.1, 06/2026) — xoá vì hết chỗ dùng, không phải vì cũ.
- **`react-router-dom` vẫn maintain** (v7.18) — thay vì plan chọn TanStack Router (type-safe
  search params), không phải vì RRD hỏng.
- **`use-query-params`**: publish cuối 2025-11 (~8 tháng). Chưa deprecate, nhưng đúng là thế hệ
  trước — 2026 người ta dùng TanStack Router (như plan) hoặc **nuqs**. Plan chọn đúng hướng.
- File > 200 LOC: chỉ 1 (`create-role-permissions-tab.tsx`, 167 dòng) — vẫn dưới ngưỡng.

## E. Câu hỏi chưa chốt

1. **A4 — ranh giới error boundary**: sau phase 04, route error dùng `errorComponent` của
   TanStack Router, còn `react-error-boundary` giữ cho lỗi cấp component? Hay bỏ hẳn
   react-error-boundary? Cần chốt trước khi phase 04 làm, không thì thành 2 cơ chế chồng nhau.
2. **A1 — `forwardRef`**: dọn ở phase 05 cùng lúc viết lại UI (khuyến nghị), hay dọn sớm để
   repo "React 19 thuần" ngay từ bây giờ?
3. **Lockfile** (`bun.lock` chưa commit) — vẫn treo từ phase 01, chặn CI reproducible ở phase 02.
