import { readFileSync, writeFileSync } from "node:fs";
const [uid, shop = "main"] = process.argv.slice(2);
if (
  !uid ||
  !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) ||
  !/^[a-zA-Z0-9_-]{1,100}$/.test(shop)
)
  throw Error(
    "Usage: node scripts/configure-admin.mjs ADMIN_UID SHOP_ID — edits LOCAL rules only",
  );
const path = new URL("../firestore.rules", import.meta.url);
let rules = readFileSync(path, "utf8");
rules = rules
  .replace(
    /function allowedUid\(\) \{ return '[^']+'; \}/,
    `function allowedUid() { return '${uid}'; }`,
  )
  .replace(
    /function validShop\(id\) \{ return id == '[^']+'; \}/,
    `function validShop(id) { return id == '${shop}'; }`,
  );
writeFileSync(path, rules);
console.log(
  "LOCAL rules updated. Review and test before separately authorized deployment.",
);
